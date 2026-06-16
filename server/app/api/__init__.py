from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.user import router as user_router

__all__ = ["admin_router", "auth_router", "user_router"]