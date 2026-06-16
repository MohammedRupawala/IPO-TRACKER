from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.core.db import get_db
from app.schemas.user import AllotmentListItem, AllotmentListResponse, MemberCreateRequest, MemberResponse, MemberSignupResponse, MemberListResponse
from app.services.allotment_service import AllotmentService
from app.repositories.member_repo import MemberRepository

router = APIRouter(prefix="/api/users", tags=["user"])
member_repo = MemberRepository()
allotment_service = AllotmentService()


@router.post("/add-members", response_model=MemberSignupResponse, status_code=status.HTTP_201_CREATED)
async def add_member(payload: MemberCreateRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    member = {
        "parent_id": current_user["id"],
        "name": payload.name,
        "pan_no": payload.panNo,
        "dob": payload.dob.isoformat() if payload.dob else None,
    }
    try:
        member = await member_repo.create(db, member)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This PAN is already being tracked in your account.") from exc
    return MemberSignupResponse(message="Member successfully added to your portfolio tracker.", data=MemberResponse.model_validate(member))

@router.get("/list-members", response_model=MemberListResponse)
async def list_members(current_user=Depends(get_current_user), db=Depends(get_db)):
    members = await member_repo.list_by_parent(db, current_user["id"])
    return MemberListResponse(data=[MemberResponse.model_validate(member) for member in members])


@router.get("/see-allotment", response_model=AllotmentListResponse)
async def see_allotment(current_user=Depends(get_current_user), db=Depends(get_db), ipo_id: str | None = Query(default=None)):
    pan_result = db.table("pan_table").select("name, pan_no").eq("parent_id", current_user["id"]).execute()
    pan_data = pan_result.data or []
    if not pan_data:
        return AllotmentListResponse(data=[])

    pan_to_name = {row["pan_no"]: row["name"] for row in pan_data}
    pan_list = list(pan_to_name.keys())

    query = db.table("allotment_status").select("id, pan_num, status, updated_at, ipos(name)").in_("pan_num", pan_list)
    if ipo_id:
        query = query.eq("ipo_id", ipo_id)
    result = query.execute()

    rows = []
    for row in (result.data or []):
        ipo_name = row.get("ipos", {}).get("name") if row.get("ipos") else "Unknown"
        rows.append(
            AllotmentListItem.model_validate(
                {
                    "allotment_id": row["id"],
                    "member_friendly_name": pan_to_name.get(row["pan_num"], "Unknown"),
                    "pan_num": row["pan_num"],
                    "ipo_name": ipo_name,
                    "status": row["status"],
                    "updated_at": row["updated_at"],
                }
            )
        )
    return AllotmentListResponse(data=rows)


@router.delete("/members/{member_id}", status_code=status.HTTP_200_OK)
async def delete_member(member_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    deleted = await member_repo.delete(db, member_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found or not authorized")
    return {"success": True, "message": "Member deleted successfully"}


