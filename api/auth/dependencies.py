# auth/dependencies.py

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from auth.models import AuthenticatedUser, UserRole
from utils.settings import settings
from utils.supabase_client import supabase

security = HTTPBearer()

# ── Token extraction and validation ──────────────────────────────────────────

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi telah berakhir. Silakan login kembali.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
            headers={"WWW-Authenticate": "Bearer"}
        )

# ── Fetch user from database ──────────────────────────────────────────────────

def fetch_user(user_id: str) -> AuthenticatedUser:
    result = supabase.from_("users") \
        .select("id, name, role, is_active") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pengguna tidak ditemukan.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = result.data

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun dinonaktifkan. Hubungi admin."
        )

    return AuthenticatedUser(
        id=user["id"],
        name=user["name"],
        role=UserRole(user["role"]),
        is_active=user["is_active"],
        email=""
    )

# ── Core dependency ───────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedUser:
    token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak ditemukan.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload  = decode_token(token)
    user_id  = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return fetch_user(user_id)

# ── Role-based dependencies ───────────────────────────────────────────────────

def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPERVISOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Halaman ini hanya untuk admin."
        )
    return current_user

def require_admin_only(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya admin yang dapat melakukan ini."
        )
    return current_user