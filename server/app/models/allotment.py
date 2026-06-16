from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AllotmentStatus(str, Enum):
    Awaited = "Awaited"
    Allotted = "Allotted"
    Not_Allotted = "Not-Allotted"
    Not_Applied = "Not-Applied"


class AllotmentStatusRecord(Base):
    __tablename__ = "allotment_status"
    __table_args__ = (
        UniqueConstraint("ipo_id", "pan_num", name="unique_ipo_pan_result"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ipo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ipos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pan_num: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    status: Mapped[AllotmentStatus] = mapped_column(
        SAEnum(AllotmentStatus, name="allotment_status_enum", create_type=False),
        nullable=False,
        default=AllotmentStatus.Awaited,
        server_default=AllotmentStatus.Awaited.value,
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ipo = relationship("Ipo", back_populates="allotments")