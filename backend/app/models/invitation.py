from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ExamInvitation(Base):
    __tablename__ = "exam_invitations"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    qr_code = Column(Text, nullable=True)          # base64 encoded QR image
    qr_token = Column(Text, nullable=True)          # JWT token embedded in QR
    unique_exam_link = Column(Text, nullable=True)  # full exam URL with token
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    is_used = Column(Boolean, default=False)        # one-time access flag
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="invitations")
    student = relationship("Student", back_populates="invitations")
