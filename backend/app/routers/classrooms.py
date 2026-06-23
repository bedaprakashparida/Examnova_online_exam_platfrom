from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.classroom import Classroom
from app.models.student import Student
from app.middleware.auth_middleware import require_admin, require_teacher_or_admin

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ClassroomCreate(BaseModel):
    name: str
    description: Optional[str] = None
    section: Optional[str] = None


class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    section: Optional[str] = None


# ── List all classrooms ───────────────────────────────────────────────────────

@router.get("/")
def list_classrooms(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get all classrooms created by this teacher, with student count."""
    teacher_id = current_user["user_id"]
    if current_user.get("role") == "admin":
        classrooms = db.query(Classroom).all()
    else:
        classrooms = db.query(Classroom).filter(Classroom.created_by == teacher_id).all()

    from app.models.teacher import Teacher
    result = []
    for cls in classrooms:
        student_count = db.query(Student).filter(Student.class_id == cls.id).count()
        teacher = db.query(Teacher).filter(Teacher.id == cls.created_by).first()
        result.append({
            "id": cls.id,
            "name": cls.name,
            "description": cls.description,
            "section": cls.section,
            "student_count": student_count,
            "created_by_name": teacher.name if teacher else "Unknown",
            "created_at": str(cls.created_at),
        })
    return result


# ── Create classroom ──────────────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_classroom(
    payload: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Create a new classroom."""
    cls = Classroom(
        name=payload.name,
        description=payload.description,
        section=payload.section,
        created_by=current_user["user_id"],
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return {
        "id": cls.id,
        "name": cls.name,
        "description": cls.description,
        "section": cls.section,
        "student_count": 0,
        "created_at": str(cls.created_at),
    }


# ── Update classroom ──────────────────────────────────────────────────────────

@router.put("/{class_id}")
def update_classroom(
    class_id: int,
    payload: ClassroomUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    query = db.query(Classroom).filter(Classroom.id == class_id)
    if current_user.get("role") != "admin":
        query = query.filter(Classroom.created_by == current_user["user_id"])
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found")

    if payload.name is not None:
        cls.name = payload.name
    if payload.description is not None:
        cls.description = payload.description
    if payload.section is not None:
        cls.section = payload.section
    db.commit()
    return {"message": "Updated", "id": cls.id}


# ── Delete classroom ──────────────────────────────────────────────────────────

@router.delete("/{class_id}", status_code=200)
def delete_classroom(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    query = db.query(Classroom).filter(Classroom.id == class_id)
    if current_user.get("role") != "admin":
        query = query.filter(Classroom.created_by == current_user["user_id"])
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found")

    # Unlink students (set class_id to NULL) before deleting
    db.query(Student).filter(Student.class_id == class_id).update({"class_id": None})
    db.delete(cls)
    db.commit()
    return {"message": "Classroom deleted"}


# ── Get students in a classroom ───────────────────────────────────────────────

@router.get("/{class_id}/students")
def get_classroom_students(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Get all students in a specific classroom."""
    query = db.query(Classroom).filter(Classroom.id == class_id)
    if current_user.get("role") != "admin":
        query = query.filter(Classroom.created_by == current_user["user_id"])
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found")

    students = db.query(Student).filter(Student.class_id == class_id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "roll_number": s.roll_number,
            "class_id": s.class_id,
            "created_at": str(s.created_at),
        }
        for s in students
    ]


# ── Move student to classroom ─────────────────────────────────────────────────

@router.post("/{class_id}/add-student/{student_id}", status_code=200)
def add_student_to_classroom(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Assign a student to this classroom."""
    query = db.query(Classroom).filter(Classroom.id == class_id)
    if current_user.get("role") != "admin":
        query = query.filter(Classroom.created_by == current_user["user_id"])
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom not found")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.class_id = class_id
    db.commit()
    return {"message": f"{student.name} added to {cls.name}"}


# ── Remove student from classroom ─────────────────────────────────────────────

@router.delete("/{class_id}/remove-student/{student_id}", status_code=200)
def remove_student_from_classroom(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_teacher_or_admin),
):
    """Remove a student from this classroom (does not delete the student)."""
    student = db.query(Student).filter(
        Student.id == student_id, Student.class_id == class_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not in this classroom")

    student.class_id = None
    db.commit()
    return {"message": f"{student.name} removed from classroom"}

