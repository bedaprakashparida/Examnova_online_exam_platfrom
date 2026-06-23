import qrcode
import io
import base64
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status

from app.config import settings


def generate_qr_token(student_id: int, exam_id: int, invitation_id: int, exam_end_time: datetime) -> str:
    """Generate a signed JWT token for QR code access."""
    expire = exam_end_time + timedelta(hours=1)  # token valid until 1h after exam ends
    payload = {
        "sub": str(student_id),
        "exam_id": exam_id,
        "invitation_id": invitation_id,
        "type": "qr_access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.QR_SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_qr_token(token: str) -> dict:
    """Verify and decode a QR token."""
    try:
        payload = jwt.decode(token, settings.QR_SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "qr_access":
            raise HTTPException(status_code=400, detail="Invalid QR token type")
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired QR code: {str(e)}"
        )


def generate_qr_code_image(data: str) -> str:
    """Generate a QR code image from a URL and return base64 encoded string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1e293b", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")
    return f"data:image/png;base64,{img_base64}"


def generate_exam_link(token: str) -> str:
    """Generate the full exam access URL containing the QR token."""
    return f"{settings.FRONTEND_URL}/exam/access?token={token}"


def generate_invitation_assets(
    student_id: int,
    exam_id: int,
    invitation_id: int,
    exam_end_time: datetime
) -> dict:
    """
    Generate all assets for an exam invitation:
    - QR token (JWT)
    - Exam link (URL with token)
    - QR code image (base64 PNG)
    """
    token = generate_qr_token(student_id, exam_id, invitation_id, exam_end_time)
    exam_link = generate_exam_link(token)
    qr_image = generate_qr_code_image(exam_link)

    return {
        "qr_token": token,
        "unique_exam_link": exam_link,
        "qr_code": qr_image,
    }
