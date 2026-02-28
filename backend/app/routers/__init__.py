# Lumina Life OS — Routers Package
from app.routers.auth import router as auth_router
from app.routers.memories import router as memories_router
from app.routers.wellness import router as wellness_router
from app.routers.tasks import router as tasks_router
from app.routers.vault import router as vault_router
from app.routers.journal import router as journal_router
from app.routers.ai_chat import router as ai_chat_router

__all__ = [
    "auth_router",
    "memories_router",
    "wellness_router",
    "tasks_router",
    "vault_router",
    "journal_router",
    "ai_chat_router",
]
