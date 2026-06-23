from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Role: 'teacher' or 'admin'
    teacher_role  = Column(String(20), default='teacher', nullable=False)

    # Force password change flag
    needs_password_change = Column(Boolean, default=False, nullable=False)

    # Email OTP verification
    otp_code    = Column(String(10),  nullable=True)
    otp_expiry  = Column(DateTime,    nullable=True)
    is_verified = Column(Integer, default=1)   # 1 = verified, 0 = pending

    # Per-admin SMTP settings (optional — falls back to system .env if not set)
    smtp_email    = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)

    # Relationships
    exams      = relationship("Exam",      back_populates="creator",  cascade="all, delete-orphan")
    classrooms = relationship("Classroom", back_populates="teacher",  cascade="all, delete-orphan")

