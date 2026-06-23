from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.config import settings
from app.models.teacher import Teacher
from app.models.student import Student

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_teacher_by_email(db: Session, email: str) -> Optional[Teacher]:
    return db.query(Teacher).filter(Teacher.email == email).first()


def get_student_by_email(db: Session, email: str) -> Optional[Student]:
    return db.query(Student).filter(Student.email == email).first()


def authenticate_teacher(db: Session, email: str, password: str) -> Optional[Teacher]:
    teacher = get_teacher_by_email(db, email)
    if not teacher or not verify_password(password, teacher.password_hash):
        return None
    return teacher


def authenticate_student(db: Session, email: str, password: str) -> Optional[Student]:
    student = get_student_by_email(db, email)
    if not student or not verify_password(password, student.password_hash):
        return None
    return student
