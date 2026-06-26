import sys
import os
# Ensure backend directory is in the python path for Vercel Serverless Function imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import create_tables
from app.routers import auth, exams, questions, students, invitations, results, analytics, reports, classrooms

# Fix Windows console encoding for Unicode
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    create_tables()
    print(f"[OK] {settings.APP_NAME} started successfully")
    print(f"[DB] Using: {settings.DATABASE_URL[:50]}...")
    yield
    print("[BYE] Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Secure QR Code Based Online Examination System API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
allowed_origins = [settings.FRONTEND_URL] if settings.FRONTEND_URL else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|.*\.vercel\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(classrooms.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(invitations.router, prefix="/api")
app.include_router(results.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.get("/api/debug-db")
def debug_db():
    import os
    from app.database import get_db
    
    db_generator = get_db()
    db = next(db_generator)
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    
    paths = {
        "DATABASE_URL": settings.DATABASE_URL,
        "cwd": os.getcwd(),
        "exists_in_tmp": os.path.exists("/tmp/qr_exam.db"),
    }
    
    for p in [
        os.path.join(root_dir, "qr_exam.db"),
        os.path.join(base_dir, "qr_exam.db"),
        "./qr_exam.db",
        "./backend/qr_exam.db",
        "/tmp/qr_exam.db"
    ]:
        abs_p = os.path.abspath(p)
        paths[p] = {
            "abs_path": abs_p,
            "exists": os.path.exists(p),
            "size": os.path.getsize(p) if os.path.exists(p) else 0
        }
        
    try:
        from app.models.student import Student
        from app.models.teacher import Teacher
        student_count = db.query(Student).count()
        teacher_count = db.query(Teacher).count()
        paths["db_stats"] = {"students": student_count, "teachers": teacher_count}
    except Exception as e:
        paths["db_error"] = str(e)
    finally:
        try:
            next(db_generator)
        except StopIteration:
            pass
        
    return paths


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}

