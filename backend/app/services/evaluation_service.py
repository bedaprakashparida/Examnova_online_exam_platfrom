from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.response import StudentResponse
from app.models.result import Result


def calculate_grade(percentage: float) -> str:
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"


def evaluate_exam(
    db: Session,
    student_id: int,
    exam_id: int,
) -> Result:
    """
    Evaluate all responses for a student in an exam.
    Compares answers to correct answers, calculates score, percentage, grade, and pass/fail.
    Creates or updates the Result record.
    """
    # Fetch all questions for this exam
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    total_marks = sum(q.marks for q in questions)

    if total_marks == 0:
        total_marks = len(questions)

    # Fetch all student responses
    responses = (
        db.query(StudentResponse)
        .filter(
            StudentResponse.student_id == student_id,
            StudentResponse.exam_id == exam_id,
        )
        .all()
    )

    # Build a dict of {question_id: selected_answer}
    response_map = {r.question_id: r.selected_answer for r in responses}

    # Calculate score
    score = 0
    for q in questions:
        student_ans = response_map.get(q.id)
        if student_ans and student_ans.upper() == q.correct_answer.upper():
            score += q.marks

    percentage = (score / total_marks * 100) if total_marks > 0 else 0.0
    grade = calculate_grade(percentage)
    pass_fail = "Pass" if percentage >= 60 else "Fail"

    # Check if result already exists
    existing = (
        db.query(Result)
        .filter(Result.student_id == student_id, Result.exam_id == exam_id)
        .first()
    )

    if existing:
        existing.score = score
        existing.total_marks = total_marks
        existing.percentage = round(percentage, 2)
        existing.grade = grade
        existing.pass_fail_status = pass_fail
        existing.is_submitted = True
        db.commit()
        db.refresh(existing)
        return existing
    else:
        result = Result(
            student_id=student_id,
            exam_id=exam_id,
            score=score,
            total_marks=total_marks,
            percentage=round(percentage, 2),
            grade=grade,
            pass_fail_status=pass_fail,
            is_submitted=True,
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result
