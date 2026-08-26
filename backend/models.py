# backend/models.py
# Pydantic v2 request/response models.
#
# Money is ALWAYS an integer number of hundredths (paise / cents). Nothing in this
# codebase ever puts a float on the wire or in the database.
#
# The central noun is an INCOME: one earning event, with its own date and its own
# balance. Expenses are SPENT FROM specific incomes, never from a shared pool.
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

EntryKind = Literal["income", "expense", "reservation", "release"]
LabelKind = Literal["income_category", "expense_category", "account"]
GoalStatus = Literal["active", "completed", "abandoned"]

# Only income categories carry a colour; it is what tints an income everywhere.
MAX_COLOUR_SLOT = 7


class Split(BaseModel):
    """A draw against one income. Answers 'which earning did this money come from?'."""

    incomeId: str
    amount: int = Field(gt=0, description="Hundredths; strictly positive.")


def _validate_splits(splits: List[Split]) -> List[Split]:
    if not splits:
        raise ValueError("Pick at least one income to spend from.")
    seen = {s.incomeId for s in splits}
    if len(seen) != len(splits):
        raise ValueError("An income may only appear once per entry; combine the amounts.")
    return splits


# --- Labels (income categories, expense categories, accounts) -----------------


class LabelIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    kind: LabelKind
    colourSlot: int = Field(default=0, ge=0, le=MAX_COLOUR_SLOT)


class LabelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    colourSlot: Optional[int] = Field(default=None, ge=0, le=MAX_COLOUR_SLOT)
    archived: Optional[bool] = None


class LabelOut(BaseModel):
    id: str
    name: str
    kind: LabelKind
    colourSlot: int = 0
    archived: bool = False


# --- Income ------------------------------------------------------------------


class IncomeIn(BaseModel):
    """
    One earning event. Unlike an expense it has no splits — an income IS the lot that
    everything else draws from.
    """

    date: datetime
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(gt=0)
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)


class IncomeUpdate(BaseModel):
    date: Optional[datetime] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=200)
    amount: Optional[int] = Field(default=None, gt=0)
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)


# --- Expenses ----------------------------------------------------------------


class ExpenseIn(BaseModel):
    date: datetime
    description: str = Field(min_length=1, max_length=200)
    splits: List[Split]
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("splits")
    @classmethod
    def check_splits(cls, v: List[Split]) -> List[Split]:
        return _validate_splits(v)


class ExpenseUpdate(BaseModel):
    date: Optional[datetime] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=200)
    splits: Optional[List[Split]] = None
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("splits")
    @classmethod
    def check_splits(cls, v: Optional[List[Split]]) -> Optional[List[Split]]:
        return v if v is None else _validate_splits(v)


# --- Ledger output -----------------------------------------------------------


class EntryOut(BaseModel):
    id: str
    kind: EntryKind
    date: datetime
    description: str
    total: int
    """Empty for income: an income is a lot, not a draw against one."""
    splits: List[Split] = []
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    goalId: Optional[str] = None
    note: Optional[str] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class IncomeOut(EntryOut):
    """An income plus its drawdown — how much of this earning is left."""

    spent: int = 0
    reserved: int = 0
    remaining: int = 0


# --- Goals -------------------------------------------------------------------


class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=500)
    targetValue: int = Field(gt=0)
    deadline: Optional[datetime] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)
    targetValue: Optional[int] = Field(default=None, gt=0)
    deadline: Optional[datetime] = None


class GoalOut(BaseModel):
    id: str
    name: str
    description: str = ""
    targetValue: int
    deadline: Optional[datetime] = None
    status: GoalStatus = "active"
    saved: int = 0
    """Which incomes are standing behind this goal."""
    breakdown: List[Split] = []
    completedAt: Optional[datetime] = None
    createdAt: Optional[datetime] = None


class ReserveIn(BaseModel):
    """Reserve from, or release back to, a single income."""

    incomeId: str
    amount: int = Field(gt=0)
    date: Optional[datetime] = None


class CompleteGoalIn(BaseModel):
    """
    Finalises a goal. Never triggered automatically — the user must click Complete.

    `splits` says which income each rupee of the purchase was actually spent from. It
    defaults to the goal's existing reservations when omitted.
    """

    actualAmount: int = Field(gt=0)
    date: Optional[datetime] = None
    description: Optional[str] = Field(default=None, max_length=200)
    categoryId: Optional[str] = None
    accountId: Optional[str] = None
    splits: Optional[List[Split]] = None

    @model_validator(mode="after")
    def check_splits_match_total(self) -> "CompleteGoalIn":
        if self.splits is not None:
            _validate_splits(self.splits)
            total = sum(s.amount for s in self.splits)
            if total != self.actualAmount:
                raise ValueError(
                    f"Split amounts total {total} but the purchase is {self.actualAmount}."
                )
        return self


# --- User settings -----------------------------------------------------------


class UserSettings(BaseModel):
    currency: str = Field(default="INR", min_length=3, max_length=3)
    locale: str = Field(default="en-IN", min_length=2, max_length=35)


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    settings: UserSettings = UserSettings()
