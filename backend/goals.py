# FULL REWRITE - Async. Updates:
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from schemas import Goal, GoalUpdate, ContributionRequest
from crud import createGoal, getGoal, getGoals, updateGoal, deleteGoal, addContribution
from auth import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.post("/", response_model=Goal)
async def add_goal(goal: Goal, user=Depends(get_current_user)):
    return await createGoal(goal.dict(), user)


@router.get("/", response_model=List[Goal])
async def read_goals(user=Depends(get_current_user)):
    return await getGoals(user)


@router.get("/{id}", response_model=Goal)
async def read_goal(id: str, user=Depends(get_current_user)):
    return await getGoal(id, user)


@router.put("/{id}")
async def modify_goal(id: str, goal: GoalUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in goal.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    return await updateGoal(id, update_data, user)


@router.post("/{id}/contributions")
async def add_goal_contribution(
    id: str, payload: ContributionRequest, user=Depends(get_current_user)
):
    return await addContribution(id, payload.dict(), user)


@router.delete("/{id}")
async def delete_goal(id: str, user=Depends(get_current_user)):
    return await deleteGoal(id, user)


@router.put("/{id}/complete")
async def complete_goal(id: str, user=Depends(get_current_user)):
    return await updateGoal(id, {"completed": True}, user)
