# services/weather_service.py

import httpx
import sentry_sdk
from utils.settings import settings
from utils.supabase_client import supabase
from datetime import datetime

async def fetch_and_store_weather(
    job_id: str,
    latitude: float,
    longitude: float,
    recorded_at: datetime
) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat":   latitude,
                    "lon":   longitude,
                    "appid": settings.openweathermap_api_key,
                    "units": "metric"
                }
            )

            if response.status_code != 200:
                sentry_sdk.capture_message(
                    f"Weather API failed for job {job_id}: {response.status_code}",
                    level="warning"
                )
                return

            data = response.json()

            weather_record = {
                "job_id":               job_id,
                "latitude":             latitude,
                "longitude":            longitude,
                "ambient_temperature":  data["main"]["temp"],
                "humidity":             data["main"]["humidity"],
                "weather_condition":    data["weather"][0]["main"],
                "recorded_at":          recorded_at.isoformat(),
                "fetched_at":           datetime.utcnow().isoformat(),
                "data_source":          "OpenWeatherMap"
            }

            supabase.from_("weather_logs") \
                .insert(weather_record) \
                .execute()

    except Exception as e:
        # Weather failure should never block job submission
        sentry_sdk.capture_exception(e)