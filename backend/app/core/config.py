from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # General
    APP_NAME: str = "ASKID"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str = ""

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI-compatible LLM
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str = ""  # Leave empty for OpenAI, or set for compatible providers
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_CHAT_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_DIMENSIONS: int = 1536

    # S3
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "askid-documents"
    S3_REGION: str = "us-east-1"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Encryption
    ENCRYPTION_KEY: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
