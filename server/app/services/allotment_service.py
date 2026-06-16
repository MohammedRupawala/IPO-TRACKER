from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.allotment_repo import AllotmentRepository


class AllotmentService:
    def __init__(self, repository: AllotmentRepository | None = None) -> None:
        self.repository = repository or AllotmentRepository()

    async def list_global(self, db: AsyncSession, page: int | None = None, limit: int | None = None):
        return await self.repository.list_global(db, page, limit)

