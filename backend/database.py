# FULL REWRITE - Introducing Motor, an async MongoDB driver, to work with FastAPI's async capabilities
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_CLIENT = os.getenv("MONGO_CLIENT")
# Hooking up to the Atlas Cluster with AsyncIOMotorClient, which is the async version of MongoClient
client = AsyncIOMotorClient(MONGO_CLIENT)

db = client["goal_app"]

users_collection = db["users"]
goals_collection = db["goals"]
buckets_collection = db["buckets"]

# NEW - Create compound indexes for better performance
async def create_indexes():
    await buckets_collection.create_index("user_id")
    await goals_collection.create_index([("user_id", 1), ("bucket_id", 1)])