from collections.abc import AsyncGenerator
from functools import lru_cache

from app.core.config import settings
from supabase import Client, create_client


@lru_cache
def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase credentials are not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_db() -> AsyncGenerator[Client, None]:
    yield get_supabase_client()