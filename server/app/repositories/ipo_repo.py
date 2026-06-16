from __future__ import annotations

from typing import Any


class IpoRepository:
    async def create(self, db: Any, ipo: dict[str, Any]) -> dict[str, Any]:
        response = db.table("ipos").insert(ipo).select("*").execute()
        rows = response.data or []
        if not rows:
            raise ValueError("Failed to create IPO")
        return rows[0]

    async def get_by_id(self, db: Any, ipo_id: str) -> dict[str, Any] | None:
        response = db.table("ipos").select("*").eq("id", ipo_id).limit(1).execute()
        rows = response.data or []
        return rows[0] if rows else None

    async def list_all(self, db: Any):
        response = db.table("ipos").select("*").execute()
        return response.data or []

    async def delete(self, db: Any, ipo_id: str) -> bool:
        response = db.table("ipos").delete().eq("id", ipo_id).execute()
        return len(response.data or []) > 0

