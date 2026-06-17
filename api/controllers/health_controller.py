# controllers/health_controller.py

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    return {
        "status":    "healthy",
        "version":   "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "service":   "jobreport-api"
    }