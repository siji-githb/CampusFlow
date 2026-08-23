from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    # ── Primary AI Provider: Google AI Studio (Gemini) ──
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"

    # ── Fallback AI Provider: OpenRouter ──
    openrouter_api_key: str = "placeholder"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemma-4-26b-a4b-it:free"
    openrouter_vision_model: str = "nvidia/nemotron-nano-12b-v2-vl:free"

    # Backward compatibility aliases
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = ""
    openai_vision_model: str = ""

    @property
    def fallback_api_key(self) -> str:
        key = self.openrouter_api_key.strip() if self.openrouter_api_key else ""
        if key and key != "placeholder":
            return key
        return (self.openai_api_key or "").strip() or "placeholder"

    @property
    def fallback_base_url(self) -> str:
        return (self.openrouter_base_url or self.openai_base_url or "https://openrouter.ai/api/v1").strip()

    @property
    def fallback_model(self) -> str:
        return (self.openrouter_model or self.openai_model or "google/gemma-4-26b-a4b-it:free").strip()

    @property
    def fallback_vision_model(self) -> str:
        return (self.openrouter_vision_model or self.openai_vision_model or "nvidia/nemotron-nano-12b-v2-vl:free").strip()
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    brevo_api_key: str = ""
    email_from: str = "CampusFlow Registrar <registrar@campusflow.app>"
    frontend_url: str = "https://campus-flow-iota.vercel.app"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()