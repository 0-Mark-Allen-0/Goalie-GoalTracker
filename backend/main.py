import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from database import create_indexes
from entries import router as entries_router
from goals import router as goals_router
from labels import router as labels_router

FRONTEND_URL = os.getenv("FRONTEND_URL")

origins = [
    origin
    for origin in [
        "https://localhost:5173",
        "http://localhost:5173",
        "http://localhost:3000",
        FRONTEND_URL,
    ]
    if origin
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_indexes() previously existed but was never awaited, so none of the
    # indexes were ever built. This is where that gets fixed.
    try:
        await create_indexes()
    except Exception as exc:  # noqa: BLE001 - never block startup on index creation
        print(f"[startup] index creation skipped: {exc}")
    yield


app = FastAPI(title="Goalie API", version="3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(labels_router)
app.include_router(entries_router)
app.include_router(goals_router)


@app.get("/")
def read_root():
    return {"message": "Goalie API v3 - income-attributed money tracking"}


@app.get("/ping", tags=["Health"])
async def ping_server():
    return {"status": "awake", "message": "Goalie backend is active!"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
