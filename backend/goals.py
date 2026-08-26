# backend/goals.py
# A Goal reserves money from one or more INCOMES. Reserved money is NOT deducted — it
# still belongs to the income it came from, it just stops being spendable.
#
# A goal NEVER completes on its own. Reaching the target only changes what the UI
# offers; the user must call /complete, which is the only thing that turns reserved
# money into a real expense, attributed to the incomes it was spent from.
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from aggregates import goal_reservations, goal_totals
from auth import get_current_user
from database import client, entries_collection, goals_collection
from guards import assert_remaining
from helpers import (
    bad_request,
    ensure_label,
    ensure_incomes,
    get_owned_goal,
    goal_out,
    not_found,
    oid,
    utcnow,
)
from models import CompleteGoalIn, GoalIn, GoalOut, GoalStatus, GoalUpdate, ReserveIn

router = APIRouter(prefix="/goals", tags=["goals"])


def _splits_map(splits: List[dict]) -> dict:
    return {s["incomeId"]: s["amount"] for s in splits}


async def _write_entry(
    user_id: str,
    kind: str,
    goal_id: str,
    description: str,
    splits: List[dict],
    date,
    session,
    category_id: Optional[str] = None,
    account_id: Optional[str] = None,
    completion_id: Optional[str] = None,
) -> None:
    now = utcnow()
    await entries_collection.insert_one(
        {
            "userId": user_id,
            "kind": kind,
            "date": date or now,
            "description": description,
            "total": sum(s["amount"] for s in splits),
            "splits": splits,
            "accountId": account_id,
            "categoryId": category_id,
            "goalId": goal_id,
            "note": None,
            "completionId": completion_id,
            "createdAt": now,
            "updatedAt": now,
        },
        session=session,
    )


# --- CRUD --------------------------------------------------------------------


@router.get("/", response_model=list[GoalOut])
async def list_goals(
    status_filter: Optional[GoalStatus] = Query(default=None, alias="status"),
    user=Depends(get_current_user),
):
    query: dict = {"userId": user["sub"]}
    if status_filter:
        query["status"] = status_filter

    docs = await goals_collection.find(query).sort("createdAt", -1).to_list(length=500)
    totals = await goal_totals(user["sub"], [str(d["_id"]) for d in docs])
    return [goal_out(doc, totals.get(str(doc["_id"]))) for doc in docs]


