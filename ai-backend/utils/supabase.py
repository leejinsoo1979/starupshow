from functools import lru_cache
from supabase import create_client, Client

from config import get_settings

settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key or settings.supabase_anon_key,
    )


async def get_deployed_agent(agent_id: str) -> dict | None:
    """Fetch deployed agent configuration from Supabase"""
    client = get_supabase_client()
    result = client.table("deployed_agents").select("*").eq("id", agent_id).single().execute()
    return result.data if result.data else None


async def save_chat_message(agent_id: str, session_id: str, message: dict) -> dict:
    """Save chat message to Supabase"""
    client = get_supabase_client()
    result = client.table("agent_chat_history").insert({
        "agent_id": agent_id,
        "session_id": session_id,
        "role": message["role"],
        "content": message["content"],
    }).execute()
    return result.data


async def get_chat_history(agent_id: str, session_id: str, limit: int = 50) -> list[dict]:
    """Get chat history for an agent session"""
    client = get_supabase_client()
    result = (
        client.table("agent_chat_history")
        .select("*")
        .eq("agent_id", agent_id)
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return result.data or []
