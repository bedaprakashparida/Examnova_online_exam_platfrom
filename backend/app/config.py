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

# Vercel Serverless Function compatibility:
# Copy the bundled SQLite DB to /tmp/ so it's writable
import os
import shutil

if os.environ.get("VERCEL") and settings.DATABASE_URL.startswith("sqlite"):
    tmp_db_path = "/tmp/qr_exam.db"
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    
    src_db = None
    for path in [
        os.path.join(root_dir, "qr_exam.db"),
        os.path.join(base_dir, "qr_exam.db"),
        "./qr_exam.db",
        "./backend/qr_exam.db"
    ]:
        if os.path.exists(path):
            src_db = path
            break
            
    if src_db:
        if not os.path.exists(tmp_db_path):
            try:
                shutil.copy2(src_db, tmp_db_path)
                print(f"[VERCEL] Copied SQLite DB from {src_db} to {tmp_db_path}")
            except Exception as e:
                print(f"[VERCEL] Error copying SQLite DB: {e}")
        settings.DATABASE_URL = f"sqlite:///{tmp_db_path}"

