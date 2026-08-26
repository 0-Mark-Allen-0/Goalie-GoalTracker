# backend/database.py
# Motor (async MongoDB driver) wiring for the FastAPI app.
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_CLIENT = os.getenv("MONGO_CLIENT")
client = AsyncIOMotorClient(MONGO_CLIENT)

db = client["goal_app"]

users_collection = db["users"]
goals_collection = db["goals"]
entries_collection = db["entries"]
labels_collection = db["labels"]


async def create_indexes():
    """Awaited from main.py's lifespan handler on startup."""
    await goals_collection.create_index([("userId", 1), ("status", 1)])
    await labels_collection.create_index([("userId", 1), ("kind", 1), ("archived", 1)])

    # The ledger carries every read path, so it gets the most attention.
    await entries_collection.create_index([("userId", 1), ("kind", 1), ("date", -1)])
    await entries_collection.create_index([("userId", 1), ("splits.incomeId", 1)])
    await entries_collection.create_index([("userId", 1), ("goalId", 1)])
    await entries_collection.create_index([("userId", 1), ("date", -1)])
    await entries_collection.create_index([("userId", 1), ("completionId", 1)])
