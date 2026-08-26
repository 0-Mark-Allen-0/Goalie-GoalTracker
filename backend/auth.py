# UPDATE - Improving url encoding
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Cookie
from fastapi.responses import JSONResponse, RedirectResponse
import requests
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from bson import ObjectId
from database import users_collection
from models import UserSettings

# UPDATE - dotenv package fix
import os
from dotenv import load_dotenv
load_dotenv()
# -----------------------------------


router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "supersecret")
JWT_ALGORITHM = "HS256"
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

# NEW
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# print(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

# Create JWT token
def create_jwt (user: dict):
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=300),
    }
    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


# Fetch the user through JWT
def get_current_user (jwt_token: str = Cookie(None)):
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Could not validate credentials.")
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid or expired token.")

# NEW - Updated google/login endpoint
@router.get("/google/login")
async def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")

    params =  {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }

    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=google_url)

# NEW - Updated google/callback endpoint
@router.get("/google/callback")
async def google_callback (code: str):
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code not provided.")

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    try:
        r = requests.post(token_url, data=data)
        r.raise_for_status()
        tokens = r.json()
    except requests.exceptions.RequestException as e:
        # Extract the actual JSON error from Google
        error_body = e.response.text if e.response is not None else str(e)
        print(f"GOOGLE OAUTH ERROR: {error_body}") # This will print in your terminal
        raise HTTPException(status_code=400, detail=f"Failed to exchange code for token: {error_body}")

    try:
        user_response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user_response.raise_for_status()
        user_info = user_response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to get user info: {str(e)}")

    existing = await users_collection.find_one({"email": user_info["email"]})
    if not existing:
        user_doc = {
            "email": user_info["email"],
            "name": user_info["name"],
            "google_id": user_info["sub"],
        }

        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        existing = user_doc

    # Seeded here so a brand-new account has usable category lists straight away.
    from labels import seed_default_labels

    await seed_default_labels(str(existing["_id"]))

    jwt_token = create_jwt(existing)
    # response = RedirectResponse(url="http://localhost:5173/dashboard")
    response = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
    response.set_cookie(
        key="jwt_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="none",
    )

    return response

DEFAULT_SETTINGS = {"currency": "INR", "locale": "en-IN"}


def _user_out(db_user: dict) -> dict:
    settings = {**DEFAULT_SETTINGS, **(db_user.get("settings") or {})}
    return {
        "id": str(db_user["_id"]),
        "email": db_user["email"],
        "name": db_user.get("name"),
        "settings": settings,
    }


@router.get("/me")
async def get_me(user = Depends(get_current_user)):
    db_user = await users_collection.find_one({"_id": ObjectId(user["sub"])})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(db_user)


@router.put("/settings")
async def update_settings(payload: UserSettings, user = Depends(get_current_user)):
    """Currency and locale are display-only: changing them never converts stored amounts."""
    await users_collection.update_one(
        {"_id": ObjectId(user["sub"])},
        {"$set": {"settings": payload.model_dump()}},
    )
    db_user = await users_collection.find_one({"_id": ObjectId(user["sub"])})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(db_user)


# NEW - Logout endpoint
@router.post("/logout")
async def logout():
    # Returns JSON rather than a redirect so the SPA can navigate itself; the delete
    # must repeat the flags the cookie was set with or the browser ignores it.
    response = JSONResponse(content={"message": "Logged out."})
    response.delete_cookie(key="jwt_token", path="/", secure=True, samesite="none")
    return response
