# utils/supabase_client.py

from supabase import create_client, Client
from utils.settings import settings

def get_supabase() -> Client:
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )

# Single instance — reused across requests
supabase: Client = get_supabase()