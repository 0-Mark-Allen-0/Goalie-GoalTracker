# backend/helpers.py
# Shared serialisation, ownership and reference-integrity helpers.
from datetime import datetime, timezone
from typing import Iterable, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from database import entries_collection, goals_collection, labels_collection


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value):
    """
    Mongo hands back naive datetimes. Serialised bare, JavaScript reads them as local
    time and every date silently shifts, so the UTC marker is reattached on the way out.
    """
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def oid(value: str, what: str = "id") -> ObjectId:
    """ObjectId() raises on malformed input, which would otherwise surface as a 500."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed {what}: {value!r}",
        )


def not_found(what: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{what} not found.")


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


# --- Serialisers -------------------------------------------------------------


def label_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "kind": doc["kind"],
        "colourSlot": doc.get("colourSlot", 0),
        "archived": doc.get("archived", False),
    }


def entry_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "kind": doc["kind"],
        "date": as_utc(doc["date"]),
        "description": doc.get("description", ""),
        "total": doc.get("total", 0),
        "splits": doc.get("splits", []),
        "categoryId": doc.get("categoryId"),
        "accountId": doc.get("accountId"),
        "goalId": doc.get("goalId"),
        "note": doc.get("note"),
        "createdAt": as_utc(doc.get("createdAt")),
        "updatedAt": as_utc(doc.get("updatedAt")),
    }


def income_out(doc: dict, totals: Optional[dict] = None) -> dict:
    """An income lot plus how much of it is still unspent."""
    totals = totals or {}
    base = entry_out(doc)
    base.update(
        {
            "spent": totals.get("spent", 0),
            "reserved": totals.get("reserved", 0),
            "remaining": totals.get("remaining", doc.get("total", 0)),
        }
    )
    return base


def goal_out(doc: dict, totals: Optional[dict] = None) -> dict:
    totals = totals or {}
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "description": doc.get("description", ""),
        "targetValue": doc["targetValue"],
        "deadline": as_utc(doc.get("deadline")),
        "status": doc.get("status", "active"),
        "saved": totals.get("saved", 0),
        "breakdown": totals.get("breakdown", []),
        "completedAt": as_utc(doc.get("completedAt")),
        "createdAt": as_utc(doc.get("createdAt")),
    }


# --- Reference integrity -----------------------------------------------------


async def ensure_incomes(user_id: str, income_ids: Iterable[str], session=None) -> dict:
    """
    Every referenced income must exist, be an income, and belong to the caller.
    Returns the matched docs keyed by id so callers can reuse them (e.g. for dates).
    """
    wanted: List[str] = list(dict.fromkeys(income_ids))
    if not wanted:
        return {}

    cursor = entries_collection.find(
        {
            "_id": {"$in": [oid(i, "incomeId") for i in wanted]},
            "userId": user_id,
            "kind": "income",
        },
        session=session,
    )
    found = {str(doc["_id"]): doc async for doc in cursor}

    missing = [i for i in wanted if i not in found]
    if missing:
        raise bad_request(f"Unknown income(s): {', '.join(missing)}")
    return found


async def ensure_label(
    user_id: str, label_id: Optional[str], kind: str, session=None
) -> None:
    """Categories and accounts are optional adjectives — None is always valid."""
    if label_id is None:
        return
    doc = await labels_collection.find_one(
        {"_id": oid(label_id, f"{kind}Id"), "userId": user_id, "kind": kind},
        session=session,
    )
    if not doc:
        raise bad_request(f"Unknown {kind.replace('_', ' ')}: {label_id}")


async def get_owned_goal(user_id: str, goal_id: str, session=None) -> dict:
    doc = await goals_collection.find_one(
        {"_id": oid(goal_id, "goalId"), "userId": user_id}, session=session
    )
    if not doc:
        raise not_found("Goal")
    return doc
