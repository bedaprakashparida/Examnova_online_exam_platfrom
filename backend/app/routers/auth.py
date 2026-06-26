from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import random
import string

from app.database import get_db
from app.schemas.schemas import (
    TeacherRegister, TeacherLogin, StudentLogin, Token, TeacherOut, StudentOut
)
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.invitation import ExamInvitation
from app.services.auth_service import (
    hash_password, authenticate_teacher, authenticate_student,
    create_access_token, get_teacher_by_email, get_student_by_email
)
from app.services.qr_service import verify_qr_token
from app.services.email_service import test_smtp_connection_sync
from app.middleware.auth_middleware import get_current_user, require_teacher_or_admin
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EXPIRY_MINUTES = 10


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


def _send_otp_email(to_email: str, name: str, otp: str, purpose: str = "login") -> bool:
    import smtplib, ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    subject = "Your OTP — ExamNova"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#f8fafc;border-radius:16px;padding:32px;text-align:center">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:20px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:22px">ExamNova</h1>
      </div>
      <h2 style="color:#1e293b;margin-bottom:8px">Your Verification Code</h2>
      <p style="color:#64748b;margin-bottom:24px">Hi {name}, use this OTP to {purpose}:</p>
      <div style="background:#1e293b;border-radius:12px;padding:24px;margin:24px 0">
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#a5b4fc;font-family:monospace">{otp}</span>
      </div>
      <p style="color:#94a3b8;font-size:14px">Expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>. Do not share.</p>
    </div>
    """
    smtp_pass = settings.SMTP_PASSWORD.replace(" ", "")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"ExamNova <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    import ssl as _ssl
    ctx = _ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=30) as s:
            s.login(settings.SMTP_USER, smtp_pass)
            s.send_message(msg)
        print(f"[OTP SENT] -> {to_email}")
        return True
    except Exception as e:
        print(f"[OTP FAIL] -> {to_email}: {e}")
        return False


def _send_welcome_email(to_email: str, name: str, password: str, role: str = "teacher") -> bool:
    """Send a welcome email to a newly created teacher/admin with their login credentials."""
    import smtplib, ssl as _ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    role_label = "Admin" if role == "admin" else "Teacher"
    login_url  = "http://localhost:5173/teacher/login" if role == "teacher" else "http://localhost:5173/admin/login"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#f8fafc;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center">
        <h1 style="color:white;margin:0;font-size:26px">Welcome to ExamNova</h1>
        <p style="color:#bfdbfe;margin:8px 0 0">Your {role_label} account has been created</p>
      </div>
      <div style="padding:32px">
        <p style="color:#1e293b;font-size:16px">Hi <strong>{name}</strong>,</p>
        <p style="color:#475569">Your account has been created by the system administrator. Here are your login credentials:</p>
        <div style="background:#1e293b;border-radius:12px;padding:24px;margin:20px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="color:#94a3b8;padding:6px 0;font-size:14px">Email</td>
              <td style="color:#e2e8f0;font-weight:bold;text-align:right">{to_email}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;font-size:14px">Password</td>
              <td style="color:#a5b4fc;font-weight:bold;text-align:right;font-family:monospace;font-size:16px">{password}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;font-size:14px">Role</td>
              <td style="color:#34d399;font-weight:bold;text-align:right">{role_label}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="{login_url}" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">
            Login to Your Dashboard →
          </a>
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center">
          ⚠️ Please change your password after first login.<br/>
          Do not share your credentials with anyone.
        </p>
      </div>
    </div>
    """
    smtp_pass = settings.SMTP_PASSWORD.replace(" ", "")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your ExamNova {role_label} Account — Login Credentials"
    msg["From"]    = f"ExamNova <{settings.SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    ctx = _ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=30) as s:
            s.login(settings.SMTP_USER, smtp_pass)
            s.send_message(msg)
        print(f"[WELCOME SENT] -> {to_email}")
        return True
    except Exception as e:
        print(f"[WELCOME FAIL] -> {to_email}: {e}")
        return False


def _jwt_role_for(teacher: Teacher) -> str:
    """Map teacher_role column to JWT role string."""
    return teacher.teacher_role if teacher.teacher_role in ("admin", "teacher") else "teacher"


