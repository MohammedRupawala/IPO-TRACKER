from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    jwt_secret_key: str = Field(default="change-me-to-a-long-random-secret", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=15,
        alias="ACCESS_TOKEN_EXPIRE_MINUTES",
        ge=1,
    )
    refresh_token_expire_minutes: int = Field(
        default=10080,
        alias="REFRESH_TOKEN_EXPIRE_MINUTES",
        ge=1,
    )
    cookie_secure: bool = Field(default=True, alias="COOKIE_SECURE")
    rabbitmq_url: str = Field(default="amqp://guest:guest@localhost:5672/", alias="RABBITMQ_URL")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()