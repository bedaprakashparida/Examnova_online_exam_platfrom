from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# SQLite needs check_same_thread=False; PostgreSQL does not
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

_engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if not _is_sqlite:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all ORM tables if they don't exist."""
    from app.models import (  # noqa: F401 — import triggers table registration
        Teacher, Student, Exam, Question,
        ExamInvitation, StudentResponse, Result, ActivityLog
    )
    Base.metadata.create_all(bind=engine)
