from pydantic import BaseModel
from typing import Optional

# UPDATE - Introducing the 'completed' field - For history & "mark as completed"
# UPDATE 2 - Introducing Google based login - Creating a new User base model

class Goal(BaseModel):
    id: Optional[str] =  None # Updated to str because Mongo uses a str ID
    name: str
    description: str
    category: str
    colour: str
    targetValue: int
    currentValue: int
    # NEW
    completed: bool = False

# Separate schema to handle Goal updates
class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    colour: Optional[str] = None
    targetValue: Optional[int] = None
    currentValue: Optional[int] = None
    # NEW
    completed: Optional[bool] = None


# NEW
class User(BaseModel):
    id: Optional[str]
    email: str
    name: Optional[str]
    google_id: str