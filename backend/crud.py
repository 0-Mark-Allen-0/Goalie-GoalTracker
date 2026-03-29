# FULL REWRITE - Asynchronous Ops. & Contribution Ledger Logic
from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user
from database import goals_collection, buckets_collection # CHANGED: Imported buckets_collection
from bson import ObjectId
from datetime import datetime
import uuid # CHANGED: Imported uuid for ledger integrity

router = APIRouter(prefix="/goals", tags=["goals"])


def goalHelper(goal) -> dict:
    return {
        "id": str(goal["_id"]),
        "bucketId": goal.get("bucketId", ""),
        "name": goal["name"],
        "description": goal["description"],
        "category": goal["category"],
        "colour": goal["colour"],
        "targetValue": goal["targetValue"],
        "currentValue": goal.get("currentValue", 0),
        "completed": goal.get("completed", False),
        "userId": goal["userId"],
        "contributions": goal.get("contributions", []),
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def createGoal(goal: dict, user=Depends(get_current_user)):
    goal["userId"] = user["sub"]
    if "completed" not in goal:
        goal["completed"] = False
    if "currentValue" not in goal:
        goal["currentValue"] = 0
    if "contributions" not in goal:
        goal["contributions"] = []

    result = await goals_collection.insert_one(goal)
    newGoal = await goals_collection.find_one({"_id": result.inserted_id})
    return goalHelper(newGoal)


@router.get("/", response_model=list)
async def getGoals(user=Depends(get_current_user)):
    goals_cursor = goals_collection.find({"userId": user["sub"]})
    goals = await goals_cursor.to_list(length=1000)
    return [goalHelper(goal) for goal in goals]


@router.get("/{id}", response_model=dict)
async def getGoal(id: str, user=Depends(get_current_user)):
    goal = await goals_collection.find_one({"_id": ObjectId(id)})
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="404: Goal not found."
        )

    if goal["userId"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403: You are not authorized to access this goal.",
        )

    return goalHelper(goal)


@router.put("/{id}", response_model=dict)
async def updateGoal(id: str, data: dict, user=Depends(get_current_user)):
    existing_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="404: Goal not found."
        )

    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="403: You are not authorized to update this goal.",
        )

    await goals_collection.update_one({"_id": ObjectId(id)}, {"$set": data})
    updated_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    return goalHelper(updated_goal)


@router.post("/{id}/contributions", response_model=dict)
async def addContribution(id: str, payload: dict, user=Depends(get_current_user)):
    existing_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found."
        )
    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized."
        )

    amount = payload.get("amount")
    c_type = payload.get("type")

    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than zero.",
        )
    if c_type not in ["deposit", "withdrawal"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid contribution type."
        )

    current_val = existing_goal.get("currentValue", 0)
    target_val = existing_goal.get("targetValue", 0)

    if c_type == "deposit":
        if current_val + amount > target_val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deposit exceeds target amount.",
            )
        increment = amount
    else:
        if current_val - amount < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Withdrawal exceeds current balance.",
            )
        increment = -amount

    contribution_record = {
        "amount": amount,
        "type": c_type,
        "timestamp": datetime.utcnow(),
    }

    await goals_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$inc": {"currentValue": increment},
            "$push": {"contributions": contribution_record},
        },
    )

    updated_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    return goalHelper(updated_goal)


@router.put("/{id}/complete", response_model=dict)
async def completeGoal(id: str, user=Depends(get_current_user)):
    existing_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    # CHANGED: Safety check to avoid double-deducting if already completed
    if existing_goal.get("completed", False):
        return goalHelper(existing_goal)

    # CHANGED: Deduct target value from parent bucket
    target_val = existing_goal.get("targetValue", 0)
    bucket_id = existing_goal.get("bucketId")

    if bucket_id:
        withdrawal_record = {
            "id": str(uuid.uuid4()),
            "amount": target_val,
            "type": "withdrawal",
            "timestamp": datetime.utcnow(),
            "referenceId": id # Notes that this withdrawal happened because the goal finished
        }
        await buckets_collection.update_one(
            {"_id": ObjectId(bucket_id)},
            {
                "$inc": {"totalBalance": -target_val},
                "$push": {"contributions": withdrawal_record}
            }
        )

    await goals_collection.update_one(
        {"_id": ObjectId(id)}, 
        {"$set": {"completed": True}}
    )

    updated_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    return goalHelper(updated_goal)

@router.delete("/{id}", response_model=dict)
async def deleteGoal(id: str, user=Depends(get_current_user)):
    existing_goal = await goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found."
        )
    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this goal.",
        )

    result = await goals_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found."
        )
    return {"message": "Goal deleted successfully."}