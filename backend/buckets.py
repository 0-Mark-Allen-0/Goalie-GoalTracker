# backend/buckets.py
# NEW - CRUD Ops for Buckets
from fastapi import APIRouter, HTTPException, Depends, status
from auth import get_current_user
from database import buckets_collection, goals_collection
from bson import ObjectId

router = APIRouter(prefix="/buckets", tags=["buckets"])

async def bucket_helper(bucket) -> dict:
    bucket_id = str(bucket["_id"])

    # CHANGED: Fixed keys to camelCase to match the Goal schema correctly
    goals_cursor = goals_collection.find({"bucketId": bucket_id, "userId": bucket.get("userId")})
    goals = await goals_cursor.to_list(length=1000)

    # Financial Biz. Logic - Allocated & Unallocated Funds
    allocated_funds = sum(goal.get("currentValue", 0) for goal in goals)
    total_balance = bucket.get("totalBalance", 0)
    unallocated_funds = total_balance - allocated_funds

    return {
        "id": bucket_id,
        "name": bucket["name"],
        "type": bucket["type"],
        "totalBalance": total_balance,
        "unallocatedFunds": unallocated_funds,
        "userId": bucket.get("userId"),
        "contributions": bucket.get("contributions", []),
    }

# API Endpoints for Buckets:

# CREATE
@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_bucket(bucket: dict, user=Depends(get_current_user)):
    bucket["userId"] = user["sub"]
    if "totalBalance" not in bucket:
        bucket["totalBalance"] = 0
    if "contributions" not in bucket:
        bucket["contributions"] = []

    result = await buckets_collection.insert_one(bucket)
    new_bucket = await buckets_collection.find_one({"_id": result.inserted_id})
    return await bucket_helper(new_bucket)

# GET ALL
@router.get("/", response_model=list)
async def get_buckets(user=Depends(get_current_user)):
    buckets_cursor = buckets_collection.find({"userId": user["sub"]})
    buckets = await buckets_cursor.to_list(length=1000)
    # WAIT - To calculate unallocated funds
    return [await bucket_helper(bucket) for bucket in buckets]

# GET ONE
@router.get("/{id}", response_model=dict)
async def get_bucket(id: str, user=Depends(get_current_user)):
    bucket = await buckets_collection.find_one({"_id": ObjectId(id)})
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")
    if bucket.get("userId") != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this bucket")
    
    return await bucket_helper(bucket)  

# UPDATE
@router.put("/{id}", response_model=dict)
async def update_bucket(id: str, data: dict, user=Depends(get_current_user)):
    existing_bucket = await buckets_collection.find_one({"_id": ObjectId(id)})
    if not existing_bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")
    if existing_bucket.get("userId") != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this bucket")
    
    # Security - Prevent overriding balance or ledger history
    safe_update_data = {}
    if "name" in data:
        safe_update_data["name"] = data["name"]
    if "type" in data:
        safe_update_data["type"] = data["type"]

    if safe_update_data:
        await buckets_collection.update_one({"_id": ObjectId(id)}, {"$set": safe_update_data})

    updated_bucket = await buckets_collection.find_one({"_id": ObjectId(id)})
    return await bucket_helper(updated_bucket)

# DELETE
@router.delete("/{id}", response_model=dict)
async def delete_bucket(id: str, user=Depends(get_current_user)):
    existing_bucket = await buckets_collection.find_one({"_id": ObjectId(id)})
    if not existing_bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")
    if existing_bucket.get("userId") != user["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this bucket")
    
    # CHANGED: Fixed key from 'bucket_id' to 'bucketId' to properly count attached goals
    attached_goals_count = await goals_collection.count_documents({"bucketId": id})
    if attached_goals_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete bucket with attached goals. Please reassign or delete goals first.")
    
    result = await buckets_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bucket not found")
    
    return {"message": "Bucket deleted successfully"}