from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.auth import build_token_subject, create_access_token, decode_token
from app.core.config import settings
from app.core.db import get_db
from app.schemas.user import AuthResponse, RefreshRequest, SignupResponse, TokenResponse, UserPublicResponse, UserSigninRequest, UserSignupRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["auth"])
service = UserService()


def cookie_kwargs() -> dict:
    return {
        "httponly": True, 
        "secure": settings.cookie_secure, 
        "samesite": "lax", 
        "path": "/"
        }


def build_user_response(user: dict) -> UserPublicResponse:
    return UserPublicResponse.model_validate(user)


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignupRequest, db=Depends(get_db)):
    try:
        user = await service.signup(
            db, 
            name=payload.name, 
            email=payload.email, 
            password=payload.password
            )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(exc)
            ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to create user account"
            ) from exc
    return SignupResponse(
        message="User account created successfully", 
        data=build_user_response(user)
        )


@router.post("/signin", response_model=AuthResponse)
async def signin(payload: UserSigninRequest, response: Response, db=Depends(get_db)):
    try:
        user = await service.authenticate(db, email=payload.email, password=payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc
    access_token, refresh_token = service.issue_tokens(user)
    response.set_cookie(key="access_token", value=access_token, **cookie_kwargs())
    response.set_cookie(key="refresh_token", value=refresh_token, **cookie_kwargs())
    return AuthResponse(message="Authentication successful", token=access_token, refresh_token=refresh_token, user=build_user_response(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response, payload: RefreshRequest | None = None, db=Depends(get_db)):
    token = request.cookies.get("refresh_token") or (payload.refresh_token if payload else None)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    try:
        decoded = decode_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if decoded.get("token_type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await service.repository.get_by_email(db, decoded["email"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access_token = create_access_token(
        subject=build_token_subject(
            user_id=str(user["id"]),
            email=str(user["email"]),
            role=str(user["role"]),
        )
    )
    if response is not None:
        response.set_cookie(key="access_token", value=access_token, **cookie_kwargs())
    return TokenResponse(token=access_token)


@router.post("/signout")
async def signout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"success": True, "message": "Logged out successfully"}

