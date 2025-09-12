from typing import List
from fastapi import APIRouter, HTTPException
from schemas import Goal, GoalUpdate
from crud import createGoal, getGoal, getGoals, updateGoal, deleteGoal

# UPDATE - Some changes to incorporate the 'completed' feature

router = APIRouter(prefix="/goals", tags=["Goals"])

@router.post("/", response_model=Goal)
def add_goal(goal: Goal):
    return createGoal(goal.dict())

@router.get("/", response_model=List[Goal])
def read_goals():
    return getGoals()

@router.get("/{id}", response_model=Goal)
def read_goal(id: str):
    return getGoal(id)

# @router.put("/{id}", response_model=Goal)
# def modify_goal(id: str, goal: Goal):
#     return updateGoal(id, goal.dict())

@router.put("/{id}")
async def modify_goal(id: str, goal: GoalUpdate):
    update_data = {k: v for k, v in goal.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated_goal = updateGoal(id, update_data)
    return updated_goal

@router.delete("/{id}")
def delete_goal(id: str):
    if deleteGoal(id):
        return {"message": "Goal deleted"}
    raise HTTPException(status_code=404, detail="Goal not found")

# NEW
@router.put("/{id}/complete")
async def complete_goal(id: str):
    updated_goal = updateGoal(id, {"completed" : True})
    return updated_goal