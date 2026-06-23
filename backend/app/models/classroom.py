from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)          # e.g. "CSE-A 2024"
    description = Column(Text, nullable=True)           # optional notes
    section = Column(String(100), nullable=True)        # e.g. "Section A"
    created_by = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    teacher = relationship("Teacher", back_populates="classrooms")
    students = relationship("Student", back_populates="classroom", cascade="all, delete-orphan")
