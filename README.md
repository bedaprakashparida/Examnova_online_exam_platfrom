# 🎓 Secure QR Code Based Online Examination System

A full-stack online examination system featuring QR code-based access, real-time proctoring, auto-evaluation, and analytics.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite + Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL (Docker) |
| Auth | JWT (python-jose + passlib) |
| QR Codes | qrcode[pil] |
| Email | aiosmtplib (Gmail SMTP) |
| PDF Reports | ReportLab |
| Charts | Recharts |

---

## 📋 Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **Python** 3.11+ — https://python.org
- **Docker Desktop** — https://docker.com/products/docker-desktop

---

## ⚡ Quick Start (5 Steps)

### Step 1: Clone & Open Terminal in Project Folder
```
cd C:\Users\HP\OneDrive\Desktop\NALCO
```

### Step 2: Start PostgreSQL with Docker
```
docker-compose up -d postgres
```
Wait ~10 seconds for Postgres to be ready.

### Step 3: Configure Backend Environment
Edit `backend/.env` and fill in your Gmail credentials:
```env
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password   # Google App Password (16-char)
SECRET_KEY=any-long-random-string-here
QR_SECRET_KEY=another-long-random-string
```

> **How to get Gmail App Password:**
> 1. Go to https://myaccount.google.com/security
> 2. Enable 2-Factor Authentication
> 3. Search "App passwords" → Create → Copy the 16-char password

### Step 4: Start the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend starts at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Step 5: Start the Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend starts at: http://localhost:5173

---

## 🗂️ Project Structure

```
NALCO/
├── docker-compose.yml          # PostgreSQL + backend containers
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── config.py           # Settings from .env
│   │   ├── database.py         # SQLAlchemy engine
│   │   ├── models/             # ORM models (8 tables)
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── routers/            # API endpoints (8 routers)
│   │   ├── services/           # QR, Email, PDF, Evaluation
│   │   └── middleware/         # JWT auth middleware
│   ├── .env                    # ← Edit this!
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/
        │   ├── auth/           # Login, Register
        │   ├── admin/          # 7 admin pages
        │   └── student/        # 4 student pages
        ├── components/         # Shared UI components
        ├── context/            # Auth + Theme contexts
        └── services/api.js     # All API calls
```

---

## 👤 User Flows

### Admin Flow
1. Register at `/register`
2. Login at `/login` (select Admin)
3. Create exam → Add questions → Add students (or CSV upload)
4. Generate QR codes → Send email invitations
5. Monitor results → View analytics → Download reports

### Student Flow
1. Receive email with QR code + exam link
2. Login at `/login` (select Student)
3. Click exam link → 6-step verification:
   - Email verification ✓
   - Photo capture ✓
   - Camera permission ✓
   - Microphone permission ✓
   - Fullscreen mode ✓
   - Start exam ✓
4. Answer questions → Submit
5. View result → Download PDF report

---

## 📊 Database Tables

| Table | Description |
|-------|-------------|
| `teachers` | Admin/teacher accounts |
| `students` | Student accounts |
| `exams` | Exam metadata |
| `questions` | MCQ questions per exam |
| `exam_invitations` | QR codes + links per student |
| `student_responses` | Answer records |
| `results` | Evaluated scores |
| `activity_logs` | Proctoring events |

---

## 🔒 Security Features

- ✅ JWT Authentication (access tokens)
- ✅ Role-Based Access Control (admin/student)
- ✅ Unique per-student QR codes (signed JWT)
- ✅ One-time exam access validation
- ✅ Fullscreen enforcement
- ✅ Tab-switch detection & logging
- ✅ Right-click disabled
- ✅ Copy-paste disabled
- ✅ Auto-save every 10 seconds
- ✅ Auto-submit on timer expiry
- ✅ Webcam photo capture at verification
- ✅ Camera + Microphone access required

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/admin` | Register admin |
| POST | `/api/auth/login/admin` | Admin login |
| POST | `/api/auth/login/student` | Student login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/exams/` | Create exam |
| GET | `/api/exams/` | List exams |
| POST | `/api/questions/{examId}` | Add question |
| POST | `/api/students/bulk-upload` | CSV upload |
| POST | `/api/invitations/generate/{examId}` | Generate QRs |
| POST | `/api/invitations/send-email/{examId}` | Send emails |
| POST | `/api/results/submit` | Submit exam |
| GET | `/api/analytics/dashboard` | Admin stats |
| GET | `/api/reports/pdf/student/{examId}` | Download PDF |

Full interactive docs: http://localhost:8000/docs

---

## 📧 CSV Templates

### Students CSV (`students.csv`)
```csv
name,email,roll_number
John Doe,john@email.com,CS2024001
Jane Smith,jane@email.com,CS2024002
```

### Questions CSV (`questions.csv`)
```csv
question_text,option_a,option_b,option_c,option_d,correct_answer,marks
What is 2+2?,1,2,3,4,D,1
Capital of France?,London,Paris,Berlin,Rome,B,1
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| PostgreSQL not connecting | Run `docker-compose up -d postgres` first |
| Email not sending | Check Gmail App Password in `backend/.env` |
| CORS errors | Ensure backend is running on port 8000 |
| QR code expired | Regenerate invitations for the exam |
| Camera not working | Use HTTPS or localhost (not IP address) |

---

## 📄 License

MIT License — Built for educational purposes.
