# main.py

import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from utils.settings import settings
from controllers.health_controller import router as health_router
from controllers.report_controller import router as report_router
from controllers.weather_controller import router as weather_router

# ── Sentry ────────────────────────────────────────────────────────────────────
sentry_sdk.init(
    dsn=settings.sentry_dsn,
    traces_sample_rate=0.2,
    environment=settings.environment,
    send_default_pii=False
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Request size limit middleware ─────────────────────────────────────────────
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_SIZE:
            return Response(
                content="Request terlalu besar.",
                status_code=413
            )
        return await call_next(request)

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"JobReport API starting — environment: {settings.environment}")
    yield
    # Shutdown
    print("JobReport API shutting down.")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="JobReport API",
    version="1.0.0",
    # Disable docs in production
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
    openapi_url=None if settings.environment == "production" else "/openapi.json",
    lifespan=lifespan
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(RequestSizeLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.yourapp.com",
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(report_router)
app.include_router(weather_router)