import smtplib
import base64
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from datetime import datetime

from app.config import settings

# ── HTML Templates (no emoji — pure ASCII-safe) ────────────────────────────────

EMAIL_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Exam Invitation</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }}
  .container {{ max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px;
               box-shadow: 0 4px 24px rgba(0,0,0,.1); overflow: hidden; }}
  .header {{ background: linear-gradient(135deg,#6366f1,#4f46e5); padding: 40px 30px;
             text-align: center; color: #fff; }}
  .header h1 {{ margin: 0; font-size: 26px; }}
  .header p  {{ margin: 8px 0 0; opacity: .85; font-size: 14px; }}
  .body {{ padding: 36px 36px 24px; }}
  .greeting {{ font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }}
  .info-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 20px 24px; margin: 20px 0; }}
  .info-row {{ display: flex; justify-content: space-between; margin: 8px 0;
               font-size: 14px; color: #475569; }}
  .info-label {{ font-weight: 600; color: #334155; }}
  .qr-section {{ text-align: center; margin: 28px 0; }}
  .qr-section p {{ color: #64748b; font-size: 14px; margin-bottom: 12px; }}
  .qr-section img {{ border: 3px solid #e2e8f0; border-radius: 12px; padding: 8px; max-width: 200px; }}
  .btn {{ display: inline-block; background: linear-gradient(135deg,#6366f1,#4f46e5);
          color: #fff !important; text-decoration: none; padding: 14px 36px;
          border-radius: 50px; font-weight: 700; font-size: 16px; margin: 20px 0; }}
  .btn-wrap {{ text-align: center; margin: 24px 0; }}
  .note {{ background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;
           padding: 12px 16px; font-size: 13px; color: #92400e; margin: 20px 0; }}
  .footer {{ background: #f8fafc; padding: 20px 36px; text-align: center;
             font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Exam Invitation</h1><p>{app_name}</p></div>
  <div class="body">
    <div class="greeting">Hello, {student_name}!</div>
    <p style="color:#475569;line-height:1.6;">
      You are invited to take an online examination.
      Use your exam link or the button below to access your exam.
    </p>
    <div class="info-card">
      <div class="info-row"><span class="info-label">Exam</span><span>{exam_title}</span></div>
      <div class="info-row"><span class="info-label">Duration</span><span>{duration} minutes</span></div>
      <div class="info-row"><span class="info-label">Start</span><span>{start_time}</span></div>
      <div class="info-row"><span class="info-label">End</span><span>{end_time}</span></div>
      <div class="info-row"><span class="info-label">Login Email</span><span>{student_email}</span></div>
    </div>
    <div class="qr-section">
      <p>Your unique exam access QR code:</p>
      <img src="cid:qr_code_image" alt="Exam Access Code" />
    </div>
    <div class="btn-wrap"><a href="{exam_link}" class="btn">Start Exam Now</a></div>
    <div class="note">
      <strong>Important:</strong> Your exam link is unique to you — do not share it.
      Keep it safe. The link expires after the exam ends.
    </div>
    <div class="note" style="background:#e0f2fe;border-left:4px solid #0284c7;color:#0369a1;margin-top:16px;">
      <strong>Dashboard Access:</strong> If your direct link displays an Access Denied error (e.g. if the link has expired), you can log in to the Student Dashboard using:
      <br/>• Email: <code>{student_email}</code>
      <br/>• Password: <em>(Use your student account password)</em>
    </div>
  </div>
  <div class="footer">
    <p>&copy; {year} {app_name}</p>
    <p>This is an automated message. Do not reply.</p>
  </div>
</div>
</body>
</html>
"""

RESULT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Exam Result</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }}
  .container {{ max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px;
               box-shadow: 0 4px 24px rgba(0,0,0,.1); overflow: hidden; }}
  .header {{ background: linear-gradient(135deg,{header_color}); padding: 40px 30px;
             text-align: center; color: #fff; }}
  .header h1 {{ margin: 0; font-size: 26px; }}
  .body {{ padding: 36px; }}
  .result-card {{ background: #f8fafc; border-radius: 12px; padding: 28px; text-align: center; margin: 20px 0; }}
  .score {{ font-size: 56px; font-weight: 800; color: {score_color}; }}
  .grade {{ font-size: 22px; font-weight: 700; color: #334155; margin-top: 8px; }}
  .status {{ display: inline-block; padding: 6px 20px; border-radius: 50px;
             background: {status_bg}; color: {status_color}; font-weight: 700; font-size: 14px; }}
  .info-row {{ display: flex; justify-content: space-between; margin: 10px 0;
               font-size: 14px; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
  .footer {{ background: #f8fafc; padding: 20px 36px; text-align: center;
             font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>Exam Result</h1><p>{app_name}</p></div>
  <div class="body">
    <p style="font-size:18px;font-weight:600;color:#1e293b;">Hello, {student_name}!</p>
    <p style="color:#475569;">Your result for <strong>{exam_title}</strong> is ready.</p>
    <div class="result-card">
      <div class="score">{percentage}%</div>
      <div class="grade">Grade: {grade}</div>
      <div style="margin-top:12px;"><span class="status">{pass_fail}</span></div>
    </div>
    <div style="margin-top:24px;">
      <div class="info-row"><span>Score</span><span><strong>{score} / {total_marks}</strong></span></div>
      <div class="info-row"><span>Exam</span><span>{exam_title}</span></div>
      <div class="info-row"><span>Submitted</span><span>{submitted_at}</span></div>
    </div>
  </div>
  <div class="footer"><p>&copy; {year} {app_name}</p></div>
</div>
</body>
</html>
"""


def _do_send(msg: MIMEMultipart, smtp_user: str = None, smtp_pass_raw: str = None) -> tuple:
    """
    Synchronous SMTP send using SMTP_SSL (port 465).
    If smtp_user/smtp_pass_raw are provided they override the system .env credentials.
    Returns (success: bool, error: str).
    """
    user = smtp_user or settings.SMTP_USER
    raw  = smtp_pass_raw or settings.SMTP_PASSWORD
    pwd  = raw.replace(" ", "")   # strip spaces from App Password
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    ctx  = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=30) as server:
            server.login(user, pwd)
            server.send_message(msg)
        return True, ""
    except smtplib.SMTPAuthenticationError as e:
        return False, f"Auth failed — check Gmail App Password: {e}"
    except smtplib.SMTPException as e:
        return False, f"SMTP error: {e}"
    except OSError as e:
        return False, f"Network error: {e}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def send_exam_invitation_sync(
    student_email: str,
    student_name: str,
    exam_title: str,
    duration: int,
    start_time: datetime,
    end_time: datetime,
    exam_link: str,
    qr_code_base64: str,
    smtp_user: str = None,
    smtp_password: str = None,
    sender_name: str = None,
) -> tuple:
    """
    SYNCHRONOUS invitation email sender.
    smtp_user/smtp_password override system .env if provided (per-admin sending).
    Returns (success: bool, error: str).
    """
    try:
        from_email = smtp_user or settings.SMTP_USER
        from_name  = sender_name or settings.SMTP_FROM_NAME

        msg = MIMEMultipart("related")
        msg["Subject"] = f"Exam Invitation: {exam_title}"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = student_email

        html = EMAIL_TEMPLATE.format(
            app_name=settings.APP_NAME,
            student_name=student_name,
            student_email=student_email,
            exam_title=exam_title,
            duration=duration,
            start_time=start_time.strftime("%d %b %Y, %I:%M %p"),
            end_time=end_time.strftime("%d %b %Y, %I:%M %p"),
            exam_link=exam_link,
            year=datetime.now().year,
        )

        alt = MIMEMultipart("alternative")
        msg.attach(alt)
        alt.attach(MIMEText(html, "html", "utf-8"))

        if qr_code_base64 and "base64," in qr_code_base64:
            img_data = base64.b64decode(qr_code_base64.split("base64,")[1])
            img = MIMEImage(img_data, name="qr_code.png")
            img.add_header("Content-ID", "<qr_code_image>")
            img.add_header("Content-Disposition", "inline", filename="qr_code.png")
            msg.attach(img)

        ok, err = _do_send(msg, smtp_user=smtp_user, smtp_pass_raw=smtp_password)
        if ok:
            print(f"[EMAIL OK] -> {student_email} (from: {from_email})")
        else:
            print(f"[EMAIL FAIL] -> {student_email}: {err}")
        return ok, err

    except Exception as e:
        err = f"Build error: {e}"
        print(f"[EMAIL BUILD ERROR] {err}")
        return False, err


def send_result_notification_sync(
    student_email: str,
    student_name: str,
    exam_title: str,
    score: int,
    total_marks: int,
    percentage: float,
    grade: str,
    pass_fail: str,
    submitted_at: datetime,
) -> tuple:
    """SYNCHRONOUS result notification email. Returns (success, error)."""
    try:
        is_pass = pass_fail == "Pass"
        html = RESULT_TEMPLATE.format(
            app_name=settings.APP_NAME,
            student_name=student_name,
            exam_title=exam_title,
            score=score,
            total_marks=total_marks,
            percentage=round(percentage, 2),
            grade=grade,
            pass_fail=pass_fail,
            submitted_at=submitted_at.strftime("%d %b %Y, %I:%M %p"),
            year=datetime.now().year,
            header_color="#10b981 0%, #059669 100%" if is_pass else "#ef4444 0%, #dc2626 100%",
            score_color="#059669" if is_pass else "#dc2626",
            status_bg="#d1fae5" if is_pass else "#fee2e2",
            status_color="#065f46" if is_pass else "#991b1b",
        )
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Result Published: {exam_title}"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = student_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        return _do_send(msg)
    except Exception as e:
        return False, str(e)


def test_smtp_connection_sync(smtp_user: str = None, smtp_password: str = None) -> dict:
    """Test SMTP login. Uses override credentials if provided, else system .env."""
    user = smtp_user or settings.SMTP_USER
    raw  = smtp_password or settings.SMTP_PASSWORD
    pwd  = raw.replace(" ", "")
    ctx  = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=15) as s:
            s.login(user, pwd)
        return {"ok": True, "user": user, "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT, "message": "SMTP connection successful"}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}",
                "hint": "Check Gmail App Password in Settings"}


# Keep async aliases for any code that awaits these
async def send_exam_invitation(*args, **kwargs):
    return send_exam_invitation_sync(*args, **kwargs)

async def send_result_notification(*args, **kwargs):
    return send_result_notification_sync(*args, **kwargs)

async def test_smtp_connection():
    return test_smtp_connection_sync()
