from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import secrets
import string

from app.database import get_db
from app.schemas.schemas import StudentCreate, StudentUpdate, StudentOut
from app.models.student import Student
from app.services.auth_service import hash_password, get_student_by_email
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/students", tags=["Students"])


def generate_temp_password(length: int = 10) -> str:
    """Generate a secure random password for new students."""
    alphabet = string.ascii_letters + string.digits + "!@#$"
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/", status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Create a new student account. Admin only."""
    if get_student_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    student = Student(
        name=payload.name,
        email=payload.email,
        roll_number=payload.roll_number,
        password_hash=hash_password(payload.password),
        class_id=getattr(payload, 'class_id', None),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {
        "id": student.id,
        "name": student.name,
        "email": student.email,
        "roll_number": student.roll_number,
        "class_id": student.class_id,
        "created_at": str(student.created_at),
    }


@router.get("/", response_model=List[StudentOut])
def list_students(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """List all students. Admin only."""
    return db.query(Student).order_by(Student.created_at.desc()).all()


@router.get("/me", response_model=StudentOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current student profile."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")
    return current_user["user"]


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get student by ID. Admin only."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/me/photo")
def update_profile_photo(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update student's profile/verification photo."""
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")

    student = current_user["user"]
    student.profile_photo = payload.get("photo_data")
    db.commit()
    return {"message": "Photo updated successfully"}


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Delete student. Admin only."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()


@router.post("/bulk-upload", status_code=201)
async def bulk_upload_students(
    file: UploadFile = File(...),
    class_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """
    Bulk upload students from CSV.
    CSV columns: name, email, roll_number (optional)
    Auto-generates passwords. Optionally assigns all to class_id.
    """
    contents = await file.read()
    decoded = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    created = []
    errors = []

    for i, row in enumerate(reader, 2):
        try:
            email = row.get("email", "").strip().lower()
            name = row.get("name", "").strip()
            roll = row.get("roll_number", "").strip() or None

            if not email or not name:
                errors.append(f"Row {i}: Missing name or email")
                continue

            if get_student_by_email(db, email):
                errors.append(f"Row {i}: Email {email} already exists")
                continue

            temp_password = generate_temp_password()
            student = Student(
                name=name,
                email=email,
                roll_number=roll,
                password_hash=hash_password(temp_password),
                class_id=class_id,
            )
            db.add(student)
            db.flush()

            created.append({
                "id": student.id,
                "name": name,
                "email": email,
                "roll_number": roll,
                "temp_password": temp_password,
            })
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {"created_count": len(created), "students": created, "errors": errors}


@router.put("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Reset student password. Staff only."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    password = payload.get("password", "").strip()
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    from app.services.auth_service import hash_password
    student.password_hash = hash_password(password)
    db.commit()
    return {"message": "Password reset successfully"}

