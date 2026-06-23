from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.schemas.schemas import ExamCreate, ExamUpdate, ExamOut
from app.models.exam import Exam
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.post("/", response_model=ExamOut, status_code=201)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Create a new exam."""
    duration = payload.duration_minutes or payload.duration or 60
    exam = Exam(
        title=payload.title,
        description=payload.description,
        duration=duration,
        passing_score=payload.passing_score or 50,
        start_time=payload.start_time,
        end_time=payload.end_time,
        created_by=current_user["user_id"],
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get("/", response_model=List[ExamOut])
def list_exams(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """List all exams created by the current user, or all if admin."""
    query = db.query(Exam)
    if current_user.get("role") != "admin":
        query = query.filter(Exam.created_by == current_user["user_id"])
    
    exams = query.order_by(Exam.created_at.desc()).all()
    
    from app.models.teacher import Teacher
    for ex in exams:
        teacher = db.query(Teacher).filter(Teacher.id == ex.created_by).first()
        ex.created_by_name = teacher.name if teacher else "Unknown"
        
    return exams


@router.get("/student/my-exams")
def student_exams(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all exams the student is invited to."""
    from app.models.invitation import ExamInvitation

    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    invitations = (
        db.query(ExamInvitation)
        .filter(ExamInvitation.student_id == current_user["user_id"])
        .all()
    )

    result = []
    for inv in invitations:
        exam = db.query(Exam).filter(Exam.id == inv.exam_id).first()
        if exam:
            now = datetime.now(timezone.utc)
            start = exam.start_time.replace(tzinfo=timezone.utc) if exam.start_time.tzinfo is None else exam.start_time
            end = exam.end_time.replace(tzinfo=timezone.utc) if exam.end_time.tzinfo is None else exam.end_time

            status = "upcoming"
            if now > end:
                status = "completed"
            elif now >= start:
                status = "active"

            result.append({
                "exam_id": exam.id,
                "title": exam.title,
                "description": exam.description,
                "duration": exam.duration,
                "start_time": exam.start_time,
                "end_time": exam.end_time,
                "status": status,
                "invitation_id": inv.id,
                "unique_exam_link": inv.unique_exam_link,
                "qr_code": inv.qr_code,
                "is_used": inv.is_used,
            })
    return result


@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single exam by ID."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    from app.models.teacher import Teacher
    teacher = db.query(Teacher).filter(Teacher.id == exam.created_by).first()
    exam.created_by_name = teacher.name if teacher else "Unknown"
    
    return exam


@router.put("/{exam_id}", response_model=ExamOut)
def update_exam(
    exam_id: int,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Update exam. Admin only."""
    query = db.query(Exam).filter(Exam.id == exam_id)
    if current_user.get("role") != "admin":
        query = query.filter(Exam.created_by == current_user["user_id"])
    exam = query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(exam, field, value)

    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Delete exam. Admin only."""
    query = db.query(Exam).filter(Exam.id == exam_id)
    if current_user.get("role") != "admin":
        query = query.filter(Exam.created_by == current_user["user_id"])
    exam = query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    db.delete(exam)
    db.commit()

