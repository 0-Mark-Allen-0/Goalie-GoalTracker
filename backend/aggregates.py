# backend/aggregates.py
# Every balance is DERIVED from the `entries` ledger. Nothing is stored.
#
# The unit that holds money is an INCOME — one earning event with its own date. It is
# a lot, not a pool: money earned from Mr. John in August stays identifiable as that
# money for as long as any of it is left.
#
#   income.spent     = sum of expense splits pointing at this income
#   income.reserved  = sum of reservation splits - sum of release splits
#   income.remaining = amount - spent - reserved
#
# `remaining >= 0` on every income is the invariant the whole product rests on. It is
# checked before every expense and every reservation, inside the same transaction as
# the write.
from typing import Dict, Iterable, List, Optional

from database import entries_collection
from helpers import oid

DRAW_KINDS = ("expense", "reservation", "release")


def _empty() -> dict:
    return {"amount": 0, "spent": 0, "reserved": 0, "remaining": 0}


async def income_amounts(
    user_id: str, income_ids: Optional[Iterable[str]] = None, session=None
) -> Dict[str, int]:
    """Face value of each income lot, keyed by income id."""
    match: dict = {"userId": user_id, "kind": "income"}
    if income_ids is not None:
        ids = list(income_ids)
        if not ids:
            return {}
        match["_id"] = {"$in": [oid(i, "incomeId") for i in ids]}

    result: Dict[str, int] = {}
    async for doc in entries_collection.find(match, {"total": 1}, session=session):
        result[str(doc["_id"])] = doc.get("total", 0)
    return result


async def income_draws(
    user_id: str, income_ids: Optional[Iterable[str]] = None, session=None
) -> Dict[str, dict]:
    """Everything drawn against each income: spent, and reserved net of releases."""
    match: dict = {"userId": user_id, "kind": {"$in": list(DRAW_KINDS)}}
    if income_ids is not None:
        ids = list(income_ids)
        if not ids:
            return {}
        match["splits.incomeId"] = {"$in": ids}

    pipeline = [
        {"$match": match},
        {"$unwind": "$splits"},
        {
            "$group": {
                "_id": {"incomeId": "$splits.incomeId", "kind": "$kind"},
                "total": {"$sum": "$splits.amount"},
            }
        },
    ]

    result: Dict[str, dict] = {}
    async for row in entries_collection.aggregate(pipeline, session=session):
        income_id = row["_id"]["incomeId"]
        kind = row["_id"]["kind"]
        bucket = result.setdefault(income_id, {"spent": 0, "reserved": 0})

        if kind == "expense":
            bucket["spent"] += row["total"]
        elif kind == "reservation":
            bucket["reserved"] += row["total"]
        elif kind == "release":
            bucket["reserved"] -= row["total"]
    return result


async def income_totals(
    user_id: str, income_ids: Optional[Iterable[str]] = None, session=None
) -> Dict[str, dict]:
    """Per-income {amount, spent, reserved, remaining}, keyed by income id."""
    amounts = await income_amounts(user_id, income_ids, session=session)
    if not amounts:
        return {}

    draws = await income_draws(user_id, amounts.keys(), session=session)

    totals: Dict[str, dict] = {}
    for income_id, amount in amounts.items():
        drawn = draws.get(income_id, {})
        entry = _empty()
        entry["amount"] = amount
        entry["spent"] = drawn.get("spent", 0)
        entry["reserved"] = drawn.get("reserved", 0)
        entry["remaining"] = amount - entry["spent"] - entry["reserved"]
        totals[income_id] = entry
    return totals


async def income_remaining(user_id: str, income_id: str, session=None) -> int:
    totals = await income_totals(user_id, [income_id], session=session)
    return totals.get(income_id, _empty())["remaining"]


async def goal_totals(
    user_id: str,
    goal_ids: Optional[Iterable[str]] = None,
    session=None,
) -> Dict[str, dict]:
    """
    Per-goal reservation totals, keyed by goalId, as {saved, breakdown}.

    Filtered to reservation/release only: the expense written when a goal completes
    also carries `goalId`, and must not be counted as savings.
    """
    match: dict = {"userId": user_id, "kind": {"$in": ["reservation", "release"]}}
    if goal_ids is not None:
        ids = list(goal_ids)
        if not ids:
            return {}
        match["goalId"] = {"$in": ids}
    else:
        match["goalId"] = {"$ne": None}

    pipeline = [
        {"$match": match},
        {"$unwind": "$splits"},
        {
            "$group": {
                "_id": {
                    "goalId": "$goalId",
                    "incomeId": "$splits.incomeId",
                    "kind": "$kind",
                },
                "total": {"$sum": "$splits.amount"},
            }
        },
    ]

    per_income: Dict[str, Dict[str, int]] = {}
    async for row in entries_collection.aggregate(pipeline, session=session):
        goal_id = row["_id"]["goalId"]
        income_id = row["_id"]["incomeId"]
        signed = row["total"] if row["_id"]["kind"] == "reservation" else -row["total"]
        per_income.setdefault(goal_id, {})
        per_income[goal_id][income_id] = per_income[goal_id].get(income_id, 0) + signed

    result: Dict[str, dict] = {}
    for goal_id, incomes in per_income.items():
        # An income that nets to zero (fully released) drops out of the breakdown.
        breakdown: List[dict] = [
            {"incomeId": iid, "amount": amt} for iid, amt in incomes.items() if amt > 0
        ]
        breakdown.sort(key=lambda s: s["amount"], reverse=True)
        result[goal_id] = {
            "saved": sum(s["amount"] for s in breakdown),
            "breakdown": breakdown,
        }
    return result


async def goal_reservations(user_id: str, goal_id: str, session=None) -> dict:
    totals = await goal_totals(user_id, [goal_id], session=session)
    return totals.get(goal_id, {"saved": 0, "breakdown": []})
