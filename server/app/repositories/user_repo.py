from __future__ import annotations

from typing import Any


class UserRepository:
    async def get_by_email(self, db: Any, email: str) -> dict[str, Any] | None:
        response = db.table("users").select("*").eq("email", email).limit(1).execute()
        rows = response.data or []
        return rows[0] if rows else None

    async def get_by_id(self, db: Any, user_id: str) -> dict[str, Any] | None:
        response = db.table("users").select("*").eq("id", user_id).limit(1).execute()
        rows = response.data or []
        return rows[0] if rows else None

    async def create(self, db: Any, user: dict[str, Any]) -> dict[str, Any]:
        response = db.table("users").insert(user).select("*").execute()
        rows = response.data or []
        if not rows:
            raise ValueError("Failed to create user")
        return rows[0]
