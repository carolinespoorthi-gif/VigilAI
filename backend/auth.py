from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

import json
import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel

from activity_store import _record_activity


# --------------------------------
# JWT Configuration
# --------------------------------

SECRET_KEY = "vigil-ai-secret-key-change-me-in-prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300


# --------------------------------
# File database
# --------------------------------

USER_DB_FILE = "users.json"


def load_users():
    if not os.path.exists(USER_DB_FILE):
        return {}

    with open(USER_DB_FILE, "r") as f:
        return json.load(f)


def save_users(users):
    with open(USER_DB_FILE, "w") as f:
        json.dump(users, f, indent=4)


fake_users_db: Dict[str, Dict] = load_users()


# --------------------------------
# Models
# --------------------------------

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "user"
    disabled: Optional[bool] = None


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    role: str = "user"


class LoginRequest(BaseModel):
    username: str
    password: str


router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# --------------------------------
# Password hashing
# --------------------------------

def get_password_hash(password: str):

    pwd_bytes = password.encode("utf-8")

    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]

    salt = bcrypt.gensalt()

    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str):

    try:
        pwd_bytes = plain_password.encode("utf-8")

        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]

        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))

    except Exception:
        return False


# --------------------------------
# Seed default users
# --------------------------------

async def seed_default_users():

    changed = False

    if "admin" not in fake_users_db:

        fake_users_db["admin"] = {
            "username": "admin",
            "email": "admin@vigil.ai",
            "full_name": "Admin User",
            "role": "admin",
            "hashed_password": get_password_hash("admin123"),
            "disabled": False,
        }

        changed = True

    if "user" not in fake_users_db:

        fake_users_db["user"] = {
            "username": "user",
            "email": "user@vigil.ai",
            "full_name": "Standard User",
            "role": "user",
            "hashed_password": get_password_hash("user123"),
            "disabled": False,
        }

        changed = True

    if changed:
        save_users(fake_users_db)


# --------------------------------
# Utility functions
# --------------------------------

async def get_user(username: str):

    if username in fake_users_db:

        return UserInDB(**fake_users_db[username])

    return None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=15)
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


# --------------------------------
# Auth dependencies
# --------------------------------

async def get_current_user(token: str = Depends(oauth2_scheme)):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username: str = payload.get("sub")
        role: str = payload.get("role")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = await get_user(username)

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):

    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")

    return current_user


# --------------------------------
# Login endpoints
# --------------------------------

@router.post("/login", response_model=Token)
async def login_json(creds: LoginRequest):

    user = await get_user(creds.username)

    if not user or not verify_password(creds.password, user.hashed_password):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
    }


# --------------------------------
# Register
# --------------------------------

@router.post("/register", response_model=User)
async def register_user(user: UserCreate):

    if user.username in fake_users_db:

        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(user.password)

    user_obj = UserInDB(
        username=user.username,
        email=user.email,
        role=user.role,
        hashed_password=hashed_password,
        disabled=False,
    )

    fake_users_db[user.username] = user_obj.model_dump()

    save_users(fake_users_db)

    return user_obj


# --------------------------------
# Reset Password
# --------------------------------

@router.post("/reset-password")
async def reset_password(data: dict):

    username = data.get("username")
    new_password = data.get("password")

    if username not in fake_users_db:
        raise HTTPException(status_code=404, detail="User not found")

    hashed = get_password_hash(new_password)

    fake_users_db[username]["hashed_password"] = hashed

    save_users(fake_users_db)

    return {"message": "Password reset successful"}


# --------------------------------
# Current user
# --------------------------------

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):

    return current_user