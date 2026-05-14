# -*- coding: utf-8 -*-
"""
Auth middleware: protect /api/v1/* and inject user info into request.state.
"""

from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.auth import COOKIE_NAME, is_auth_enabled
from src.services.auth_service import decode_access_token

logger = logging.getLogger(__name__)

EXEMPT_PATHS = frozenset({
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/status",
    "/api/health",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
})


def _path_exempt(path: str) -> bool:
    """Check if path is exempt from auth."""
    normalized = path.rstrip("/") or "/"
    return normalized in EXEMPT_PATHS


class AuthMiddleware(BaseHTTPMiddleware):
    """Require valid JWT session for /api/v1/* and inject user data."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ):
        # Always initialize user context
        request.state.user_id = None
        request.state.role = None
        request.state.username = None

        path = request.url.path
        
        # Try to extract user from cookie regardless of exemption (useful for /auth/status)
        cookie_val = request.cookies.get(COOKIE_NAME)
        if cookie_val:
            payload = decode_access_token(cookie_val)
            if payload:
                request.state.user_id = payload.get("sub")
                request.state.role = payload.get("role")
                request.state.username = payload.get("username")
                logger.debug(f"[AuthMiddleware] Parsed JWT. user_id={request.state.user_id}, role={request.state.role}")
            else:
                logger.warning(f"[AuthMiddleware] Found '{COOKIE_NAME}' but failed to decode/validate JWT.")
        else:
            if path.startswith("/api/v1/") and not _path_exempt(path):
                logger.warning(f"[AuthMiddleware] Missing '{COOKIE_NAME}' cookie for protected path: {path}")

        if not is_auth_enabled():
            # If auth is disabled globally via env, we don't enforce blocking,
            # but we still parsed the user if they had a cookie.
            return await call_next(request)

        if _path_exempt(path):
            return await call_next(request)

        if not path.startswith("/api/v1/"):
            return await call_next(request)

        # If it's an API route and we didn't find a valid user_id
        if not request.state.user_id:
            logger.warning(f"[AuthMiddleware] Rejecting request to '{path}': No valid user context.")
            return JSONResponse(
                status_code=401,
                content={
                    "error": "unauthorized",
                    "message": "Login required",
                },
            )

        return await call_next(request)


def add_auth_middleware(app):
    """Add auth middleware to protect API routes.

    The middleware is always registered; whether auth is enforced is determined
    at request time by is_auth_enabled() so the decision stays consistent across
    any runtime configuration reload.
    """
    app.add_middleware(AuthMiddleware)
