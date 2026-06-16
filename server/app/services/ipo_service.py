from __future__ import annotations

from typing import Any

from app.repositories.ipo_repo import IpoRepository


class IpoService:
    def __init__(self, repository: IpoRepository | None = None) -> None:
        self.repository = repository or IpoRepository()

    async def list_all(self, db: Any):
        return await self.repository.list_all(db)
    async def create(self, db: Any, *, name: str, value: str) -> dict[str, Any]:
        return await self.repository.create(db, {"name": name, "value": value})

    async def delete(self, db: Any, ipo_id: str) -> bool:
        return await self.repository.delete(db, ipo_id)

