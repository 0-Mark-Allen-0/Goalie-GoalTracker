# backend/transactions.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from auth import get_current_user
from database import client, goals_collection, buckets_collection
from bson import ObjectId
from datetime import datetime
import uuid
from crud import goalHelper  # NEW - Import our formatting helper

router = APIRouter(prefix="/transactions", tags=["transactions"])

async def get_unallocated_balance(bucket_id: str, user_id: str, session=None) -> int:
    """Helper to dynamically calculate unallocated funds during a transaction."""
    bucket = await buckets_collection.find_one({"_id": ObjectId(bucket_id), "userId": user_id}, session=session)
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found.")
    
    # Sum all goal allocations inside this bucket
    goals_cursor = goals_collection.find({"bucketId": bucket_id, "userId": user_id}, session=session)
    goals = await goals_cursor.to_list(length=1000)
    allocated = sum(g.get("currentValue", 0) for g in goals)
    
    return bucket.get("totalBalance", 0) - allocated


# --- 1. GOAL ALLOCATIONS (With Unallocated Check) ---
@router.post("/goal/{id}/contribute")
async def allocate_to_goal(
    id: str, 
    payload: dict, 
    x_idempotency_key: str = Header(None),
    user=Depends(get_current_user)
):
    amount = payload.get("amount")
    c_type = payload.get("type")

    async with await client.start_session() as session:
        async with session.start_transaction():
            goal = await goals_collection.find_one({"_id": ObjectId(id), "userId": user["sub"]}, session=session)
            if not goal:
                raise HTTPException(status_code=404, detail="Goal not found.")

            if c_type == "deposit":
                unallocated = await get_unallocated_balance(goal["bucketId"], user["sub"], session)
                if amount > unallocated:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient funds. You only have ₹{unallocated} unallocated in the parent bucket. Please deduct from other goals first."
                    )
                
                if goal.get("currentValue", 0) + amount > goal.get("targetValue", 0):
                    raise HTTPException(status_code=400, detail="Deposit exceeds goal target.")
                increment = amount

            elif c_type == "withdrawal":
                if goal.get("currentValue", 0) - amount < 0:
                    raise HTTPException(status_code=400, detail="Cannot withdraw more than current allocation.")
                increment = -amount

            contribution_record = {
                "id": str(uuid.uuid4()),
                "amount": amount,
                "type": c_type,
                "timestamp": datetime.utcnow()
            }

            await goals_collection.update_one(
                {"_id": ObjectId(id)},
                {"$inc": {"currentValue": increment}, "$push": {"contributions": contribution_record}},
                session=session
            )
            
            # CHANGED - Wrap the raw MongoDB document in goalHelper before returning
            updated_goal = await goals_collection.find_one({"_id": ObjectId(id)}, session=session)
            return goalHelper(updated_goal)


# --- 2. BUCKET WITHDRAWALS (With Unallocated Check) ---
@router.post("/bucket/{id}/withdraw")
async def withdraw_from_bucket(id: str, payload: dict, user=Depends(get_current_user)):
    amount = payload.get("amount")
    
    async with await client.start_session() as session:
        async with session.start_transaction():
            unallocated = await get_unallocated_balance(id, user["sub"], session)
            
            if amount > unallocated:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Transaction Denied: You are trying to withdraw ₹{amount}, but only have ₹{unallocated} unallocated. Deduct money from your Goal allocations to free up Bucket balance first."
                )

            contribution_record = {
                "id": str(uuid.uuid4()),
                "amount": amount,
                "type": "withdrawal",
                "timestamp": datetime.utcnow()
            }

            await buckets_collection.update_one(
                {"_id": ObjectId(id)},
                {"$inc": {"totalBalance": -amount}, "$push": {"contributions": contribution_record}},
                session=session
            )
            return {"message": "Withdrawal successful"}


# --- 3. THE SMART TRANSFER (Double-Entry & Overflow Protection) ---
@router.post("/transfer/goal-to-goal")
async def transfer_between_goals(payload: dict, user=Depends(get_current_user)):
    source_id = payload.get("sourceId")
    target_id = payload.get("targetId")
    requested_amount = payload.get("amount")

    async with await client.start_session() as session:
        async with session.start_transaction():
            source = await goals_collection.find_one({"_id": ObjectId(source_id), "userId": user["sub"]}, session=session)
            target = await goals_collection.find_one({"_id": ObjectId(target_id), "userId": user["sub"]}, session=session)

            if not source or not target:
                raise HTTPException(status_code=404, detail="Source or target goal not found.")
            
            if source.get("currentValue", 0) < requested_amount:
                raise HTTPException(status_code=400, detail="Insufficient funds in source goal.")

            # OVERFLOW PROTECTION LOGIC
            target_gap = target.get("targetValue", 0) - target.get("currentValue", 0)
            actual_transfer = min(requested_amount, target_gap)

            if actual_transfer <= 0:
                raise HTTPException(status_code=400, detail="Target goal is already fully funded.")

            transfer_ref_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()

            # Double Entry 1: Withdraw from Source
            await goals_collection.update_one(
                {"_id": ObjectId(source_id)},
                {
                    "$inc": {"currentValue": -actual_transfer},
                    "$push": {"contributions": {"id": str(uuid.uuid4()), "amount": actual_transfer, "type": "transfer_out", "referenceId": target_id, "timestamp": timestamp}}
                },
                session=session
            )

            # Double Entry 2: Deposit to Target
            await goals_collection.update_one(
                {"_id": ObjectId(target_id)},
                {
                    "$inc": {"currentValue": actual_transfer},
                    "$push": {"contributions": {"id": str(uuid.uuid4()), "amount": actual_transfer, "type": "transfer_in", "referenceId": source_id, "timestamp": timestamp}}
                },
                session=session
            )

            return {
                "message": "Transfer complete.",
                "requested": requested_amount,
                "transferred": actual_transfer,
                "overflow_prevented": requested_amount - actual_transfer
            }