from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    total_marks = Column(Integer, nullable=False, default=0)
    percentage = Column(Float, nullable=False, default=0.0)
    grade = Column(String(2), nullable=False, default="F")
    pass_fail_status = Column(String(10), nullable=False, default="Fail")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    is_submitted = Column(Boolean, default=False)

    # Relationships
    student = relationship("Student", back_populates="results")
    exam = relationship("Exam", back_populates="results")
