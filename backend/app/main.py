import sys
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
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
