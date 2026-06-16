from __future__ import annotations

from typing import Any

from app.core.auth import TokenPairParams, build_token_subject, create_token_pair, hash_password, verify_password
from app.repositories.user_repo import UserRepository


class UserService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or UserRepository()

    async def signup(self, db: Any, *, name: str, email: str, password: str) -> dict[str, Any]:
        existing = await self.repository.get_by_email(db, email)
        if existing:
            raise ValueError("Email already registered")
        user = {
            "name": name, 
            "email": email, 
            "password_hash": hash_password(password), 
            "role": "user"
            }
        return await self.repository.create(db, user)

    async def authenticate(self, db: Any, *, email: str, password: str) -> dict[str, Any]:
        user = await self.repository.get_by_email(db, email)
        if user is None or not verify_password(password, user["password_hash"]):
            raise ValueError("Invalid credentials")
        return user

    def issue_tokens(self, user: dict[str, Any]) -> tuple[str, str]:
        subject = build_token_subject(
            user_id=str(user["id"]),
            email=str(user["email"]),
            role=str(user["role"]),
        )

        token_pair_params = TokenPairParams(subject=subject)
        
        token_pair = create_token_pair(
            params=token_pair_params
        )
        return token_pair.access_token, token_pair.refresh_token
