from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=False, default=60)  # in minutes
    passing_score = Column(Integer, nullable=True, default=50)  # percentage
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    creator = relationship("Teacher", back_populates="exams")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    invitations = relationship("ExamInvitation", back_populates="exam", cascade="all, delete-orphan")
    responses = relationship("StudentResponse", back_populates="exam", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="exam", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="exam", cascade="all, delete-orphan")
