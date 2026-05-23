from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider: "deepseek" or "gemini"
    llm_provider: str = "deepseek"

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    # Gemini (Vertex AI)
    gemini_model: str = "gemini-2.5-flash"
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"

    # STT
    stt_provider: str = "whisper"  # "whisper" or "deepgram"
    deepgram_api_key: str = ""
    deepgram_model: str = "nova-2"
    whisper_model: str = "medium"
    whisper_device: str = "cuda"
    whisper_compute_type: str = "float16"

    # TTS — Fish Audio API
    fish_audio_api_key: str = ""
    fish_audio_model: str = "s2-pro"
    fish_audio_reference_id: str = ""  # pre-created voice model ID (from web UI)
    # Legacy (unused with Fish Audio)
    gpt_sovits_url: str = "http://localhost:9880"

    # Auth
    jwt_secret: str = "change-me-to-a-random-string-in-production"
    jwt_expire_days: int = 30

    # Database
    database_path: str = "backend/data/vertin.db"

    # Limits
    max_bots_per_user: int = 20

    # Misc
    stt_temp_dir: str = "temp_audio"
    max_history: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
