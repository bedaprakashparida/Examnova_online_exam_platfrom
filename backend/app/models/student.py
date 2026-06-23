from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    roll_number = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    profile_photo = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="students")
    invitations = relationship("ExamInvitation", back_populates="student", cascade="all, delete-orphan")
    responses = relationship("StudentResponse", back_populates="student", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="student", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="student", cascade="all, delete-orphan")
