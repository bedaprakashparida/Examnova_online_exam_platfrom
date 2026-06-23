from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import csv
import io

from app.database import get_db
from app.models.result import Result
from app.models.student import Student
from app.models.exam import Exam
from app.models.question import Question
from app.models.response import StudentResponse
from app.services.pdf_service import generate_student_report
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/pdf/student/{exam_id}")
def download_student_pdf(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Download PDF result report for the current student."""
    student_id = current_user["user_id"]
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    result = db.query(Result).filter(
        Result.student_id == student_id,
        Result.exam_id == exam_id,
        Result.is_submitted == True,
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    student = db.query(Student).filter(Student.id == student_id).first()
    exam = db.query(Exam).filter(Exam.id == exam_id).first()

    # Build answers detail
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    responses = db.query(StudentResponse).filter(
        StudentResponse.student_id == student_id,
        StudentResponse.exam_id == exam_id,
    ).all()
    response_map = {r.question_id: r.selected_answer for r in responses}

    answers_detail = [
        {
            "question": q.question_text,
            "selected": response_map.get(q.id),
            "correct": q.correct_answer,
            "is_correct": (response_map.get(q.id) or "").upper() == q.correct_answer.upper(),
        }
        for q in questions
    ]

    pdf_bytes = generate_student_report(
        student_name=student.name,
        student_email=student.email,
        student_roll=student.roll_number,
        exam_title=exam.title,
        score=result.score,
        total_marks=result.total_marks,
        percentage=result.percentage,
        grade=result.grade,
        pass_fail=result.pass_fail_status,
        submitted_at=result.submitted_at,
        answers_detail=answers_detail,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="result_{exam.title.replace(" ", "_")}_{student.name.replace(" ", "_")}.pdf"'
        },
    )


@router.get("/pdf/admin/{exam_id}/{student_id}")
def admin_download_student_pdf(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Admin: download PDF result for any student."""
    result = db.query(Result).filter(
        Result.student_id == student_id,
        Result.exam_id == exam_id,
        Result.is_submitted == True,
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    student = db.query(Student).filter(Student.id == student_id).first()
    exam = db.query(Exam).filter(Exam.id == exam_id).first()

    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    responses = db.query(StudentResponse).filter(
        StudentResponse.student_id == student_id,
        StudentResponse.exam_id == exam_id,
    ).all()
    response_map = {r.question_id: r.selected_answer for r in responses}

    answers_detail = [
        {
            "question": q.question_text,
            "selected": response_map.get(q.id),
            "correct": q.correct_answer,
            "is_correct": (response_map.get(q.id) or "").upper() == q.correct_answer.upper(),
        }
        for q in questions
    ]

    pdf_bytes = generate_student_report(
        student_name=student.name,
        student_email=student.email,
        student_roll=student.roll_number,
        exam_title=exam.title,
        score=result.score,
        total_marks=result.total_marks,
        percentage=result.percentage,
        grade=result.grade,
        pass_fail=result.pass_fail_status,
        submitted_at=result.submitted_at,
        answers_detail=answers_detail,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="result_{student.name.replace(" ", "_")}.pdf"'
        },
    )


@router.get("/csv/{exam_id}")
def export_csv(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Export all results for an exam as CSV."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    results = db.query(Result).filter(
        Result.exam_id == exam_id, Result.is_submitted == True
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["#", "Student Name", "Email", "Roll Number", "Score", "Total Marks",
                     "Percentage", "Grade", "Pass/Fail", "Submitted At"])

    for i, r in enumerate(results, 1):
        student = db.query(Student).filter(Student.id == r.student_id).first()
        writer.writerow([
            i,
            student.name if student else "",
            student.email if student else "",
            student.roll_number if student else "",
            r.score,
            r.total_marks,
            f"{r.percentage:.2f}%",
            r.grade,
            r.pass_fail_status,
            r.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if r.submitted_at else "",
        ])

    output.seek(0)
    filename = f"results_{exam.title.replace(' ', '_')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

