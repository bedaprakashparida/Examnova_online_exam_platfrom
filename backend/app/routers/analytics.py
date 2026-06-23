from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.database import get_db
from app.models.exam import Exam
from app.models.student import Student
from app.models.result import Result
from app.models.activity_log import ActivityLog
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Admin dashboard summary statistics."""
    teacher_id = current_user["user_id"]
    now = datetime.now(timezone.utc)

    exam_query = db.query(Exam)
    if current_user.get("role") != "admin":
        exam_query = exam_query.filter(Exam.created_by == teacher_id)
    exams = exam_query.all()
    exam_ids = [e.id for e in exams]

    total_exams = len(exams)
    
    if current_user.get("role") == "admin":
        total_students = db.query(Student).count()
    else:
        from app.models.classroom import Classroom
        total_students = db.query(Student).join(Classroom).filter(Classroom.created_by == teacher_id).count()

    active_exams = sum(
        1 for e in exams
        if (e.start_time.replace(tzinfo=timezone.utc) if e.start_time.tzinfo is None else e.start_time) <= now <=
           (e.end_time.replace(tzinfo=timezone.utc) if e.end_time.tzinfo is None else e.end_time)
    )
    completed_exams = sum(
        1 for e in exams
        if (e.end_time.replace(tzinfo=timezone.utc) if e.end_time.tzinfo is None else e.end_time) < now
    )

    results = db.query(Result).filter(
        Result.exam_id.in_(exam_ids), Result.is_submitted == True
    ).all()

    avg_score = sum(r.percentage for r in results) / len(results) if results else 0
    pass_count = sum(1 for r in results if r.pass_fail_status == "Pass")
    pass_pct = (pass_count / len(results) * 100) if results else 0

    return {
        "total_exams": total_exams,
        "total_students": total_students,
        "active_exams": active_exams,
        "completed_exams": completed_exams,
        "average_score": round(avg_score, 2),
        "pass_percentage": round(pass_pct, 2),
        "total_results": len(results),
    }


@router.get("/exam/{exam_id}")
def exam_analytics(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Detailed analytics for a specific exam."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        return {"error": "Exam not found"}

    results = db.query(Result).filter(
        Result.exam_id == exam_id, Result.is_submitted == True
    ).all()

    from app.models.invitation import ExamInvitation
    invited = db.query(ExamInvitation).filter(ExamInvitation.exam_id == exam_id).count()

    if not results:
        return {
            "exam_id": exam_id,
            "exam_title": exam.title,
            "invited": invited,
            "appeared": 0,
            "passed": 0,
            "failed": 0,
            "average_score": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "pass_percentage": 0,
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0},
            "score_distribution": [],
        }

    passed = sum(1 for r in results if r.pass_fail_status == "Pass")
    failed = len(results) - passed
    avg = sum(r.percentage for r in results) / len(results)
    highest = max(r.percentage for r in results)
    lowest = min(r.percentage for r in results)

    grade_dist = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for r in results:
        grade_dist[r.grade] = grade_dist.get(r.grade, 0) + 1

    return {
        "exam_id": exam_id,
        "exam_title": exam.title,
        "invited": invited,
        "appeared": len(results),
        "passed": passed,
        "failed": failed,
        "average_score": round(avg, 2),
        "highest_score": round(highest, 2),
        "lowest_score": round(lowest, 2),
        "pass_percentage": round(passed / len(results) * 100, 2),
        "fail_percentage": round(failed / len(results) * 100, 2),
        "grade_distribution": grade_dist,
    }


@router.get("/top-students/{exam_id}")
def top_students(
    exam_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get top N students for an exam by score."""
    results = (
        db.query(Result)
        .filter(Result.exam_id == exam_id, Result.is_submitted == True)
        .order_by(Result.percentage.desc())
        .limit(limit)
        .all()
    )

    output = []
    for rank, r in enumerate(results, 1):
        student = db.query(Student).filter(Student.id == r.student_id).first()
        output.append({
            "rank": rank,
            "student_name": student.name if student else "Unknown",
            "student_email": student.email if student else "",
            "student_roll": student.roll_number if student else None,
            "score": r.score,
            "total_marks": r.total_marks,
            "percentage": r.percentage,
            "grade": r.grade,
            "pass_fail_status": r.pass_fail_status,
        })
    return output


@router.get("/activity-summary/{exam_id}")
def activity_summary(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Summary of activity log types for an exam."""
    logs = db.query(ActivityLog).filter(ActivityLog.exam_id == exam_id).all()

    summary = {}
    for log in logs:
        summary[log.activity_type] = summary.get(log.activity_type, 0) + 1

    return {"exam_id": exam_id, "activity_summary": summary, "total_events": len(logs)}


@router.get("/all-exams-performance")
def all_exams_performance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Performance trend across all exams for the admin."""
    teacher_id = current_user["user_id"]
    exams = (
        db.query(Exam)
        .filter(Exam.created_by == teacher_id)
        .order_by(Exam.start_time)
        .all()
    )

    trend = []
    for exam in exams:
        results = db.query(Result).filter(
            Result.exam_id == exam.id, Result.is_submitted == True
        ).all()
        if results:
            avg = sum(r.percentage for r in results) / len(results)
            trend.append({
                "exam_id": exam.id,
                "exam_title": exam.title,
                "start_time": exam.start_time,
                "appeared": len(results),
                "average_percentage": round(avg, 2),
                "pass_count": sum(1 for r in results if r.pass_fail_status == "Pass"),
                "fail_count": sum(1 for r in results if r.pass_fail_status == "Fail"),
            })
    return trend


@router.get("/student/{student_id}")
def student_exam_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get exam history for a specific student under this teacher."""
    exam_query = db.query(Exam)
    if current_user.get("role") != "admin":
        exam_query = exam_query.filter(Exam.created_by == current_user["user_id"])
    exams = exam_query.all()
    exam_ids = [e.id for e in exams]

    results = db.query(Result).filter(
        Result.student_id == student_id,
        Result.exam_id.in_(exam_ids),
        Result.is_submitted == True
    ).order_by(Result.submitted_at.desc()).all()

    student = db.query(Student).filter(Student.id == student_id).first()

    history = []
    for r in results:
        exam = next((e for e in exams if e.id == r.exam_id), None)
        if exam:
            history.append({
                "exam_id": exam.id,
                "exam_title": exam.title,
                "score": r.score,
                "total_marks": r.total_marks,
                "percentage": r.percentage,
                "grade": r.grade,
                "pass_fail_status": r.pass_fail_status,
                "submitted_at": str(r.submitted_at),
            })

    return {
        "student": {
            "id": student.id if student else student_id,
            "name": student.name if student else "Unknown",
            "email": student.email if student else "",
            "roll_number": student.roll_number if student else ""
        },
        "history": history
    }
