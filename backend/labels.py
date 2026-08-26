# backend/labels.py
# Income categories, expense categories and accounts are all plain adjectives on an
# entry: an editable list of names, no balances, no validation.
#
# Only income categories carry a colour, because that is what tints an income
# everywhere in the UI. There are far too many income lots to give each its own hue,
# so identity is carried by name + date and colour groups them.
import re
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from auth import get_current_user
from database import entries_collection, labels_collection
from helpers import bad_request, label_out, not_found, oid, utcnow
from models import LabelIn, LabelKind, LabelOut, LabelUpdate

router = APIRouter(prefix="/labels", tags=["labels"])

# Which entry field points at which kind of label.
FIELD_FOR_KIND = {
    "income_category": "categoryId",
    "expense_category": "categoryId",
    "account": "accountId",
}

# Seeded on first use so a new account is immediately usable. All eight income
# categories map onto the eight validated palette slots, in order.
DEFAULT_LABELS = [
    {"name": "Salary", "kind": "income_category", "colourSlot": 0},
    {"name": "Freelancing", "kind": "income_category", "colourSlot": 1},
    {"name": "Interest", "kind": "income_category", "colourSlot": 2},
    {"name": "Business", "kind": "income_category", "colourSlot": 3},
    {"name": "Gift", "kind": "income_category", "colourSlot": 4},
    {"name": "Investments", "kind": "income_category", "colourSlot": 5},
    {"name": "Refund", "kind": "income_category", "colourSlot": 6},
    {"name": "Other", "kind": "income_category", "colourSlot": 7},
    {"name": "Food", "kind": "expense_category", "colourSlot": 0},
    {"name": "Rent", "kind": "expense_category", "colourSlot": 0},
    {"name": "Transport", "kind": "expense_category", "colourSlot": 0},
    {"name": "Shopping", "kind": "expense_category", "colourSlot": 0},
    {"name": "Bills", "kind": "expense_category", "colourSlot": 0},
    {"name": "Health", "kind": "expense_category", "colourSlot": 0},
]


async def seed_default_labels(user_id: str) -> None:
    """Idempotent: only seeds when the user has no labels at all."""
    existing = await labels_collection.count_documents({"userId": user_id}, limit=1)
    if existing:
        return

    now = utcnow()
    await labels_collection.insert_many(
        [{**label, "userId": user_id, "archived": False, "createdAt": now} for label in DEFAULT_LABELS]
    )


@router.get("/", response_model=list[LabelOut])
async def list_labels(
    kind: Optional[LabelKind] = Query(default=None),
    include_archived: bool = False,
    user=Depends(get_current_user),
):
    # Seeding here rather than only at signup means existing accounts get the
    # defaults too, without a migration step.
    await seed_default_labels(user["sub"])

    query: dict = {"userId": user["sub"]}
    if kind:
        query["kind"] = kind
    if not include_archived:
        query["archived"] = {"$ne": True}

    docs = await labels_collection.find(query).sort("name", 1).to_list(length=500)
    return [label_out(doc) for doc in docs]


@router.post("/", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
async def create_label(payload: LabelIn, user=Depends(get_current_user)):
    name = payload.name.strip()
    existing = await labels_collection.find_one(
        {
            "userId": user["sub"],
            "kind": payload.kind,
            "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
        }
    )
    if existing:
        raise bad_request(f"'{name}' already exists.")

    doc = payload.model_dump()
    doc["name"] = name
    doc.update({"userId": user["sub"], "archived": False, "createdAt": utcnow()})

    result = await labels_collection.insert_one(doc)
    created = await labels_collection.find_one({"_id": result.inserted_id})
    return label_out(created)


@router.put("/{id}", response_model=LabelOut)
async def update_label(id: str, payload: LabelUpdate, user=Depends(get_current_user)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise bad_request("No fields to update.")
    if changes.get("name"):
        changes["name"] = changes["name"].strip()

    result = await labels_collection.update_one(
        {"_id": oid(id), "userId": user["sub"]}, {"$set": changes}
    )
    if result.matched_count == 0:
        raise not_found("Label")

    doc = await labels_collection.find_one({"_id": oid(id)})
    return label_out(doc)


@router.delete("/{id}", response_model=dict)
async def delete_label(id: str, user=Depends(get_current_user)):
    """
    Labels are referenced by id, so one still in use is archived rather than deleted —
    that keeps historical entries readable instead of showing a dangling id.
    """
    doc = await labels_collection.find_one({"_id": oid(id), "userId": user["sub"]})
    if not doc:
        raise not_found("Label")

    field = FIELD_FOR_KIND[doc["kind"]]
    in_use = await entries_collection.count_documents(
        {"userId": user["sub"], field: id}, limit=1
    )
    if in_use:
        await labels_collection.update_one({"_id": doc["_id"]}, {"$set": {"archived": True}})
        return {
            "message": f"'{doc['name']}' is used by existing entries, so it was archived.",
            "archived": True,
        }

    await labels_collection.delete_one({"_id": doc["_id"]})
    return {"message": "Label deleted.", "archived": False}
