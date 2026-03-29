# FULL REWRITE - Introducing "Ledger Integrity"
# v2.0 UPDATE - Introducing "Buckets" and "Cross-Entity Transfers"

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# NEW - The ledger system to track changes to goals
class Contribution(BaseModel):
    amount: int
    type: str  # 'deposit', 'withdrawal', 'transfer_in', or 'transfer_out'
    referenceId: Optional[str] = None # CHANGED: Added to link double-entry transfers
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# NEW - Bucket:
class Bucket(BaseModel):
    id: Optional[str] = None
    name: str
    type: str # e.g., "bank_account", "wallet", "investment"
    userId: Optional[str] = None
    totalBalance: int = 0
    contributions: List[Contribution] = []

# UPDATE - Link to Bucket
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
    contributions: List[Contribution] = []


# UPDATE - No longer includes currentValue, as it's now a derivative from contributions
class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    colour: Optional[str] = None
    targetValue: Optional[int] = None
    completed: Optional[bool] = None


class ContributionRequest(BaseModel):
    amount: int
    type: str  # 'deposit' or 'withdrawal'

# NEW - Required for the transactional engine moving money between goals
class TransferRequest(BaseModel):
    sourceId: str
    targetId: str
    amount: int


# UNCHANGED
class User(BaseModel):
    id: Optional[str]
    email: str
    name: Optional[str]
    google_id: str