@router.post("/", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalIn, user=Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update(
        {
            "userId": user["sub"],
            "status": "active",
            "completedAt": None,
            "completionId": None,
            "createdAt": utcnow(),
        }
    )
    result = await goals_collection.insert_one(doc)
    created = await goals_collection.find_one({"_id": result.inserted_id})
    return goal_out(created, {})


@router.get("/{id}", response_model=GoalOut)
async def get_goal(id: str, user=Depends(get_current_user)):
    doc = await get_owned_goal(user["sub"], id)
    return goal_out(doc, await goal_reservations(user["sub"], id))


@router.put("/{id}", response_model=GoalOut)
async def update_goal(id: str, payload: GoalUpdate, user=Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise bad_request("No fields to update.")

    doc = await get_owned_goal(user["sub"], id)
    totals = await goal_reservations(user["sub"], id)

    # Lowering the target below what is already reserved would strand the difference.
    new_target = changes.get("targetValue")
    if new_target is not None and new_target < totals["saved"]:
        raise bad_request(
            f"You have already reserved {totals['saved']} for this goal. Release some "
            f"of it before lowering the target to {new_target}."
        )

    await goals_collection.update_one({"_id": doc["_id"]}, {"$set": changes})
    updated = await goals_collection.find_one({"_id": doc["_id"]})
    return goal_out(updated, await goal_reservations(user["sub"], id))


@router.delete("/{id}", response_model=dict)
async def delete_goal(id: str, user=Depends(get_current_user)):
    """
    Reservations are internal bookkeeping, so they vanish with the goal and the money
    becomes spendable again. A completed goal's expense is real spending, so it
    is kept and detached rather than destroyed.
    """
    async with await client.start_session() as session:
        async with session.start_transaction():
            doc = await get_owned_goal(user["sub"], id, session=session)

            await entries_collection.delete_many(
                {
                    "userId": user["sub"],
                    "goalId": id,
                    "kind": {"$in": ["reservation", "release"]},
                },
                session=session,
            )
            detached = await entries_collection.update_many(
                {"userId": user["sub"], "goalId": id, "kind": "expense"},
                {"$set": {"goalId": None, "completionId": None}},
                session=session,
            )
            await goals_collection.delete_one({"_id": doc["_id"]}, session=session)

            return {
                "message": "Goal deleted.",
                "expensesKept": detached.modified_count,
            }


# --- Reserving and releasing -------------------------------------------------


@router.post("/{id}/reserve", response_model=GoalOut)
async def reserve(id: str, payload: ReserveIn, user=Depends(get_current_user)):
    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await get_owned_goal(user["sub"], id, session=session)
            if goal.get("status") != "active":
                raise bad_request("Only an active goal can hold reservations.")

            await ensure_incomes(user["sub"], [payload.incomeId], session=session)

            totals = await goal_reservations(user["sub"], id, session=session)
            remaining = goal["targetValue"] - totals["saved"]
            if payload.amount > remaining:
                raise bad_request(
                    f"That would overshoot the target. This goal needs {remaining} more."
                )

            await assert_remaining(
                user["sub"],
                {payload.incomeId: payload.amount},
                session=session,
                action="This reservation",
            )

            await _write_entry(
                user["sub"],
                "reservation",
                id,
                "Reserved for " + goal["name"],
                [{"incomeId": payload.incomeId, "amount": payload.amount}],
                payload.date,
                session,
            )

            updated = await goal_reservations(user["sub"], id, session=session)
            return goal_out(goal, updated)


@router.post("/{id}/release", response_model=GoalOut)
async def release(id: str, payload: ReserveIn, user=Depends(get_current_user)):
    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await get_owned_goal(user["sub"], id, session=session)
            if goal.get("status") != "active":
                raise bad_request("Only an active goal holds reservations to release.")

            totals = await goal_reservations(user["sub"], id, session=session)
            held = _splits_map(totals["breakdown"]).get(payload.incomeId, 0)
            if payload.amount > held:
                raise bad_request(
                    f"Only {held} of that income is reserved for this goal."
                )

            await _write_entry(
                user["sub"],
                "release",
                id,
                "Released from " + goal["name"],
                [{"incomeId": payload.incomeId, "amount": payload.amount}],
                payload.date,
                session,
            )

            updated = await goal_reservations(user["sub"], id, session=session)
            return goal_out(goal, updated)


# --- Finishing a goal --------------------------------------------------------


@router.post("/{id}/complete", response_model=GoalOut)
async def complete(id: str, payload: CompleteGoalIn, user=Depends(get_current_user)):
    """
    Turns reserved money into a real expense, attributed to the incomes it came from.

    The reservations are released first, which restores each income's `remaining`; the
    expense is then checked against those topped-up balances. So paying more than you
    saved works as long as the extra genuinely exists somewhere.
    """
    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await get_owned_goal(user["sub"], id, session=session)
            # Checked inside the transaction, so a double-click cannot spend twice.
            if goal.get("status") != "active":
                raise bad_request(f"This goal is already {goal.get('status')}.")

            await ensure_label(user["sub"], payload.categoryId, "expense_category", session=session)
            await ensure_label(user["sub"], payload.accountId, "account", session=session)

            totals = await goal_reservations(user["sub"], id, session=session)
            reserved_splits = totals["breakdown"]

            if payload.splits is not None:
                spend_splits = [s.model_dump() for s in payload.splits]
                await ensure_incomes(
                    user["sub"], [s["incomeId"] for s in spend_splits], session=session
                )
            else:
                if totals["saved"] != payload.actualAmount:
                    raise bad_request(
                        f"You have {totals['saved']} reserved but are recording a spend of "
                        f"{payload.actualAmount}. Send an explicit source split to say where "
                        "the difference comes from."
                    )
                spend_splits = [dict(s) for s in reserved_splits]

            completion_id = str(uuid.uuid4())
            when = payload.date or utcnow()

            # 1. Hand every reservation back, so the money is spendable again.
            if reserved_splits:
                await _write_entry(
                    user["sub"],
                    "release",
                    id,
                    "Released on completing " + goal["name"],
                    [dict(s) for s in reserved_splits],
                    when,
                    session,
                    completion_id=completion_id,
                )

            # 2. Now the expense is checked against balances that include that money.
            await assert_remaining(
                user["sub"],
                _splits_map(spend_splits),
                session=session,
                action="Completing this goal",
            )

            await _write_entry(
                user["sub"],
                "expense",
                id,
                payload.description or goal["name"],
                spend_splits,
                when,
                session,
                category_id=payload.categoryId,
                account_id=payload.accountId,
                completion_id=completion_id,
            )

            await goals_collection.update_one(
                {"_id": goal["_id"]},
                {
                    "$set": {
                        "status": "completed",
                        "completedAt": when,
                        "completionId": completion_id,
                    }
                },
                session=session,
            )

            updated = await goals_collection.find_one({"_id": goal["_id"]}, session=session)
            return goal_out(updated, await goal_reservations(user["sub"], id, session=session))


@router.post("/{id}/reopen", response_model=GoalOut)
async def reopen(id: str, user=Depends(get_current_user)):
    """Undoes a completion: removes the generated expense and restores the reservations."""
    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await get_owned_goal(user["sub"], id, session=session)
            if goal.get("status") != "completed":
                raise bad_request("Only a completed goal can be reopened.")

            completion_id = goal.get("completionId")
            if not completion_id:
                raise bad_request(
                    "This goal has no completion record to undo. Edit the expense directly."
                )

            generated = await entries_collection.find(
                {"userId": user["sub"], "completionId": completion_id}, session=session
            ).to_list(length=50)

            # Un-spending returns money; re-reserving takes it away again. The net effect
            # has to fit inside what each source has available right now.
            consumption: dict = {}
            for entry in generated:
                sign = 1 if entry["kind"] == "release" else -1
                for split in entry["splits"]:
                    consumption[split["incomeId"]] = (
                        consumption.get(split["incomeId"], 0) + sign * split["amount"]
                    )
            await assert_remaining(
                user["sub"], consumption, session=session, action="Reopening this goal"
            )

            await entries_collection.delete_many(
                {"userId": user["sub"], "completionId": completion_id}, session=session
            )
            await goals_collection.update_one(
                {"_id": goal["_id"]},
                {"$set": {"status": "active", "completedAt": None, "completionId": None}},
                session=session,
            )

            updated = await goals_collection.find_one({"_id": goal["_id"]}, session=session)
            return goal_out(updated, await goal_reservations(user["sub"], id, session=session))


@router.post("/{id}/abandon", response_model=GoalOut)
async def abandon(id: str, user=Depends(get_current_user)):
    """Gives every reserved rupee back and closes the goal. No expense is written."""
    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await get_owned_goal(user["sub"], id, session=session)
            if goal.get("status") != "active":
                raise bad_request(f"This goal is already {goal.get('status')}.")

            totals = await goal_reservations(user["sub"], id, session=session)
            if totals["breakdown"]:
                await _write_entry(
                    user["sub"],
                    "release",
                    id,
                    "Released on abandoning " + goal["name"],
                    [dict(s) for s in totals["breakdown"]],
                    utcnow(),
                    session,
                )

            await goals_collection.update_one(
                {"_id": goal["_id"]}, {"$set": {"status": "abandoned"}}, session=session
            )
            updated = await goals_collection.find_one({"_id": goal["_id"]}, session=session)
            return goal_out(updated, await goal_reservations(user["sub"], id, session=session))
