from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.instances import router as instances_router
from app.api.v1.billing import router as billing_router
from app.api.v1.admin import router as admin_router
from app.api.v1.templates import router as templates_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(instances_router)
api_router.include_router(billing_router)
api_router.include_router(admin_router)
api_router.include_router(templates_router)
