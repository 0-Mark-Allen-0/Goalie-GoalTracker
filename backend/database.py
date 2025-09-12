from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()

# UPDATE - Introducing User login through Google - Using a Mongo collection to store users
# UPDATE 1.5 - Mongo client moved to .env file

MONGO_CLIENT = os.getenv("MONGO_CLIENT")
client = MongoClient(MONGO_CLIENT)
# client = MongoClient("mongodb+srv://allenmark2005:085af178@cluster0.bqvuzaz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")

db = client["goal_app"]

# NEW
users_collection = db["users"]
goals_collection = db["goals"]