# utils/settings.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str 
    supabase_service_role_key: str
    #supabase_jwt_secret: str
    openweathermap_api_key: str
    sentry_dsn: str
    environment: str = "development"
    port: int = 8080

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()