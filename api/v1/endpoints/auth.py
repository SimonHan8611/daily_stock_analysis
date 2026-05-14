# -*- coding: utf-8 -*-
"""Authentication endpoints for Web admin login."""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from api.deps import get_db, get_current_user, require_role
from src.storage import User, Role
from src.services.auth_service import get_password_hash, verify_password, create_access_token
from src.auth import COOKIE_NAME, SESSION_MAX_AGE_HOURS_DEFAULT, check_rate_limit, clear_rate_limit, record_login_failure, get_client_ip

logger = logging.getLogger(__name__)

router = APIRouter()

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(None)
    password: str = Field(..., min_length=6)
    password_confirm: str = Field(..., alias="passwordConfirm")

class LoginRequest(BaseModel):
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

class UserInfoResponse(BaseModel):
    id: int
    username: str
    email: str | None
    role: str
    is_active: bool

def _set_jwt_cookie(response: Response, token: str, request: Request) -> None:
    """Attach the JWT session cookie to a response."""
    secure = False
    if os.getenv("TRUST_X_FORWARDED_FOR", "false").lower() == "true":
        proto = request.headers.get("X-Forwarded-Proto", "").lower()
        secure = proto == "https"
    else:
        secure = request.url.scheme == "https"

    try:
        max_age_hours = int(os.getenv("ADMIN_SESSION_MAX_AGE_HOURS", str(SESSION_MAX_AGE_HOURS_DEFAULT)))
    except ValueError:
        max_age_hours = SESSION_MAX_AGE_HOURS_DEFAULT
    max_age = max_age_hours * 3600

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # Allow working correctly on local IP and without HTTPS. Production should use secure=True over HTTPS.
        path="/",
        max_age=max_age,
    )

@router.post("/register", summary="Register a new user")
async def register_user(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. The first user gets 'admin' role, others get 'user' role."""
    client_ip = get_client_ip(request)
    logger.info(f"[Auth] Registration attempt for username: '{body.username}', email: '{body.email}' from IP: {client_ip}")

    if body.password != body.password_confirm:
        logger.warning(f"[Auth] Registration failed for '{body.username}': Passwords do not match.")
        return JSONResponse(status_code=400, content={"error": "password_mismatch", "message": "Passwords do not match"})
        
    existing_user = db.execute(select(User).where(User.username == body.username)).scalar_one_or_none()
    if existing_user:
        logger.warning(f"[Auth] Registration failed: Username '{body.username}' already exists.")
        return JSONResponse(status_code=400, content={"error": "username_taken", "message": "Username already exists"})
        
    # Check if this is the first user
    user_count = db.execute(select(func.count(User.id))).scalar()
    role_name = "admin" if user_count == 0 else "user"
    logger.info(f"[Auth] Total existing users: {user_count}. Assigning role '{role_name}' to new user '{body.username}'.")
    
    role = db.execute(select(Role).where(Role.name == role_name)).scalar_one_or_none()
    if not role:
        logger.error(f"[Auth] Critical error: Role '{role_name}' not found in database during registration.")
        return JSONResponse(status_code=500, content={"error": "internal_error", "message": f"Role {role_name} not found"})
        
    new_user = User(
        username=body.username,
        email=body.email,
        password_hash=get_password_hash(body.password),
        role_id=role.id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    
    logger.info(f"[Auth] Registration successful for '{body.username}'. Assigned ID: {new_user.id}, Role: {role_name}.")
    return JSONResponse(status_code=201, content={"message": "User registered successfully", "user_id": new_user.id})

@router.post("/login", summary="Login with username and password")
async def login_user(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and set JWT cookie."""
    ip = get_client_ip(request)
    logger.info(f"[Auth] Login attempt for username: '{body.username}' from IP: {ip}")

    if not check_rate_limit(ip):
        logger.warning(f"[Auth] Login rate limited for IP: {ip}. Too many failed attempts.")
        return JSONResponse(status_code=429, content={"error": "rate_limited", "message": "Too many failed attempts. Please try again later."})
        
    user = db.execute(select(User).options(joinedload(User.role)).where(User.username == body.username)).scalar_one_or_none()
    
    if not user or not verify_password(body.password, user.password_hash):
        record_login_failure(ip)
        logger.warning(f"[Auth] Login failed for '{body.username}' from IP: {ip}: Invalid credentials.")
        return JSONResponse(status_code=401, content={"error": "invalid_credentials", "message": "Invalid username or password"})
        
    if not user.is_active:
        logger.warning(f"[Auth] Login failed for '{body.username}' from IP: {ip}: Account is disabled.")
        return JSONResponse(status_code=403, content={"error": "account_disabled", "message": "Account is disabled"})
        
    clear_rate_limit(ip)
    
    # Generate JWT
    token_data = {"sub": str(user.id), "username": user.username, "role": user.role.name}
    token = create_access_token(token_data)
    
    resp = JSONResponse(content={"ok": True, "message": "Login successful"})
    _set_jwt_cookie(resp, token, request)
    logger.info(f"[Auth] Login successful for '{body.username}' (User ID: {user.id}, Role: {user.role.name}). JWT cookie set.")
    return resp

@router.get("/me", summary="Get current user info", response_model=UserInfoResponse)
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return info about the currently logged-in user."""
    user_id = current_user.get("user_id")
    logger.debug(f"[Auth] Fetching profile for User ID: {user_id}")
    user = db.execute(select(User).options(joinedload(User.role)).where(User.id == int(user_id))).scalar_one_or_none()
    if not user:
        logger.error(f"[Auth] Failed to fetch profile: User ID {user_id} not found in database.")
        raise HTTPException(status_code=404, detail="User not found")
        
    return UserInfoResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role.name,
        is_active=user.is_active
    )

@router.post("/logout", summary="Logout")
async def auth_logout(request: Request):
    """Clear JWT session cookie."""
    user_id = getattr(request.state, "user_id", "unknown")
    logger.info(f"[Auth] Logout requested for User ID: {user_id}. Clearing cookie '{COOKIE_NAME}'.")
    resp = Response(status_code=204)
    resp.delete_cookie(key=COOKIE_NAME, path="/")
    return resp

@router.get("/status", summary="Get authentication status")
async def auth_status(request: Request):
    """Check if the user is logged in (used by frontend to determine layout)."""
    user_id = getattr(request.state, "user_id", None)
    return JSONResponse(content={
        "authEnabled": True, # RBAC is always enabled now
        "loggedIn": user_id is not None,
        "role": getattr(request.state, "role", None),
        "username": getattr(request.state, "username", None)
    })

@router.get("/users", summary="List all users (Admin only)")
async def list_users(db: Session = Depends(get_db), current_user: dict = Depends(require_role(["admin"]))):
    """Return a list of all registered users."""
    users = db.execute(select(User).options(joinedload(User.role)).order_by(User.id)).scalars().all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role.name, "is_active": u.is_active, "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]

@router.patch("/users/{user_id}/status", summary="Toggle user active status (Admin only)")
async def toggle_user_status(user_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_role(["admin"]))):
    """Enable or disable a user account."""
    body = await request.json()
    is_active = body.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=400, detail="Missing 'is_active' field")
        
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == int(current_user["user_id"]):
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
        
    user.is_active = is_active
    db.commit()
    return {"message": "User status updated", "is_active": user.is_active}
