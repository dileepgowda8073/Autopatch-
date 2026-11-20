from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DB_PATH = (DATA_DIR / "autopatch.db").as_posix()
DEFAULT_WORKSPACES_DIR = str((DATA_DIR / "workspaces").resolve())


class Settings(BaseSettings):
    AUTOPATCH_ENV: str = "development"
    AUTOPATCH_HOST: str = "0.0.0.0"
    AUTOPATCH_PORT: int = 8000
    AUTOPATCH_LOG_LEVEL: str = "INFO"

    # Database (always resolved relative to repository root)
    AUTOPATCH_DB_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # LLM Settings
    AUTOPATCH_LLM_PROVIDER: str = "gemini"  # gemini | openai
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AUTOPATCH_LLM_MAX_RETRIES: int = 3
    AUTOPATCH_LLM_TEMPERATURE: float = 0.2
    AUTOPATCH_LLM_MAX_TOKENS: int = 4096
    AUTOPATCH_LLM_CACHE_ENABLED: bool = True

    # Upload & Security Limits
    AUTOPATCH_MAX_UPLOAD_BYTES: int = 50 * 1024 * 1024  # 50 MB
    AUTOPATCH_MAX_ZIP_FILES: int = 500
    AUTOPATCH_MAX_UNCOMPRESSED_BYTES: int = 200 * 1024 * 1024  # 200 MB
    AUTOPATCH_WORKSPACE_ROOT: str = DEFAULT_WORKSPACES_DIR
    AUTOPATCH_WORKSPACE_TTL_SECONDS: int = 3600

    # Sandbox Limits
    AUTOPATCH_SANDBOX_IMAGE: str = "autopatch-sandbox-python:latest"
    AUTOPATCH_SANDBOX_CPU_QUOTA: float = 0.5
    AUTOPATCH_SANDBOX_MEMORY_MB: int = 256
    AUTOPATCH_SANDBOX_TIMEOUT_SECONDS: int = 120
    AUTOPATCH_SANDBOX_MAX_OUTPUT_BYTES: int = 1024 * 1024  # 1 MB

    # Rate limiting
    AUTOPATCH_RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
Path(settings.AUTOPATCH_WORKSPACE_ROOT).mkdir(parents=True, exist_ok=True)
