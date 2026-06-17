# models/weather.py

from pydantic import BaseModel
from typing import Optional

class WeatherData(BaseModel):
    job_id:               str
    latitude:             float
    longitude:            float
    ambient_temperature:  Optional[float] = None
    humidity:             Optional[int] = None
    weather_condition:    Optional[str] = None