from __future__ import annotations

from typing import Any


class MemberRepository:
    async def create(self, db: Any, member: dict[str, Any]) -> dict[str, Any]:
        response = db.table("pan_table").insert(member).select("*").execute()
        rows = response.data or []
        if not rows:
            raise ValueError("Failed to create member")
        return rows[0]

    async def list_by_parent(self, db: Any, parent_id: str):
        response = db.table("pan_table").select("*").eq("parent_id", parent_id).execute()
        return response.data or []

    async def delete(self, db: Any, member_id: str, parent_id: str) -> bool:
        # Get the PAN before deleting the member
        member_response = db.table("pan_table").select("pan_no").eq("id", member_id).eq("parent_id", parent_id).execute()
        member_data = member_response.data or []
        if not member_data:
            return False
        pan_no = member_data[0]["pan_no"]

        # Delete the member
        response = db.table("pan_table").delete().eq("id", member_id).eq("parent_id", parent_id).execute()
        deleted = len(response.data or []) > 0

        if deleted:
            # Check if any other user is tracking this PAN
            others = db.table("pan_table").select("id").eq("pan_no", pan_no).execute().data
            if not others:
                # No other user is tracking this PAN, clean up its allotments
                db.table("allotment_status").delete().eq("pan_num", pan_no).execute()

        return deleted