def _make_token(teacher: Teacher) -> Token:
    role = _jwt_role_for(teacher)
    token = create_access_token(
        {"sub": str(teacher.id), "role": role, "email": teacher.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(
        access_token=token,
        role=role,
        user_id=teacher.id,
        name=teacher.name,
        email=teacher.email,
        needs_password_change=teacher.needs_password_change,
    )


# ── Step 1: Request OTP (shared for teacher + admin login) ───────────────────

@router.post("/login/request-otp")
def login_request_otp(payload: TeacherLogin, db: Session = Depends(get_db)):
    """Verify password → send OTP → return email. Works for both teacher and admin."""
    teacher = authenticate_teacher(db, payload.email, payload.password)
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    otp    = _generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    teacher.otp_code   = otp
    teacher.otp_expiry = expiry
    db.commit()

    sent = _send_otp_email(teacher.email, teacher.name, otp, "sign in")
    # Even if email fails, return the OTP in the response so admin can still log in
    # In production you would hide the otp field
    resp = {
        "message": f"OTP sent to {teacher.email}" if sent else "Email failed — use the OTP shown below",
        "email": teacher.email,
        "role":  _jwt_role_for(teacher),
        "email_sent": sent,
    }
    if not sent:
        resp["otp"] = otp   # fallback: show OTP directly if email fails
    return resp



# Legacy aliases (keep old frontend URLs working)
@router.post("/login/admin/request-otp")
def admin_login_request_otp(payload: TeacherLogin, db: Session = Depends(get_db)):
    try:
        return login_request_otp(payload, db)
    except Exception as e:
        import traceback
        return {
            "error_type": type(e).__name__,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@router.post("/login/teacher/request-otp")
def teacher_login_request_otp(payload: TeacherLogin, db: Session = Depends(get_db)):
    return login_request_otp(payload, db)


# ── Step 2: Verify OTP (shared) ──────────────────────────────────────────────

@router.post("/login/verify-otp", response_model=Token)
def login_verify_otp(payload: dict, db: Session = Depends(get_db)):
    """Verify OTP, return JWT. Works for both teacher and admin."""
    email = payload.get("email", "").strip().lower()
    otp   = payload.get("otp", "").strip()

    teacher = get_teacher_by_email(db, email)
    if not teacher:
        raise HTTPException(status_code=404, detail="Account not found")
    if not teacher.otp_code or teacher.otp_code != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if teacher.otp_expiry and datetime.utcnow() > teacher.otp_expiry:
        teacher.otp_code = None; teacher.otp_expiry = None; db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please try again.")

    teacher.otp_code = None; teacher.otp_expiry = None
    db.commit()
    return _make_token(teacher)


# Legacy aliases
@router.post("/login/admin/verify-otp", response_model=Token)
def admin_login_verify_otp(payload: dict, db: Session = Depends(get_db)):
    return login_verify_otp(payload, db)

@router.post("/login/teacher/verify-otp", response_model=Token)
def teacher_login_verify_otp(payload: dict, db: Session = Depends(get_db)):
    return login_verify_otp(payload, db)


# ── Register: Step 1 — send OTP ─────────────────────────────────────────────

@router.post("/register/send-otp")
def register_send_otp(payload: dict, db: Session = Depends(get_db)):
    """Register new teacher or admin account, send OTP. Body: {name, email, password, role?}"""
    email       = payload.get("email", "").strip().lower()
    name        = payload.get("name", "").strip()
    pwd         = payload.get("password", "")
    new_role    = payload.get("role", "teacher")  # 'teacher' or 'admin'

    if not email or not name or not pwd:
        raise HTTPException(status_code=400, detail="Name, email and password are required")
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if get_teacher_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if new_role not in ("teacher", "admin"):
        new_role = "teacher"

    otp    = _generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    teacher = Teacher(
        name=name, email=email,
        password_hash=hash_password(pwd),
        teacher_role=new_role,
        otp_code=otp, otp_expiry=expiry,
        is_verified=False,
    )
    db.add(teacher); db.commit(); db.refresh(teacher)

    sent = _send_otp_email(email, name, otp, "verify your account")
    if not sent:
        db.delete(teacher); db.commit()
        raise HTTPException(status_code=500, detail="Could not send OTP. Check SMTP settings.")

    return {"message": f"OTP sent to {email}", "email": email}


# Legacy aliases
@router.post("/register/admin/send-otp")
def register_admin_send_otp(payload: dict, db: Session = Depends(get_db)):
    payload["role"] = "admin"
    return register_send_otp(payload, db)

@router.post("/register/teacher/send-otp")
def register_teacher_send_otp(payload: dict, db: Session = Depends(get_db)):
    payload["role"] = "teacher"
    return register_send_otp(payload, db)


# ── Register: Step 2 — verify OTP ────────────────────────────────────────────

@router.post("/register/verify-otp", response_model=Token)
def register_verify_otp(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    otp   = payload.get("otp", "").strip()

    teacher = get_teacher_by_email(db, email)
    if not teacher:
        raise HTTPException(status_code=404, detail="Account not found")
    if not teacher.otp_code or teacher.otp_code != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if teacher.otp_expiry and datetime.utcnow() > teacher.otp_expiry:
        db.delete(teacher); db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please register again.")

    teacher.otp_code = None; teacher.otp_expiry = None; teacher.is_verified = True
    db.commit()
    return _make_token(teacher)


# Legacy aliases
@router.post("/register/admin/verify-otp", response_model=Token)
def register_admin_verify_otp(payload: dict, db: Session = Depends(get_db)):
    return register_verify_otp(payload, db)

@router.post("/register/teacher/verify-otp", response_model=Token)
def register_teacher_verify_otp(payload: dict, db: Session = Depends(get_db)):
    return register_verify_otp(payload, db)


# ── Student Login ────────────────────────────────────────────────────────────

@router.post("/login/student", response_model=Token)
def login_student(payload: StudentLogin, db: Session = Depends(get_db)):
    student = authenticate_student(db, payload.email, payload.password)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(
        {"sub": str(student.id), "role": "student", "email": student.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token, role="student", user_id=student.id, name=student.name, email=student.email)


# ── Exam Token Login (passwordless student) ──────────────────────────────────

@router.post("/exam-token-login", response_model=Token)
def exam_token_login(payload: dict, db: Session = Depends(get_db)):
    raw_token = payload.get("token", "").strip()
    if not raw_token:
        raise HTTPException(status_code=400, detail="Token is required")
    try:
        data = verify_qr_token(raw_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired exam link")

    student_id    = int(data["sub"])
    invitation_id = data.get("invitation_id")
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if invitation_id:
        inv = db.query(ExamInvitation).filter(ExamInvitation.id == invitation_id).first()
        if inv and inv.is_used:
            raise HTTPException(status_code=403, detail="This exam link has already been used.")

    jwt = create_access_token(
        {"sub": str(student.id), "role": "student", "email": student.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=jwt, role="student", user_id=student.id, name=student.name, email=student.email)


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-otp")
def resend_otp(payload: dict, db: Session = Depends(get_db)):
    email   = payload.get("email", "").strip().lower()
    teacher = get_teacher_by_email(db, email)
    if not teacher:
        raise HTTPException(status_code=404, detail="Account not found")
    otp    = _generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    teacher.otp_code = otp; teacher.otp_expiry = expiry
    db.commit()
    sent = _send_otp_email(email, teacher.name, otp, "sign in")
    if not sent:
        raise HTTPException(status_code=500, detail="Could not send OTP email")
    return {"message": f"OTP resent to {email}"}


@router.post("/forgot-password/request-otp")
def forgot_password_request_otp(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    teacher = get_teacher_by_email(db, email)
    if not teacher:
        raise HTTPException(status_code=404, detail="No account found with this email")

    otp = _generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    teacher.otp_code = otp
    teacher.otp_expiry = expiry
    db.commit()

    sent = _send_otp_email(email, teacher.name, otp, "reset your password")
    resp = {"message": f"OTP sent to {email}" if sent else "Email failed - use the OTP shown below"}
    if not sent:
        resp["otp"] = otp
    return resp


@router.post("/forgot-password/reset")
def forgot_password_reset(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    otp = payload.get("otp", "").strip()
    new_password = payload.get("new_password", "").strip()

    if not email or not otp or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP and new password are required")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    teacher = get_teacher_by_email(db, email)
    if not teacher:
        raise HTTPException(status_code=404, detail="No account found with this email")

    if not teacher.otp_code or teacher.otp_code != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if teacher.otp_expiry and datetime.utcnow() > teacher.otp_expiry:
        teacher.otp_code = None
        teacher.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please try again.")

    teacher.otp_code = None
    teacher.otp_expiry = None
    teacher.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully"}


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = current_user["user"]
    smtp_configured = bool(getattr(user, 'smtp_email', None))
    result = {
        "user_id":          current_user["user_id"],
        "role":             current_user["role"],
        "name":             user.name,
        "email":            user.email,
        "smtp_configured":  smtp_configured,
        "smtp_email":       getattr(user, 'smtp_email', None) if smtp_configured else None,
    }
    if current_user["role"] in ("admin", "teacher"):
        result["teacher_role"] = getattr(user, 'teacher_role', 'teacher')
    return result


# ── SMTP Settings ─────────────────────────────────────────────────────────────

@router.get("/smtp-settings")
def get_smtp_settings(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not authorized")
    teacher = db.query(Teacher).filter(Teacher.id == current_user["user_id"]).first()
    return {
        "smtp_email":       teacher.smtp_email or "",
        "smtp_configured":  bool(teacher.smtp_email and teacher.smtp_password),
    }


@router.put("/smtp-settings")
def update_smtp_settings(payload: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not authorized")
    teacher = db.query(Teacher).filter(Teacher.id == current_user["user_id"]).first()
    smtp_email    = payload.get("smtp_email", "").strip()
    smtp_password = payload.get("smtp_password", "").strip()
    teacher.smtp_email    = smtp_email    or None
    teacher.smtp_password = smtp_password or None
    db.commit()
    return {"message": "SMTP settings saved" if smtp_email else "Reverted to system SMTP"}


@router.post("/smtp-settings/test")
def test_smtp_settings(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Not authorized")
    teacher = db.query(Teacher).filter(Teacher.id == current_user["user_id"]).first()
    result  = test_smtp_connection_sync(smtp_user=teacher.smtp_email or None, smtp_password=teacher.smtp_password or None)
    result["using"] = teacher.smtp_email or "system default"
    return result


# ── Admin: manage teachers ────────────────────────────────────────────────────

@router.get("/admin/teachers")
def list_teachers(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    teachers = db.query(Teacher).all()
    return [
        {
            "id":           t.id,
            "name":         t.name,
            "email":        t.email,
            "teacher_role": t.teacher_role,
            "created_at":   str(t.created_at),
        }
        for t in teachers
    ]


@router.post("/admin/teachers", status_code=201)
def create_teacher_by_admin(payload: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Admin creates a teacher account and emails login credentials to the teacher."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    email = payload.get("email", "").strip().lower()
    name  = payload.get("name", "").strip()
    pwd   = payload.get("password", "")
    role  = payload.get("teacher_role", "teacher")

    if not email or not name or not pwd:
        raise HTTPException(status_code=400, detail="Name, email and password required")
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if get_teacher_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")

    teacher = Teacher(
        name=name, email=email,
        password_hash=hash_password(pwd),
        teacher_role=role,
        is_verified=True,
        needs_password_change=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    # Send welcome email with credentials
    _send_welcome_email(teacher.email, teacher.name, pwd, role)

    return {"id": teacher.id, "name": teacher.name, "email": teacher.email, "teacher_role": teacher.teacher_role,
            "email_sent": True}


@router.delete("/admin/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if teacher_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    db.delete(t); db.commit()
    return {"message": "Teacher deleted"}


@router.patch("/admin/teachers/{teacher_id}/role")
def change_teacher_role(teacher_id: int, payload: dict, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    new_role = payload.get("teacher_role", "teacher")
    t = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Teacher not found")
    t.teacher_role = new_role; db.commit()
    return {"message": f"Role updated to {new_role}"}


@router.post("/change-password")
def change_password(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin)
):
    """Change the user's password and reset needs_password_change flag."""
    new_password = payload.get("new_password", "").strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    teacher = db.query(Teacher).filter(Teacher.id == current_user["user_id"]).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="User not found")
        
    teacher.password_hash = hash_password(new_password)
    teacher.needs_password_change = False
    db.commit()
    
    # Return a new token so the frontend's needs_password_change is updated to false
    return _make_token(teacher)
