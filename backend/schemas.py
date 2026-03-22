# FULL REWRITE - Introducing "Ledger Integrity"
# A new schema to track changes to goals for history and audit purposes

# v2.0 UPDATE - Introducing "Buckets" for better goal organization and tracking
# Each goal can now belong to a bucket

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# NEW - The ledger system to track changes to goals
class Contribution(BaseModel):
    amount: int
    type: str  # 'deposit' or 'withdrawal'
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# NEW - Bucket:
class Bucket(BaseModel):
    id: Optional[str] = None
    name: str
    type: str # e.g., "Savings", "Investment", "Expense"
    userId: Optional[str] = None
    totalBalance: int = 0
    contributions: List[Contribution] = []

# UPDATE - Integrates with Contribution to maintain ledger history
# v2.0 UPDATE - Link to Bucket
class Goal(BaseModel):
    id: Optional[str] = None  # Updated to str because Mongo uses a str ID
    bucketId: str # NEW - Bucket Link
    name: str
    description: str
    category: str
    colour: str
    targetValue: int
    currentValue: int = 0
    completed: bool = False
    # NEW - List of contributions for ledger integrity
    contributions: List[Contribution] = []


# UPDATE - No longer includes currentValue, as it's now a derivative from contributions
class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    colour: Optional[str] = None
    targetValue: Optional[int] = None
    completed: Optional[bool] = None


# NEW - A separate schema for handling contributions to maintain clear separation of concerns
class ContributionRequest(BaseModel):
    amount: int
    type: str  # 'deposit' or 'withdrawal'


# UNCHANGED
class User(BaseModel):
    id: Optional[str]
    email: str
    name: Optional[str]
    google_id: str
