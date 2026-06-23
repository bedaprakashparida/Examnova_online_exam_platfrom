from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Database — SQLite for local dev, set env var for PostgreSQL in production
    DATABASE_URL: str = "sqlite:///./qr_exam.db"

    # JWT
    SECRET_KEY: str = "exam_project_super_secure_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    QR_SECRET_KEY: str = "exam_project_qr_secret_key_2026_separate"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "ExamNova"

    # App
    APP_NAME: str = "ExamNova"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    DEBUG: bool = True

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # silently ignore POSTGRES_USER etc. from .env
    )


settings = Settings()
