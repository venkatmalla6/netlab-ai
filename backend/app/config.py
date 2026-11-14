"""Application configuration using pydantic-settings."""

from __future__ import annotations

import secrets
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── General ──────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    SECRET_KEY: str = secrets.token_urlsafe(32)
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────────
    DATABASE_URL: str = f"sqlite+aiosqlite:///{(Path(__file__).resolve().parents[2] / 'netlab.db').as_posix()}"

    # ── Groq (primary cloud AI) ──────────────────────────────
    GROQ_API_KEY: Optional[str] = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "qwen/qwen3.8-27b"

    # ── Ollama (local AI) ────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CHAT_MODEL: str = "qwen3:4b"
    OLLAMA_VISION_MODEL: str = "qwen2.5vl:3b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # ── EVE-NG ───────────────────────────────────────────────
    EVE_HOST: Optional[str] = None
    EVE_USERNAME: str = "admin"
    EVE_PASSWORD: str = "eve"

    # ── VMware ───────────────────────────────────────────────
    VMWARE_HOST: Optional[str] = None
    VMWARE_USERNAME: str = "root"
    VMWARE_PASSWORD: str = "eve"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


# Singleton
settings = Settings()
