"""Main v1 router aggregating all modular endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.ai import router as ai_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.configurations import router as configurations_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.devices import router as devices_router
from app.api.v1.eve_ng import router as eve_ng_router
from app.api.v1.executions import router as executions_router
from app.api.v1.labs import router as labs_router
from app.api.v1.learning import router as learning_router
from app.api.v1.looking_glass import router as looking_glass_router
from app.api.v1.monitoring import router as monitoring_router
from app.api.v1.packets import router as packets_router
from app.api.v1.reports import router as reports_router
from app.api.v1.security import router as security_router
from app.api.v1.settings import router as settings_router
from app.api.v1.topologies import router as topologies_router
from app.api.v1.troubleshooting import router as troubleshooting_router
from app.api.v1.users import router as users_router
from app.api.v1.verification import router as verification_router
from app.api.v1.vision import router as vision_router
from app.api.v1.vmware import router as vmware_router
from app.api.v1.voice import router as voice_router

api_v1_router = APIRouter()

api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(voice_router)
api_v1_router.include_router(vision_router)
api_v1_router.include_router(topologies_router)
api_v1_router.include_router(labs_router)
api_v1_router.include_router(eve_ng_router)
api_v1_router.include_router(vmware_router)
api_v1_router.include_router(devices_router)
api_v1_router.include_router(configurations_router)
api_v1_router.include_router(executions_router)
api_v1_router.include_router(verification_router)
api_v1_router.include_router(troubleshooting_router)
api_v1_router.include_router(monitoring_router)
api_v1_router.include_router(packets_router)
api_v1_router.include_router(security_router)
api_v1_router.include_router(learning_router)
api_v1_router.include_router(looking_glass_router)
api_v1_router.include_router(assessments_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(settings_router)

