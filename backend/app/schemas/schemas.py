from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class TeacherRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class StudentLogin(BaseModel):
    email: EmailStr
    password: str


class TeacherLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    email: str = ""
    needs_password_change: bool = False


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# ── Teacher Schemas ───────────────────────────────────────────────────────────

class TeacherOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Student Schemas ───────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    roll_number: Optional[str] = None
    password: str
    class_id: Optional[int] = None


class StudentOut(BaseModel):
    id: int
    name: str
    email: str
    roll_number: Optional[str] = None
    profile_photo: Optional[str] = None
    class_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    profile_photo: Optional[str] = None


# ── Exam Schemas ──────────────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = None          # legacy field
    duration_minutes: Optional[int] = None  # frontend field
    passing_score: Optional[int] = 50
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @property
    def effective_duration(self) -> int:
        return self.duration_minutes or self.duration or 60


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[bool] = None


class ExamOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    duration: int
    passing_score: Optional[int] = 50
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: bool
    created_by: int
    created_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Question Schemas ──────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # 'A', 'B', 'C', or 'D'
    marks: int = 1


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[str] = None
    marks: Optional[int] = None


class QuestionOut(BaseModel):
    id: int
    exam_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    marks: int

    class Config:
        from_attributes = True


# Question without correct answer (for students during exam)
class QuestionForStudent(BaseModel):
    id: int
    exam_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    marks: int

    class Config:
        from_attributes = True


# ── Invitation Schemas ────────────────────────────────────────────────────────

class InvitationOut(BaseModel):
    id: int
    exam_id: int
    student_id: int
    qr_code: Optional[str] = None
    unique_exam_link: Optional[str] = None
    email_sent: bool
    is_used: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Response Schemas ──────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None  # 'A', 'B', 'C', 'D'


class BulkAnswerSubmit(BaseModel):
    exam_id: int
    answers: list[AnswerSubmit]


class AutoSaveAnswers(BaseModel):
    exam_id: int
    answers: list[AnswerSubmit]


# ── Result Schemas ────────────────────────────────────────────────────────────

class ResultOut(BaseModel):
    id: int
    student_id: int
    exam_id: int
    score: int
    total_marks: int
    percentage: float
    grade: str
    pass_fail_status: str
    submitted_at: datetime

    class Config:
        from_attributes = True


class ResultWithStudent(ResultOut):
    student_name: str
    student_email: str
    student_roll: Optional[str] = None
    exam_title: str


# ── Activity Log Schemas ──────────────────────────────────────────────────────

class ActivityLogCreate(BaseModel):
    exam_id: int
    activity_type: str
    details: Optional[str] = None


class ActivityLogOut(BaseModel):
    id: int
    student_id: int
    exam_id: int
    activity_type: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Analytics Schemas ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_exams: int
    total_students: int
    active_exams: int
    completed_exams: int
    average_score: float
    pass_percentage: float


class ExamAnalytics(BaseModel):
    exam_id: int
    exam_title: str
    total_students: int
    appeared: int
    passed: int
    failed: int
    average_score: float
    highest_score: float
    lowest_score: float
    pass_percentage: float


# ── QR Verification ───────────────────────────────────────────────────────────

class QRVerifyRequest(BaseModel):
    token: str


class PhotoUpload(BaseModel):
    photo_data: str  # base64 image
    exam_id: Optional[int] = None
