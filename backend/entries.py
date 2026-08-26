# backend/entries.py
# The ledger. One collection holds every money event.
#
#   income      -> a LOT: one earning, one date, its own balance
#   expense     -> a DRAW against specific incomes
#   reservation -> a DRAW that claims an income for a goal   (written by goals.py)
#   release     -> gives that claim back                     (written by goals.py)
#
# An income has no `splits` — it IS the thing everything else draws from. Everything
# else carries `splits: [{incomeId, amount}]`, which is what makes "I bought a watch
# with the money Mr. John paid me in August" expressible.
#
# `categoryId` and `accountId` are adjectives: what it was for, and where the cash
# landed. Neither holds a balance.
import csv
import io
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Response, status

from aggregates import income_totals
from auth import get_current_user
from database import client, entries_collection, labels_collection
from guards import assert_remaining
from helpers import (
    bad_request,
    ensure_incomes,
    ensure_label,
    entry_out,
    income_out,
    not_found,
    oid,
    utcnow,
)
from models import (
    EntryOut,
    ExpenseIn,
    ExpenseUpdate,
    IncomeIn,
    IncomeOut,
    IncomeUpdate,
)

router = APIRouter(prefix="/entries", tags=["entries"])

EDITABLE_KINDS = ("income", "expense")


def _splits_map(splits: List[dict]) -> Dict[str, int]:
    return {s["incomeId"]: s["amount"] for s in splits}


def _consumption(old: Dict[str, int], new: Dict[str, int]) -> Dict[str, int]:
    """
    How much of each income's `remaining` this change eats. Positive means that income
    must have the headroom; zero or negative means money is being handed back.
    """
    return {
        income_id: new.get(income_id, 0) - old.get(income_id, 0)
        for income_id in set(old) | set(new)
    }


# --- Income (the lots) -------------------------------------------------------


@router.get("/income", response_model=list[IncomeOut])
async def list_incomes(
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    categoryId: Optional[str] = None,
    accountId: Optional[str] = None,
    search: Optional[str] = None,
    unspent_only: bool = False,
    limit: int = Query(default=300, ge=1, le=1000),
    user=Depends(get_current_user),
):
    """Income lots, newest first, each with how much of it is still unspent."""
    query: dict = {"userId": user["sub"], "kind": "income"}
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = date_from
        if date_to:
            window["$lte"] = date_to
        query["date"] = window
    if categoryId:
        query["categoryId"] = categoryId
    if accountId:
        query["accountId"] = accountId
    if search:
        query["description"] = {"$regex": re.escape(search.strip()), "$options": "i"}

    docs = (
        await entries_collection.find(query)
        .sort([("date", -1), ("createdAt", -1)])
        .limit(limit)
        .to_list(length=limit)
    )
    totals = await income_totals(user["sub"], [str(d["_id"]) for d in docs])

    results = [income_out(doc, totals.get(str(doc["_id"]))) for doc in docs]
    if unspent_only:
        results = [row for row in results if row["remaining"] > 0]
    return results


