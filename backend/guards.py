# backend/guards.py
# The one rule the product rests on: an income's `remaining` may never go negative.
# You cannot spend more of Mr. John's payment than Mr. John actually paid you.
#
# Both expenses and reservations consume `remaining`, so both are checked here.
# Always call this INSIDE the transaction, after reads and before writes.
from typing import Dict

from aggregates import income_totals
from database import entries_collection
from helpers import bad_request, oid


async def assert_remaining(
    user_id: str,
    consumption: Dict[str, int],
    session=None,
    action: str = "This transaction",
) -> None:
    """
    `consumption` maps incomeId -> hundredths of `remaining` this write will use up.
    Negative or zero values (money being handed back) are always fine and are skipped.
    """
    needed = {iid: amt for iid, amt in consumption.items() if amt > 0}
    if not needed:
        return

    totals = await income_totals(user_id, needed.keys(), session=session)

    shortfalls = []
    for income_id, amount in needed.items():
        remaining = totals.get(income_id, {}).get("remaining", 0)
        if amount > remaining:
            shortfalls.append((income_id, amount, remaining))

    if not shortfalls:
        return

    # Only hit the DB for descriptions once we know we are failing.
    names: Dict[str, str] = {}
    cursor = entries_collection.find(
        {
            "_id": {"$in": [oid(s[0], "incomeId") for s in shortfalls]},
            "userId": user_id,
            "kind": "income",
        },
        {"description": 1},
        session=session,
    )
    async for doc in cursor:
        names[str(doc["_id"])] = doc.get("description", "that income")

    parts = [
        f"'{names.get(income_id, 'that income')}' is short by {amount - remaining} "
        f"(needs {amount}, has {remaining} left)"
        for income_id, amount, remaining in shortfalls
    ]
    raise bad_request(
        f"{action} would spend more than you earned. {'; '.join(parts)}. "
        "Pick a different income, or free some up from a goal."
    )
