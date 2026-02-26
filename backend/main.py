import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
import goals
from crud import router as goals_router
import os

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL")

origins = [
    "https://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
# app.include_router(goals.router)
app.include_router(goals_router)

@app.get("/")
def read_root():
    return {"message": "Goal Tracker API v2"}

@app.get("/ping", tags=["Health"])
async def ping_server():
    return {"status": "awake", "message": "Goalie backend is active!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

