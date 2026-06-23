from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import random
import io
import csv

from app.database import get_db
from app.schemas.schemas import QuestionCreate, QuestionUpdate, QuestionOut, QuestionForStudent
from app.models.question import Question
from app.models.exam import Exam
from app.models.invitation import ExamInvitation
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/{exam_id}", response_model=QuestionOut, status_code=201)
def add_question(
    exam_id: int,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Add a question to an exam."""
    exam = db.query(Exam).filter(
        Exam.id == exam_id, Exam.created_by == current_user["user_id"]
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if payload.correct_answer.upper() not in ["A", "B", "C", "D"]:
        raise HTTPException(status_code=400, detail="correct_answer must be A, B, C, or D")

    q = Question(
        exam_id=exam_id,
        question_text=payload.question_text,
        option_a=payload.option_a,
        option_b=payload.option_b,
        option_c=payload.option_c,
        option_d=payload.option_d,
        correct_answer=payload.correct_answer.upper(),
        marks=payload.marks,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.get("/{exam_id}", response_model=List[QuestionOut])
def get_questions_admin(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get all questions for an exam (admin view — includes correct answers)."""
    return db.query(Question).filter(Question.exam_id == exam_id).all()


@router.get("/{exam_id}/student", response_model=List[QuestionForStudent])
def get_questions_student(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get randomized questions for student exam (no correct answers)."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    # Verify student has invitation
    inv = db.query(ExamInvitation).filter(
        ExamInvitation.exam_id == exam_id,
        ExamInvitation.student_id == current_user["user_id"],
    ).first()
    if not inv:
        raise HTTPException(status_code=403, detail="Not invited to this exam")

    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    random.shuffle(questions)
    return questions


@router.put("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Update a question."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "correct_answer" and value:
            value = value.upper()
        setattr(q, field, value)

    db.commit()
    db.refresh(q)
    return q


@router.delete("/{question_id}", status_code=204)
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Delete a question."""
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(q)
    db.commit()


@router.post("/{exam_id}/bulk-upload", status_code=201)
async def bulk_upload_questions(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """
    Bulk upload questions from CSV.
    CSV columns: question_text, option_a, option_b, option_c, option_d, correct_answer, marks
    """
    exam = db.query(Exam).filter(
        Exam.id == exam_id, Exam.created_by == current_user["user_id"]
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    created = 0
    errors = []
    for i, row in enumerate(reader, 2):
        try:
            correct = row.get("correct_answer", "").strip().upper()
            if correct not in ["A", "B", "C", "D"]:
                errors.append(f"Row {i}: Invalid correct_answer '{correct}'")
                continue

            q = Question(
                exam_id=exam_id,
                question_text=row["question_text"].strip(),
                option_a=row["option_a"].strip(),
                option_b=row["option_b"].strip(),
                option_c=row["option_c"].strip(),
                option_d=row["option_d"].strip(),
                correct_answer=correct,
                marks=int(row.get("marks", 1)),
            )
            db.add(q)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {"created": created, "errors": errors}

