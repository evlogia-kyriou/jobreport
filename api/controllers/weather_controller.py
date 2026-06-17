# controllers/weather_controller.py

from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import require_admin, AuthenticatedUser
from services.weather_service import fetch_and_store_weather
from utils.supabase_client import supabase
from datetime import datetime

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.post("/fetch/{job_id}")
async def fetch_weather_for_job(
    job_id: str,
    current_user: AuthenticatedUser = Depends(require_admin)
):
    # Get job location
    result = supabase.from_("jobs") \
        .select("arrival_latitude, arrival_longitude, arrival_at") \
        .eq("id", job_id) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(404, "Pekerjaan tidak ditemukan.")

    job = result.data

    if not job["arrival_latitude"] or not job["arrival_longitude"]:
        raise HTTPException(422, "Lokasi pekerjaan tidak tersedia.")

    arrival_at = datetime.fromisoformat(job["arrival_at"]) \
        if job["arrival_at"] else datetime.utcnow()

    await fetch_and_store_weather(
        job_id=job_id,
        latitude=float(job["arrival_latitude"]),
        longitude=float(job["arrival_longitude"]),
        recorded_at=arrival_at
    )

    return {"status": "ok", "message": "Data cuaca berhasil disimpan."}