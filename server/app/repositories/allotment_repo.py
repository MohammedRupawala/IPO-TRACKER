from __future__ import annotations

from typing import Any


class AllotmentRepository:
    async def list_global(self, db: Any, page: int | None = None, limit: int | None = None) -> tuple[list[dict[str, Any]], int]:
        # 1. Fetch all PAN mappings from pan_table along with the user's name
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
        
        total = len(rows)
        if page is not None and limit is not None:
            start = (page - 1) * limit
            end = start + limit
            rows = rows[start:end]
        return rows, total

