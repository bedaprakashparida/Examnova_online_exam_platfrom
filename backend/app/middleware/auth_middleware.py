from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_service import decode_token
from app.models.teacher import Teacher
from app.models.student import Student

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """Decode JWT and return user dict with role.
    Roles: 'admin', 'teacher', 'student'
    """
    token   = credentials.credentials
    payload = decode_token(token)

    user_id = payload.get("sub")
    role    = payload.get("role")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if role in ("admin", "teacher"):
        user = db.query(Teacher).filter(Teacher.id == int(user_id)).first()
    elif role == "student":
        user = db.query(Student).filter(Student.id == int(user_id)).first()
    else:
        raise HTTPException(status_code=401, detail="Unknown role")

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"user": user, "role": role, "user_id": int(user_id)}


def require_admin(current_user: dict = Depends(get_current_user)):
    """Strictly super-admin only."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_teacher_or_admin(current_user: dict = Depends(get_current_user)):
    """Allow both teacher and admin roles (any staff)."""
    if current_user["role"] not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access required")
    return current_user

# Alias for backwards-compat with existing routers
require_staff = require_teacher_or_admin


def require_student(current_user: dict = Depends(get_current_user)):
    """Dependency that enforces student role."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user
