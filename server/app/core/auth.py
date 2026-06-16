from __future__ import annotations

import jwt
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from fastapi import Depends, HTTPException, Request, status
import hashlib
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.db import get_db
from app.models.user import UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenKind(str, Enum):
    access = "access"
    refresh = "refresh"


class TokenSubject(BaseModel):
    user_id: str = Field(min_length=1)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: str = Field(min_length=1)


class TokenCreateParams(BaseModel):
    subject: TokenSubject
    expires_delta: timedelta
    token_type: TokenKind


class TokenPairParams(BaseModel):
    subject: TokenSubject


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def sha256_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    # First reduce to fixed-length SHA-256 output
    hashed = sha256_hash(password)
    return pwd_context.hash(hashed)


def verify_password(password: str, password_hash: str) -> bool:
    hashed = sha256_hash(password)
    return pwd_context.verify(hashed, password_hash)


def _create_token(params: TokenCreateParams) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "user_id": params.subject.user_id,
        "email": params.subject.email,
        "role": params.subject.role,
        "token_type": params.token_type.value,
        "iat": int(now.timestamp()),
        "exp": int((now + params.expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(
    *,
    user_id: str | None = None,
    email: str | None = None,
    role: str | None = None,
    subject: TokenSubject | None = None,
) -> str:
    token_subject = subject or TokenSubject(user_id=user_id or "", email=email or "", role=role or "")
    return _create_token(
        TokenCreateParams(
            subject=token_subject,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            token_type=TokenKind.access,
        )
    )


def create_refresh_token(
    *,
    user_id: str | None = None,
    email: str | None = None,
    role: str | None = None,
    subject: TokenSubject | None = None,
) -> str:
    token_subject = subject or TokenSubject(user_id=user_id or "", email=email or "", role=role or "")
    return _create_token(
        TokenCreateParams(
            subject=token_subject,
            expires_delta=timedelta(minutes=settings.refresh_token_expire_minutes),
            token_type=TokenKind.refresh,
        )
    )


def create_token_pair(params: TokenPairParams) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(subject=params.subject),
        refresh_token=create_refresh_token(subject=params.subject),
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def build_token_subject(
        *, 
        user_id: str, 
        email: str, 
        role: str
        ) -> TokenSubject:
    return TokenSubject(
        user_id=user_id, 
        email=email, 
        role=role
        )


async def get_current_user(
    request: Request,
    db=Depends(get_db),
) -> dict[str, Any]:
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOKEN_EXPIRED",
        )

    try:
        payload = decode_token(access_token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOKEN_EXPIRED",
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token") from exc

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    response = db.table("users").select("*").eq("id", user_id).limit(1).execute()
    rows = response.data or []
    user = rows[0] if rows else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_admin_user(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if str(current_user.get("role")) != UserRole.admin.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrative privileges required")
    return current_user
"""
========================================================================
SECURITY MIDDLEWARE & TOKEN GENERATION LAYER SPECIFICATION
========================================================================
This module establishes the authentication layer, role-based route guardrails, 
and automatic silent token re-issuance using a sliding refresh token window.
========================================================================

1. BASE AUTHENTICATION MIDDLEWARE (is_authenticated)
   - Behavior: Intercepts incoming requests on protected endpoints.
   - Core Workflow:
     1. Read the HTTP 'Authorization' header. Verify it follows the 'Bearer <JWT_TOKEN>' format.
     2. Attempt to decode and verify the Access JWT token using the system's SECRET_KEY.
     3. Case A: Token is valid and unexpired.
        - Extract claims: user_id, email, role.
        - Attach the claims to the request context (e.g., request.state.user) so subsequent handlers can access them.
        - Allow the request to proceed to the next handler.
     4. Case B: Token is expired (JWT ExpiredSignatureError) OR missing.
        - DO NOT crash. Halt execution immediately and return HTTP 401 Unauthorized.
        - Response Body: { "success": false, "error": "TOKEN_EXPIRED", "message": "Access token has expired." }

2. DUAL-STRATEGY TOKEN RE-ISSUANCE HANDLER (Silent Auto-Refresh Flow)
   - Context: When a client intercepts an HTTP 401 "TOKEN_EXPIRED" response on the frontend, it hits this endpoint automatically before retrying the failed request.
   - Endpoint: POST /api/auth/refresh-token
   - Request Header/Body: Accepts "refresh_token" from a secure cookie or the JSON body payload.
   - Core Workflow:
     1. Validate the signature, structural integrity, and expiration date of the long-lived Refresh Token.
     2. Query the 'users' table using the 'user_id' embedded within the Refresh Token claims.
     3. If the user profile is active and found:
        - Generate a brand-new, short-lived Access JWT Token containing the updated user claims.
        - Option: Implement sliding rotation (issue a fresh refresh token alongside it, invalidating the old one).
   - Response Schema (Success 200 OK):
     {
       "success": true,
       "token": "new_eyJhbGciOi..."
     }

3. ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
   These guardrails run sequentially *after* the base authentication middleware completes successfully.

   A. REQUIRE NORMAL USER (require_user_role)
      - Behavior: Inspects the verified request context (request.state.user).
      - Core Workflow:
        - If user.role matches 'user' OR 'admin', allow the call to execute.
        - If missing or structurally altered, return HTTP 403 Forbidden: 
          { "success": false, "message": "Access denied. Standard account authorization required." }

   B. REQUIRE ADMIN PRIVILEGES (require_admin_role)
      - Behavior: Secures administrative controls from privilege escalation attacks.
      - Core Workflow:
        - Read user.role from request context.
        - If user.role DOES NOT strictly equal 'admin', terminate execution immediately.
        - Return HTTP 403 Forbidden: 
          { "success": false, "message": "Access denied. Administrative privileges required." }
"""