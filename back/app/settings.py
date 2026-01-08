from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """
    App configuration.

    This project uses `config.env` (non-dot env file) because some environments
    block creating `.env*` files. If you do have a `.env`, it will also be read.
    """

    model_config = SettingsConfigDict(
        # Prefer reading env files from the repository root, regardless of CWD.
        # Also allow local relative paths for flexibility.
        env_file=(
            str(_PROJECT_ROOT / "config.env"),
            str(_PROJECT_ROOT / ".env"),
            "config.env",
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_host: str = Field(default="localhost", validation_alias="DB_HOST")
    db_port: int = Field(default=5432, validation_alias="DB_PORT")
    db_user: str = Field(default="pos", validation_alias="DB_USER")
    db_password: str = Field(default="pos", validation_alias="DB_PASSWORD")
    db_name: str = Field(default="pos", validation_alias="DB_NAME")

    secret_key: str = Field(default="CHANGE_THIS_IN_PRODUCTION", validation_alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", validation_alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    @property
    def database_url(self) -> str:
        # SQLModel uses SQLAlchemy under the hood; this uses the psycopg driver (v3).
        # If you prefer psycopg2, change to: postgresql://user:pass@host:port/db
        return (
            f"postgresql+psycopg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()

