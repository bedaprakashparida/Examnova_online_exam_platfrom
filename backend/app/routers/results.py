from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.schemas import (
    BulkAnswerSubmit, AutoSaveAnswers, ResultOut, ActivityLogCreate, ActivityLogOut
)
from app.models.response import StudentResponse
from app.models.result import Result
from app.models.activity_log import ActivityLog
from app.models.invitation import ExamInvitation
from app.models.exam import Exam
from app.models.student import Student
from app.models.question import Question
from app.services.evaluation_service import evaluate_exam
from app.middleware.auth_middleware import require_student, require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/results", tags=["Results"])


@router.post("/autosave")
def autosave_answers(
    payload: AutoSaveAnswers,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_student),
):
    """Auto-save student answers every 10 seconds during exam."""
    student_id = current_user["user_id"]

    for ans in payload.answers:
        existing = db.query(StudentResponse).filter(
            StudentResponse.student_id == student_id,
            StudentResponse.exam_id == payload.exam_id,
            StudentResponse.question_id == ans.question_id,
        ).first()

        if existing:
            existing.selected_answer = ans.selected_answer
        else:
            resp = StudentResponse(
                student_id=student_id,
                exam_id=payload.exam_id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
            )
            db.add(resp)

    db.commit()
    return {"message": "Answers saved"}


@router.post("/submit", response_model=ResultOut)
async def submit_exam(
    payload: BulkAnswerSubmit,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_student),
):
    """Submit exam answers and trigger evaluation. One-time operation."""
    student_id = current_user["user_id"]

    # Check if already submitted
    existing_result = db.query(Result).filter(
        Result.student_id == student_id,
        Result.exam_id == payload.exam_id,
        Result.is_submitted == True,
    ).first()
    if existing_result:
        return existing_result

    # Save all answers
    for ans in payload.answers:
        resp = db.query(StudentResponse).filter(
            StudentResponse.student_id == student_id,
            StudentResponse.exam_id == payload.exam_id,
            StudentResponse.question_id == ans.question_id,
        ).first()
        if resp:
            resp.selected_answer = ans.selected_answer
        else:
            db.add(StudentResponse(
                student_id=student_id,
                exam_id=payload.exam_id,
                question_id=ans.question_id,
                selected_answer=ans.selected_answer,
            ))

    # Mark invitation as used
    inv = db.query(ExamInvitation).filter(
        ExamInvitation.exam_id == payload.exam_id,
        ExamInvitation.student_id == student_id,
    ).first()
    if inv:
        inv.is_used = True

    db.commit()

    # Evaluate and get result
    result = evaluate_exam(db, student_id, payload.exam_id)

    # Log submission
    db.add(ActivityLog(
        student_id=student_id,
        exam_id=payload.exam_id,
        activity_type="exam_submission",
        details=f"Score: {result.score}/{result.total_marks}",
    ))
    db.commit()

    # Send result email in background
    try:
        from app.services.email_service import send_result_notification
        student = db.query(Student).filter(Student.id == student_id).first()
        exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
        import asyncio
        asyncio.create_task(send_result_notification(
            student_email=student.email,
            student_name=student.name,
            exam_title=exam.title,
            score=result.score,
            total_marks=result.total_marks,
            percentage=result.percentage,
            grade=result.grade,
            pass_fail=result.pass_fail_status,
            submitted_at=result.submitted_at,
        ))
    except Exception:
        pass  # Non-blocking

    return result


@router.post("/log-activity")
def log_activity(
    payload: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Log a proctoring activity (tab switch, fullscreen exit, etc.)."""
    log = ActivityLog(
        student_id=current_user["user_id"],
        exam_id=payload.exam_id,
        activity_type=payload.activity_type,
        details=payload.details,
    )
    db.add(log)
    db.commit()
    return {"logged": True}


@router.get("/my-results")
def my_results(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all results for the current student."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    results = (
        db.query(Result)
        .filter(Result.student_id == current_user["user_id"], Result.is_submitted == True)
        .all()
    )
    output = []
    for r in results:
        exam = db.query(Exam).filter(Exam.id == r.exam_id).first()
        output.append({
            "id": r.id,
            "exam_id": r.exam_id,
            "exam_title": exam.title if exam else "Unknown",
            "score": r.score,
            "total_marks": r.total_marks,
            "percentage": r.percentage,
            "grade": r.grade,
            "pass_fail_status": r.pass_fail_status,
            "submitted_at": r.submitted_at,
        })
    return output


@router.get("/exam/{exam_id}", dependencies=[Depends(require_teacher_or_admin)])
def exam_results(
    exam_id: int,
    db: Session = Depends(get_db),
):
    """Get all results for an exam. Admin only."""
    results = db.query(Result).filter(
        Result.exam_id == exam_id, Result.is_submitted == True
    ).all()

    output = []
    for r in results:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        output.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": student.name if student else "Unknown",
            "student_email": student.email if student else "",
            "student_roll": student.roll_number if student else None,
            "exam_id": r.exam_id,
            "score": r.score,
            "total_marks": r.total_marks,
            "percentage": r.percentage,
            "grade": r.grade,
            "pass_fail_status": r.pass_fail_status,
            "submitted_at": r.submitted_at,
        })
    return output


@router.get("/activity-logs/{exam_id}", dependencies=[Depends(require_teacher_or_admin)])
def activity_logs(
    exam_id: int,
    db: Session = Depends(get_db),
):
    """Get all activity logs for an exam. Admin only."""
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.exam_id == exam_id)
        .order_by(ActivityLog.timestamp.desc())
        .all()
    )
    output = []
    for log in logs:
        student = db.query(Student).filter(Student.id == log.student_id).first()
        output.append({
            "id": log.id,
            "student_name": student.name if student else "Unknown",
            "student_email": student.email if student else "",
            "activity_type": log.activity_type,
            "details": log.details,
            "timestamp": log.timestamp,
        })
    return output


@router.get("/student/{exam_id}/detail")
def student_exam_detail(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get student's detailed result with answer comparison for a specific exam."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    student_id = current_user["user_id"]

    result = db.query(Result).filter(
        Result.student_id == student_id,
        Result.exam_id == exam_id,
        Result.is_submitted == True,
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    responses = db.query(StudentResponse).filter(
        StudentResponse.student_id == student_id,
        StudentResponse.exam_id == exam_id,
    ).all()
    response_map = {r.question_id: r.selected_answer for r in responses}

    answers_detail = []
    for q in questions:
        selected = response_map.get(q.id)
        correct = q.correct_answer
        answers_detail.append({
            "question_id": q.id,
            "question": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "selected": selected,
            "correct": correct,
            "is_correct": (selected or "").upper() == correct.upper(),
        })

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    student = db.query(Student).filter(Student.id == student_id).first()

    return {
        "result": {
            "score": result.score,
            "total_marks": result.total_marks,
            "percentage": result.percentage,
            "grade": result.grade,
            "pass_fail_status": result.pass_fail_status,
            "submitted_at": result.submitted_at,
        },
        "exam_title": exam.title if exam else "",
        "student_name": student.name if student else "",
        "student_email": student.email if student else "",
        "student_roll": student.roll_number if student else None,
        "answers_detail": answers_detail,
    }