@router.post("/income", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
async def create_income(payload: IncomeIn, user=Depends(get_current_user)):
    await ensure_label(user["sub"], payload.categoryId, "income_category")
    await ensure_label(user["sub"], payload.accountId, "account")

    now = utcnow()
    doc = {
        "userId": user["sub"],
        "kind": "income",
        "date": payload.date,
        "description": payload.description.strip(),
        "total": payload.amount,
        "splits": [],
        "categoryId": payload.categoryId,
        "accountId": payload.accountId,
        "goalId": None,
        "note": payload.note,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await entries_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return income_out(doc, {"spent": 0, "reserved": 0, "remaining": payload.amount})


@router.put("/income/{id}", response_model=IncomeOut)
async def update_income(id: str, payload: IncomeUpdate, user=Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise bad_request("No fields to update.")

    async with await client.start_session() as session:
        async with session.start_transaction():
            existing = await entries_collection.find_one(
                {"_id": oid(id), "userId": user["sub"], "kind": "income"}, session=session
            )
            if not existing:
                raise not_found("Income")

            await ensure_label(
                user["sub"], payload.categoryId, "income_category", session=session
            )
            await ensure_label(user["sub"], payload.accountId, "account", session=session)

            update = {k: v for k, v in changes.items() if k != "amount"}
            if update.get("description"):
                update["description"] = update["description"].strip()

            if changes.get("amount") is not None:
                totals = await income_totals(user["sub"], [id], session=session)
                drawn = totals.get(id, {})
                committed = drawn.get("spent", 0) + drawn.get("reserved", 0)
                if payload.amount < committed:
                    raise bad_request(
                        f"You have already spent or reserved {committed} of this income, "
                        f"so it cannot be reduced to {payload.amount}."
                    )
                update["total"] = payload.amount

            update["updatedAt"] = utcnow()
            await entries_collection.update_one(
                {"_id": existing["_id"]}, {"$set": update}, session=session
            )

            doc = await entries_collection.find_one({"_id": existing["_id"]}, session=session)
            totals = await income_totals(user["sub"], [id], session=session)
            return income_out(doc, totals.get(id))


# --- Expenses (draws against income) -----------------------------------------


@router.post("/expense", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
async def create_expense(payload: ExpenseIn, user=Depends(get_current_user)):
    splits = [s.model_dump() for s in payload.splits]

    async with await client.start_session() as session:
        async with session.start_transaction():
            await ensure_incomes(
                user["sub"], [s["incomeId"] for s in splits], session=session
            )
            await ensure_label(
                user["sub"], payload.categoryId, "expense_category", session=session
            )
            await ensure_label(user["sub"], payload.accountId, "account", session=session)

            await assert_remaining(
                user["sub"], _splits_map(splits), session=session, action="This expense"
            )

            now = utcnow()
            doc = {
                "userId": user["sub"],
                "kind": "expense",
                "date": payload.date,
                "description": payload.description.strip(),
                "total": sum(s["amount"] for s in splits),
                "splits": splits,
                "categoryId": payload.categoryId,
                "accountId": payload.accountId,
                "goalId": None,
                "note": payload.note,
                "createdAt": now,
                "updatedAt": now,
            }
            result = await entries_collection.insert_one(doc, session=session)
            doc["_id"] = result.inserted_id
            return entry_out(doc)


@router.put("/expense/{id}", response_model=EntryOut)
async def update_expense(id: str, payload: ExpenseUpdate, user=Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise bad_request("No fields to update.")

    async with await client.start_session() as session:
        async with session.start_transaction():
            existing = await entries_collection.find_one(
                {"_id": oid(id), "userId": user["sub"], "kind": "expense"}, session=session
            )
            if not existing:
                raise not_found("Expense")

            # A goal's completion expense is generated, not authored: its adjectives stay
            # editable, but its amounts belong to the goal. Reopen the goal to change them.
            if existing.get("goalId") and changes.get("splits") is not None:
                raise bad_request(
                    "This expense records a completed goal. Reopen the goal to change its "
                    "amounts; description, date, category and account stay editable."
                )

            await ensure_label(
                user["sub"], payload.categoryId, "expense_category", session=session
            )
            await ensure_label(user["sub"], payload.accountId, "account", session=session)

            update = {k: v for k, v in changes.items() if k != "splits"}
            if update.get("description"):
                update["description"] = update["description"].strip()

            if changes.get("splits") is not None:
                new_splits = [s.model_dump() for s in payload.splits]
                await ensure_incomes(
                    user["sub"], [s["incomeId"] for s in new_splits], session=session
                )
                await assert_remaining(
                    user["sub"],
                    _consumption(
                        _splits_map(existing["splits"]), _splits_map(new_splits)
                    ),
                    session=session,
                    action="This edit",
                )
                update["splits"] = new_splits
                update["total"] = sum(s["amount"] for s in new_splits)

            update["updatedAt"] = utcnow()
            await entries_collection.update_one(
                {"_id": existing["_id"]}, {"$set": update}, session=session
            )

            doc = await entries_collection.find_one({"_id": existing["_id"]}, session=session)
            return entry_out(doc)


# --- Reading the ledger ------------------------------------------------------


def _ledger_query(
    user_id: str,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    kind: Optional[str],
    income_id: Optional[str],
    category_id: Optional[str],
    account_id: Optional[str],
    goal_id: Optional[str],
    search: Optional[str],
) -> dict:
    query: dict = {"userId": user_id}
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = date_from
        if date_to:
            window["$lte"] = date_to
        query["date"] = window
    if kind:
        query["kind"] = kind
    if income_id:
        # Matches the lot itself as well as everything drawn from it.
        query["$or"] = [
            {"_id": oid(income_id, "incomeId")},
            {"splits.incomeId": income_id},
        ]
    if category_id:
        query["categoryId"] = category_id
    if account_id:
        query["accountId"] = account_id
    if goal_id:
        query["goalId"] = goal_id
    if search:
        query["description"] = {"$regex": re.escape(search.strip()), "$options": "i"}
    return query


@router.get("/", response_model=list[EntryOut])
async def list_entries(
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    kind: Optional[str] = None,
    incomeId: Optional[str] = None,
    categoryId: Optional[str] = None,
    accountId: Optional[str] = None,
    goalId: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=1000),
    skip: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    query = _ledger_query(
        user["sub"],
        date_from,
        date_to,
        kind,
        incomeId,
        categoryId,
        accountId,
        goalId,
        search,
    )
    docs = (
        await entries_collection.find(query)
        .sort([("date", -1), ("createdAt", -1)])
        .skip(skip)
        .limit(limit)
        .to_list(length=limit)
    )
    return [entry_out(doc) for doc in docs]


@router.get("/export.csv")
async def export_csv(
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    kind: Optional[str] = None,
    incomeId: Optional[str] = None,
    categoryId: Optional[str] = None,
    accountId: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(get_current_user),
):
    """
    One row per draw, so "spent from" survives into a spreadsheet. An income exports as
    a single row with an empty Spent From column. Amounts are in major units.
    """
    query = _ledger_query(
        user["sub"], date_from, date_to, kind, incomeId, categoryId, accountId, None, search
    )
    docs = await entries_collection.find(query).sort([("date", -1)]).to_list(length=10000)

    income_names: Dict[str, str] = {}
    async for doc in entries_collection.find(
        {"userId": user["sub"], "kind": "income"}, {"description": 1, "date": 1}
    ):
        stamp = doc["date"].strftime("%Y-%m-%d") if isinstance(doc.get("date"), datetime) else ""
        income_names[str(doc["_id"])] = f"{doc.get('description', '')} ({stamp})"

    label_names: Dict[str, str] = {}
    async for doc in labels_collection.find({"userId": user["sub"]}, {"name": 1}):
        label_names[str(doc["_id"])] = doc["name"]

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(
        ["Date", "Kind", "Description", "Spent From", "Amount", "Entry Total", "Category", "Account", "Note"]
    )
    for doc in docs:
        raw_date = doc.get("date")
        date_text = (
            raw_date.strftime("%Y-%m-%d") if isinstance(raw_date, datetime) else str(raw_date)
        )
        category = label_names.get(doc.get("categoryId") or "", "")
        account = label_names.get(doc.get("accountId") or "", "")
        total = format(doc.get("total", 0) / 100, ".2f")
        splits = doc.get("splits") or []

        if not splits:
            writer.writerow(
                [date_text, doc["kind"], doc.get("description", ""), "", total, total,
                 category, account, doc.get("note") or ""]
            )
            continue

        for split in splits:
            writer.writerow(
                [
                    date_text,
                    doc["kind"],
                    doc.get("description", ""),
                    income_names.get(split["incomeId"], split["incomeId"]),
                    format(split["amount"] / 100, ".2f"),
                    total,
                    category,
                    account,
                    doc.get("note") or "",
                ]
            )

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="goalie-ledger-' + stamp + '.csv"'
        },
    )


@router.get("/pnl")
async def profit_and_loss(
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    group_by: str = Query(default="month", pattern="^(month|year)$", alias="groupBy"),
    user=Depends(get_current_user),
):
    """
    Income and expenses over a period, netted.

    Note this is a PERIOD view, not a drawdown view: money earned in August and spent
    in September shows as income in August and expense in September. That is correct
    accounting, and it is why the lot drawdown lives on the income cards instead.
    """
    fmt = "%Y-%m" if group_by == "month" else "%Y"

    match: dict = {"userId": user["sub"], "kind": {"$in": ["income", "expense"]}}
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = date_from
        if date_to:
            window["$lte"] = date_to
        match["date"] = window

    period_pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {
                    "period": {"$dateToString": {"format": fmt, "date": "$date"}},
                    "kind": "$kind",
                },
                "total": {"$sum": "$total"},
            }
        },
    ]
    by_period: Dict[str, dict] = {}
    async for row in entries_collection.aggregate(period_pipeline):
        period = row["_id"]["period"]
        bucket = by_period.setdefault(
            period, {"period": period, "income": 0, "expense": 0, "net": 0}
        )
        bucket[row["_id"]["kind"]] = row["total"]
    for bucket in by_period.values():
        bucket["net"] = bucket["income"] - bucket["expense"]

    category_pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {"kind": "$kind", "categoryId": "$categoryId"},
                "total": {"$sum": "$total"},
            }
        },
    ]
    income_by_category: List[dict] = []
    expense_by_category: List[dict] = []
    async for row in entries_collection.aggregate(category_pipeline):
        record = {"categoryId": row["_id"]["categoryId"], "total": row["total"]}
        if row["_id"]["kind"] == "income":
            income_by_category.append(record)
        else:
            expense_by_category.append(record)

    income_by_category.sort(key=lambda r: r["total"], reverse=True)
    expense_by_category.sort(key=lambda r: r["total"], reverse=True)

    periods = sorted(by_period.values(), key=lambda p: p["period"])
    total_income = sum(p["income"] for p in periods)
    total_expense = sum(p["expense"] for p in periods)

    return {
        "groupBy": group_by,
        "periods": periods,
        "incomeByCategory": income_by_category,
        "expenseByCategory": expense_by_category,
        "totals": {
            "income": total_income,
            "expense": total_expense,
            "net": total_income - total_expense,
        },
    }


@router.delete("/{id}", response_model=dict)
async def delete_entry(id: str, user=Depends(get_current_user)):
    async with await client.start_session() as session:
        async with session.start_transaction():
            existing = await entries_collection.find_one(
                {"_id": oid(id), "userId": user["sub"]}, session=session
            )
            if not existing:
                raise not_found("Entry")

            if existing["kind"] not in EDITABLE_KINDS:
                raise bad_request(
                    "Reservations are managed from the goal they belong to — "
                    "release the funds there instead."
                )
            if existing.get("goalId"):
                raise bad_request(
                    "This expense records a completed goal. Reopen the goal to undo it."
                )

            # Deleting an expense hands money back, which is always safe. Deleting an
            # income is only safe while nothing has been spent from it.
            if existing["kind"] == "income":
                totals = await income_totals(user["sub"], [id], session=session)
                drawn = totals.get(id, {})
                committed = drawn.get("spent", 0) + drawn.get("reserved", 0)
                if committed > 0:
                    raise bad_request(
                        f"{committed} of this income has already been spent or reserved. "
                        "Remove those expenses first, or edit this income instead."
                    )

            await entries_collection.delete_one({"_id": existing["_id"]}, session=session)
            return {"message": "Entry deleted."}
