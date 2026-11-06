from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./scanner.db"
    MAX_FILE_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./tmp_uploads"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def max_file_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env"}


settings = Settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
