# # Define all CRUD functions to perform on the database over here
#
# # UPDATE - Some changes to incorporate the 'completed' feature
#
# # UPDATE 2 - JWT integration to all endpoints
# from fastapi import APIRouter, Depends, HTTPException, status
# from auth import get_current_user
#
#
# from database import goals_collection
# from bson import ObjectId
#
# # UPDATE
# # def goalHelper(goal) -> dict:
# #     return {
# #         "id": str(goal["_id"]),
# #         "name": goal["name"],
# #         "description": goal["description"],
# #         "category": goal["category"],
# #         "colour": goal["colour"],
# #         "targetValue": goal["targetValue"],
# #         "currentValue": goal["currentValue"],
# #         # NEW
# #         "completed": goal.get("completed", False)
# #     }
# #
# # # UPDATE
# # def createGoal(goal: dict) -> dict:
# #     # NEW
# #     if "completed" not in goal:
# #         goal["completed"] = False
# #     result = goals_collection.insert_one(goal)
# #     newGoal = goals_collection.find_one({"_id": result.inserted_id})
# #     return goalHelper(newGoal)
# #
# # def getGoals():
# #     return [goalHelper(goal) for goal in goals_collection.find()]
# #
# # def getGoal(id: str):
# #     return goalHelper(goals_collection.find_one({"_id": ObjectId(id)}))
# #
# # def updateGoal(id: str, data: dict):
# #     goals_collection.update_one({"_id": ObjectId(id)}, {"$set": data})
# #     return getGoal(id)
# #
# # def deleteGoal(id: str):
# #     goals_collection.delete_one({"_id": ObjectId(id)})
# #     return True
#
#
# # NEWLY REWORKED ENDPOINTS:
# router = APIRouter(prefix="/goals", tags=["goals"])
#
#
# # Helper function to serialize a goal document
# def goalHelper(goal) -> dict:
#     return {
#         "id": str(goal["_id"]),
#         "name": goal["name"],
#         "description": goal["description"],
#         "category": goal["category"],
#         "colour": goal["colour"],
#         "targetValue": goal["targetValue"],
#         "currentValue": goal["currentValue"],
#         "completed": goal.get("completed", False),
#         "userId": goal["userId"]  # Added userId for clarity
#     }
#
#
# # Endpoint to create a new goal for the authenticated user
# @router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
# def createGoal(goal: dict, user=Depends(get_current_user)):
#     # Add the userId from the JWT payload to the goal document
#     goal["userId"] = user["sub"]
#     if "completed" not in goal:
#         goal["completed"] = False
#
#     result = goals_collection.insert_one(goal)
#     newGoal = goals_collection.find_one({"_id": result.inserted_id})
#     return goalHelper(newGoal)
#
#
# # Endpoint to get all goals for the authenticated user
# @router.get("/", response_model=list)
# def getGoals(user=Depends(get_current_user)):
#     # Filter goals by the authenticated user's ID
#     goals = goals_collection.find({"userId": user["sub"]})
#     return [goalHelper(goal) for goal in goals]
#
#
# # Endpoint to get a single goal by its ID
# @router.get("/{id}", response_model=dict)
# def getGoal(id: str, user=Depends(get_current_user)):
#     goal = goals_collection.find_one({"_id": ObjectId(id)})
#     if not goal:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
#
#     # Ensure the authenticated user owns the goal
#     if goal["userId"] != user["sub"]:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to access this goal.")
#
#     return goalHelper(goal)
#
#
# # Endpoint to update a goal
# @router.put("/{id}", response_model=dict)
# def updateGoal(id: str, data: dict, user=Depends(get_current_user)):
#     existing_goal = goals_collection.find_one({"_id": ObjectId(id)})
#     if not existing_goal:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
#
#     # Ensure the authenticated user owns the goal
#     if existing_goal["userId"] != user["sub"]:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update this goal.")
#
#     goals_collection.update_one({"_id": ObjectId(id)}, {"$set": data})
#     return goalHelper(goals_collection.find_one({"_id": ObjectId(id)}))
#
#
# # Endpoint to delete a goal
# @router.delete("/{id}", response_model=dict)
# def deleteGoal(id: str, user=Depends(get_current_user)):
#     existing_goal = goals_collection.find_one({"_id": ObjectId(id)})
#     if not existing_goal:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
#
#     # Ensure the authenticated user owns the goal
#     if existing_goal["userId"] != user["sub"]:
#         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to delete this goal.")
#
#     result = goals_collection.delete_one({"_id": ObjectId(id)})
#     if result.deleted_count == 0:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
#
#     return {"message": "Goal deleted successfully."}

# UPDATED crud.py (v0)
from fastapi import APIRouter, Depends, HTTPException, status
from auth import get_current_user
from database import goals_collection
from bson import ObjectId

router = APIRouter(prefix="/goals", tags=["goals"])

def goalHelper(goal) -> dict:
    return {
        "id": str(goal["_id"]),
        "name": goal["name"],
        "description": goal["description"],
        "category": goal["category"],
        "colour": goal["colour"],
        "targetValue": goal["targetValue"],
        "currentValue": goal["currentValue"],
        "completed": goal.get("completed", False),
        "userId": goal["userId"]
    }

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def createGoal(goal: dict, user=Depends(get_current_user)):
    goal["userId"] = user["sub"]
    if "completed" not in goal:
        goal["completed"] = False

    result = goals_collection.insert_one(goal)
    newGoal = goals_collection.find_one({"_id": result.inserted_id})
    return goalHelper(newGoal)

@router.get("/", response_model=list)
def getGoals(user=Depends(get_current_user)):
    goals = goals_collection.find({"userId": user["sub"]})
    return [goalHelper(goal) for goal in goals]

@router.get("/{id}", response_model=dict)
def getGoal(id: str, user=Depends(get_current_user)):
    goal = goals_collection.find_one({"_id": ObjectId(id)})
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    if goal["userId"] != user["sub"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to access this goal.")

    return goalHelper(goal)

@router.put("/{id}", response_model=dict)
def updateGoal(id: str, data: dict, user=Depends(get_current_user)):
    existing_goal = goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update this goal.")

    goals_collection.update_one({"_id": ObjectId(id)}, {"$set": data})
    return goalHelper(goals_collection.find_one({"_id": ObjectId(id)}))

@router.delete("/{id}", response_model=dict)
def deleteGoal(id: str, user=Depends(get_current_user)):
    existing_goal = goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to delete this goal.")

    result = goals_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    return {"message": "Goal deleted successfully."}

@router.put("/{id}/complete", response_model=dict)
def completeGoal(id: str, user=Depends(get_current_user)):
    existing_goal = goals_collection.find_one({"_id": ObjectId(id)})
    if not existing_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    if existing_goal["userId"] != user["sub"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to update this goal.")

    goals_collection.update_one({"_id": ObjectId(id)}, {"$set": {"completed": True}})
    return goalHelper(goals_collection.find_one({"_id": ObjectId(id)}))
