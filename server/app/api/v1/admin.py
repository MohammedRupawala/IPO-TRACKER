from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.broker.publisher import BrokerPublisher
from app.core.auth import get_admin_user
from app.core.db import get_db
from app.registrars.cameo import CameoRegistrarClient
from app.schemas.user import (
    AllotmentListItem,
    AllotmentListResponse,
    IPOCreateRequest,
    IPOCreateResponse,
    IPOResponse,
    IPOTriggerRequest,
    RegistrarIPOOption,
    AdminMemberListItem,
    AdminMemberListResponse,
)
from app.services.ipo_service import IpoService

router = APIRouter(prefix="/api/admin", tags=["admin"])
ipo_service = IpoService()
publisher = BrokerPublisher()


@router.get("/registrar-ipos", response_model=list[RegistrarIPOOption])
async def list_registrar_ipos(current_user=Depends(get_admin_user)):
    client = CameoRegistrarClient()
    try:
        options = await client.get_ipo_options()
        return [RegistrarIPOOption(name=o["name"], value=o["value"]) for o in options]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch IPO options from registrar: {exc}",
        ) from exc
    finally:
        await client.close()


@router.post("/ipos", response_model=IPOCreateResponse, status_code=status.HTTP_201_CREATED)
async def add_ipo(payload: IPOCreateRequest, current_user=Depends(get_admin_user), db=Depends(get_db)):
    try:
        ipo = await ipo_service.create(db, name=payload.name, value=payload.value)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="IPO name already exists") from exc
    return IPOCreateResponse(message="IPO successfully added", data=IPOResponse.model_validate(ipo))


@router.get("/ipos", response_model=list[IPOResponse])
async def list_ipos(current_user=Depends(get_admin_user), db=Depends(get_db)):
    ipos = await ipo_service.list_all(db)
    res = [IPOResponse.model_validate(ipo) for ipo in ipos]
    print("IPOS:", res)
    return res


@router.get("/user-allotment", response_model=AllotmentListResponse)
async def user_allotment(
    current_user=Depends(get_admin_user),
    db=Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1),
    pan: str | None = Query(default=None),
):
    pan_result = db.table("pan_table").select("name, pan_no, users(name)").execute()
    pan_map = {}
    for row in (pan_result.data or []):
        pan_no = row["pan_no"]
        user_data = row.get("users") or {}
        owner_name = user_data.get("name") or "Unknown"
        friendly_name = row["name"]
        if pan_no not in pan_map:
            pan_map[pan_no] = []
        pan_map[pan_no].append((friendly_name, owner_name))

    # 2. Fetch all allotment statuses
    result = db.table("allotment_status").select("id, pan_num, status, updated_at, ipos(name)").execute()
    
    rows = []
    for row in (result.data or []):
        pan_no = row["pan_num"]
        ipo_name = row.get("ipos", {}).get("name") if row.get("ipos") else "Unknown"
        mappings = pan_map.get(pan_no, [("Unknown", "Unknown")])
        for friendly_name, owner_name in mappings:
            rows.append(
                AllotmentListItem.model_validate(
                    {
                        "allotment_id": row["id"],
                        "master_account_owner": owner_name,
                        "member_friendly_name": friendly_name,
                        "pan_num": pan_no,
                        "ipo_name": ipo_name,
                        "status": row["status"],
                        "updated_at": row["updated_at"],
                    }
                )
            )

    if pan:
        rows = [r for r in rows if r.pan_num.upper() == pan.upper()]

    total = len(rows)
    start = (page - 1) * limit
    end = start + limit
    paginated_rows = rows[start:end]
    return AllotmentListResponse(data=paginated_rows, total=total, page=page, limit=limit)



@router.post("/allotments")
async def trigger_allotments(payload: IPOTriggerRequest, current_user=Depends(get_admin_user), db=Depends(get_db)):
    ipo = await ipo_service.repository.get_by_id(db, payload.ipo_id)
    if ipo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IPO not found")
    pan_result = db.table("pan_table").select("pan_no").execute()
    pan_numbers = sorted({row["pan_no"] for row in (pan_result.data or [])})
    for pan_no in pan_numbers:
        await publisher.publish_allotment_task({"ipo_id": str(ipo["id"]), "pan_num": pan_no, "company_value": ipo["value"]})
    db.table("ipos").update({"fetched_at": datetime.now(timezone.utc).isoformat()}).eq("id", payload.ipo_id).execute()
    return {"success": True, "message": "Async allotment background task successfully dispatched to workers for processing."}


@router.delete("/ipos/{ipo_id}", status_code=status.HTTP_200_OK)
async def delete_ipo(ipo_id: str, current_user=Depends(get_admin_user), db=Depends(get_db)):
    deleted = await ipo_service.delete(db, ipo_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IPO not found")
    return {"success": True, "message": "IPO deleted successfully"}


@router.get("/members", response_model=AdminMemberListResponse)
async def list_global_members(
    current_user=Depends(get_admin_user),
    db=Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1),
):
    result = db.table("pan_table").select("id, name, pan_no, dob, users(name)").execute()
    data = result.data or []

    rows = []
    for row in data:
        user_data = row.get("users") or {}
        owner_name = user_data.get("name") or "Unknown"
        rows.append(
            AdminMemberListItem(
                id=row["id"],
                name=row["name"],
                pan_no=row["pan_no"],
                dob=row["dob"],
                owner_name=owner_name,
            )
        )

    total = len(rows)
    start = (page - 1) * limit
    end = start + limit
    paginated_rows = rows[start:end]

    return AdminMemberListResponse(
        data=paginated_rows,
        total=total,
        page=page,
        limit=limit,
    )

