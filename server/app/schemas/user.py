from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import Field, field_validator, constr

from app.models.allotment import AllotmentStatus
from app.models.user import UserRole
from app.schemas.base import ORMModel


class UserSignupRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=255)


class UserSigninRequest(ORMModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1, max_length=255)


class RefreshRequest(ORMModel):
    refresh_token: str = Field(min_length=1)


class UserPublicResponse(ORMModel):
    id: UUID
    name: str
    email: str
    role: UserRole


class AuthResponse(ORMModel):
    success: bool = True
    message: str
    token: str
    refresh_token: str | None = None
    user: UserPublicResponse | None = None


class TokenResponse(ORMModel):
    success: bool = True
    token: str


class SignupResponse(ORMModel):
    success: bool = True
    message: str
    data: UserPublicResponse


class MemberCreateRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    panNo: str = Field(min_length=10, max_length=10)
    dob: date | None = None

    @field_validator("panNo")
    @classmethod
    def validate_pan(cls, value: str) -> str:
        normalized = value.strip().upper()
        if len(normalized) != 10 or not normalized.isalnum():
            raise ValueError("panNo must be a 10 character alphanumeric value")
        return normalized


class MemberResponse(ORMModel):
    id: UUID
    name: str
    pan_no: str
    dob: date | None


class MemberSignupResponse(ORMModel):
    success: bool = True
    message: str
    data: MemberResponse


class IPOCreateRequest(ORMModel):
    name: str = Field(min_length=1, max_length=255)
    value: str = Field(min_length=1, max_length=255)


class IPOResponse(ORMModel):
    id: UUID
    name: str
    value: str


class IPOCreateResponse(ORMModel):
    success: bool = True
    message: str
    data: IPOResponse


class IPOTriggerRequest(ORMModel):
    ipo_id: UUID


class RegistrarIPOOption(ORMModel):
    name: str 
    value: str


class AllotmentListItem(ORMModel):
    allotment_id: UUID
    master_account_owner: str | None = None
    member_friendly_name: str
    pan_num: str
    ipo_name: str
    status: AllotmentStatus
    updated_at: datetime


class AllotmentListResponse(ORMModel):
    success: bool = True
    data: list[AllotmentListItem]
    total: int | None = None
    page: int | None = None
    limit: int | None = None



class MemberListResponse(ORMModel):
    success: bool = True
    data: list[MemberResponse]


class AdminMemberListItem(ORMModel):
    id: UUID
    name: str
    pan_no: str
    dob: date | None
    owner_name: str | None = None


class AdminMemberListResponse(ORMModel):
    success: bool = True
    data: list[AdminMemberListItem]
    total: int | None = None
    page: int | None = None
    limit: int | None = None

