from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db, SessionLocal
from app.schemas.schemas import QRVerifyRequest
from app.models.invitation import ExamInvitation
from app.models.exam import Exam
from app.models.student import Student
from app.models.teacher import Teacher
from app.services.qr_service import generate_invitation_assets, verify_qr_token
from app.services.email_service import send_exam_invitation_sync, test_smtp_connection_sync
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin

router = APIRouter(prefix="/invitations", tags=["Invitations"])


def _get_teacher_smtp(db: Session, teacher_id: int) -> dict:
    """
    Return SMTP credentials for this admin.
    If the admin has configured their own Gmail, use that.
    Otherwise fall back to system SMTP (from .env).
    """
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if teacher and teacher.smtp_email and teacher.smtp_password:
        return {
            "smtp_user": teacher.smtp_email,
            "smtp_password": teacher.smtp_password,
            "sender_name": teacher.name,
        }
    return {"smtp_user": None, "smtp_password": None, "sender_name": None}


# ── Test SMTP ──────────────────────────────────────────────────────────────────
@router.get("/test-smtp")
def test_smtp(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Test SMTP — uses admin's own Gmail if configured, else system SMTP."""
    creds = _get_teacher_smtp(db, current_user["user_id"])
    result = test_smtp_connection_sync(
        smtp_user=creds["smtp_user"],
        smtp_password=creds["smtp_password"],
    )
    result["using"] = creds["smtp_user"] or "system default"
    return result


# ── Generate QR Codes (class-wise or all) ─────────────────────────────────────
@router.post("/generate/{exam_id}", status_code=201)
def generate_invitations(
    exam_id: int,
    class_id: Optional[int] = Query(None, description="Filter to one class only"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """
    Generate QR codes for an exam.
    - Pass ?class_id=X to generate only for students in that class.
    - Omit to generate for ALL students.
    """
    exam_query = db.query(Exam).filter(Exam.id == exam_id)
    if current_user.get("role") != "admin":
        exam_query = exam_query.filter(Exam.created_by == current_user["user_id"])
    exam = exam_query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    query = db.query(Student)
    if current_user.get("role") != "admin":
        from app.models.classroom import Classroom
        query = query.join(Classroom).filter(Classroom.created_by == current_user["user_id"])
        
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    students = query.all()

    if not students:
        msg = f"No students in class {class_id}" if class_id else "No students found"
        raise HTTPException(status_code=400, detail=msg)

    created = skipped = 0
    for student in students:
        existing = db.query(ExamInvitation).filter(
            ExamInvitation.exam_id == exam_id,
            ExamInvitation.student_id == student.id,
        ).first()
        if not existing:
            inv = ExamInvitation(exam_id=exam_id, student_id=student.id)
            db.add(inv)
            db.flush()
            assets = generate_invitation_assets(
                student_id=student.id,
                exam_id=exam_id,
                invitation_id=inv.id,
                exam_end_time=exam.end_time,
            )
            inv.qr_token = assets["qr_token"]
            inv.unique_exam_link = assets["unique_exam_link"]
            inv.qr_code = assets["qr_code"]
            created += 1
        else:
            skipped += 1

    db.commit()
    return {
        "message": f"Generated {created} invitations ({skipped} already existed)",
        "exam_id": exam_id,
        "class_id": class_id,
        "created": created,
        "skipped": skipped,
    }


# ── Generate single invitation ─────────────────────────────────────────────────
@router.post("/generate/single/{exam_id}/{student_id}", status_code=201)
def generate_single_invitation(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    exam_query = db.query(Exam).filter(Exam.id == exam_id)
    if current_user.get("role") != "admin":
        exam_query = exam_query.filter(Exam.created_by == current_user["user_id"])
    exam = exam_query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    inv = db.query(ExamInvitation).filter(
        ExamInvitation.exam_id == exam_id,
        ExamInvitation.student_id == student_id,
    ).first()
    if not inv:
        inv = ExamInvitation(exam_id=exam_id, student_id=student_id)
        db.add(inv)
        db.flush()

    assets = generate_invitation_assets(
        student_id=student_id,
        exam_id=exam_id,
        invitation_id=inv.id,
        exam_end_time=exam.end_time,
    )
    inv.qr_token = assets["qr_token"]
    inv.unique_exam_link = assets["unique_exam_link"]
    inv.qr_code = assets["qr_code"]
    inv.is_used = False
    db.commit()
    return {"message": "Invitation generated", "exam_link": inv.unique_exam_link}


# ── Send Emails (bulk, background, class-wise) ────────────────────────────────
@router.post("/send-email/{exam_id}", status_code=202)
async def send_invitations_email(
    exam_id: int,
    background_tasks: BackgroundTasks,
    class_id: Optional[int] = Query(None, description="Send only to students in this class"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """
    Send invitation emails for an exam.
    - Pass ?class_id=X to send only to students in that class.
    - Omit to send to ALL students with QR codes.
    Uses the admin's own Gmail if configured under Settings.
    """
    exam_query = db.query(Exam).filter(Exam.id == exam_id)
    if current_user.get("role") != "admin":
        exam_query = exam_query.filter(Exam.created_by == current_user["user_id"])
    exam = exam_query.first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Base query — only invitations that have a QR code
    inv_query = db.query(ExamInvitation).filter(
        ExamInvitation.exam_id == exam_id,
        ExamInvitation.qr_code.isnot(None),
    )
    invitations = inv_query.all()

    if not invitations:
        raise HTTPException(status_code=400, detail="No QR codes found. Generate QR codes first.")

    # Get admin SMTP credentials
    smtp_creds = _get_teacher_smtp(db, current_user["user_id"])

    # Collect all data BEFORE the request's DB session closes
    jobs = []
    for inv in invitations:
        student = db.query(Student).filter(Student.id == inv.student_id).first()
        if not student:
            continue
        # Filter by class if requested
        if class_id is not None and student.class_id != class_id:
            continue
        jobs.append({
            "invitation_id": inv.id,
            "student_email": student.email,
            "student_name": student.name,
            "exam_title": exam.title,
            "duration": exam.duration,
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "exam_link": inv.unique_exam_link,
            "qr_code_base64": inv.qr_code,
            "smtp_user": smtp_creds["smtp_user"],
            "smtp_password": smtp_creds["smtp_password"],
            "sender_name": smtp_creds["sender_name"],
        })

    if not jobs:
        raise HTTPException(
            status_code=400,
            detail=f"No students with QR codes found in class {class_id}" if class_id
                   else "No students with QR codes found",
        )

    def _send_all(email_jobs: list):
        """Sync background task — FastAPI runs in its threadpool."""
        bg_db = SessionLocal()
        sent = failed = 0
        try:
            for job in email_jobs:
                ok, err = send_exam_invitation_sync(
                    student_email=job["student_email"],
                    student_name=job["student_name"],
                    exam_title=job["exam_title"],
                    duration=job["duration"],
                    start_time=job["start_time"],
                    end_time=job["end_time"],
                    exam_link=job["exam_link"],
                    qr_code_base64=job["qr_code_base64"],
                    smtp_user=job["smtp_user"],
                    smtp_password=job["smtp_password"],
                    sender_name=job["sender_name"],
                )
                inv_rec = bg_db.query(ExamInvitation).filter(
                    ExamInvitation.id == job["invitation_id"]
                ).first()
                if inv_rec:
                    inv_rec.email_sent = ok
                    if ok:
                        inv_rec.email_sent_at = datetime.now(timezone.utc)
                        sent += 1
                    else:
                        failed += 1
                        print(f"[SEND ALL] Failed {job['student_email']}: {err}")
            bg_db.commit()
            print(f"[SEND ALL DONE] Sent={sent}, Failed={failed}")
        except Exception as e:
            print(f"[SEND ALL CRASH] {e}")
            bg_db.rollback()
        finally:
            bg_db.close()

    background_tasks.add_task(_send_all, jobs)
    return {
        "message": f"Sending to {len(jobs)} students in background",
        "count": len(jobs),
        "class_id": class_id,
        "sending_from": smtp_creds["smtp_user"] or "system default",
    }


# ── Resend single (synchronous — shows real error) ────────────────────────────
@router.post("/send-email/single/{invitation_id}", status_code=200)
async def resend_single_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    inv = db.query(ExamInvitation).filter(ExamInvitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not inv.qr_code:
        raise HTTPException(status_code=400, detail="Generate QR code first")

    exam = db.query(Exam).filter(Exam.id == inv.exam_id).first()
    student = db.query(Student).filter(Student.id == inv.student_id).first()
    smtp_creds = _get_teacher_smtp(db, current_user["user_id"])

    ok, err = send_exam_invitation_sync(
        student_email=student.email,
        student_name=student.name,
        exam_title=exam.title,
        duration=exam.duration,
        start_time=exam.start_time,
        end_time=exam.end_time,
        exam_link=inv.unique_exam_link,
        qr_code_base64=inv.qr_code,
        smtp_user=smtp_creds["smtp_user"],
        smtp_password=smtp_creds["smtp_password"],
        sender_name=smtp_creds["sender_name"],
    )

    if ok:
        inv.email_sent = True
        inv.email_sent_at = datetime.now(timezone.utc)
        db.commit()
    else:
        raise HTTPException(status_code=500, detail=f"Email failed: {err}")

    return {
        "success": True,
        "student_email": student.email,
        "sent_from": smtp_creds["smtp_user"] or "system default",
    }


# ── Verify QR ──────────────────────────────────────────────────────────────────
@router.post("/verify-qr")
def verify_qr(payload: QRVerifyRequest, db: Session = Depends(get_db)):
    data = verify_qr_token(payload.token)
    student_id   = int(data["sub"])
    exam_id      = data["exam_id"]
    invitation_id = data["invitation_id"]

    student = db.query(Student).filter(Student.id == student_id).first()
    exam    = db.query(Exam).filter(Exam.id == exam_id).first()
    inv     = db.query(ExamInvitation).filter(ExamInvitation.id == invitation_id).first()

    if not student or not exam or not inv:
        raise HTTPException(status_code=404, detail="Invalid token — record not found")

    return {
        "valid": True,
        "student_id": student_id,
        "exam_id": exam_id,
        "invitation_id": invitation_id,
        "student_email": student.email,
        "student_name": student.name,
        "exam_title": exam.title,
        "exam_duration": exam.duration,
        "exam_start": str(exam.start_time),
        "exam_end": str(exam.end_time),
        "is_used": inv.is_used,
    }


# ── Get invitations for an exam ────────────────────────────────────────────────
@router.get("/{exam_id}")
def get_exam_invitations(
    exam_id: int,
    class_id: Optional[int] = Query(None, description="Filter by class"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    invitations = db.query(ExamInvitation).filter(
        ExamInvitation.exam_id == exam_id
    ).all()

    result = []
    for inv in invitations:
        student = db.query(Student).filter(Student.id == inv.student_id).first()
        if class_id is not None and (not student or student.class_id != class_id):
            continue
        result.append({
            "id": inv.id,
            "exam_id": inv.exam_id,
            "student_id": inv.student_id,
            "student_name": student.name if student else "Unknown",
            "student_email": student.email if student else "",
            "student_roll": student.roll_number if student else None,
            "student_class_id": student.class_id if student else None,
            "qr_code": inv.qr_code,
            "unique_exam_link": inv.unique_exam_link,
            "email_sent": inv.email_sent,
            "email_sent_at": str(inv.email_sent_at) if inv.email_sent_at else None,
            "is_used": inv.is_used,
            "created_at": str(inv.created_at),
        })
    return result

