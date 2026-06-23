import sys
import random
from datetime import datetime, timedelta

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.exam import Exam
from app.models.question import Question
from app.models.result import Result
from app.models.invitation import ExamInvitation

def seed_exams():
    db = SessionLocal()
    try:
        print("Starting exams seeding...")

        # Get first teacher
        teacher = db.query(Teacher).filter(Teacher.teacher_role == "teacher").first()
        if not teacher:
            print("No teachers found! Run seed_demo_data.py first.")
            return

        # Get all students
        students = db.query(Student).all()
        if not students:
            print("No students found! Run seed_demo_data.py first.")
            return

        print(f"Using Teacher: {teacher.name}")
        print(f"Found {len(students)} students.")

        # 1. Create Exams
        exams_data = [
            {"title": "Midterm Examination: Computer Science", "duration": 60, "passing": 40},
            {"title": "Quarterly Math Assessment", "duration": 45, "passing": 50},
            {"title": "Finals: Literature & Arts", "duration": 90, "passing": 35},
        ]

        exams = []
        for edata in exams_data:
            exam = Exam(
                title=edata["title"],
                description=f"This is a demo exam for {edata['title']}.",
                duration=edata["duration"],
                passing_score=edata["passing"],
                start_time=datetime.utcnow() - timedelta(days=5),
                end_time=datetime.utcnow() + timedelta(days=5),
                is_active=True,
                created_by=teacher.id
            )
            db.add(exam)
            exams.append(exam)
        
        db.commit()
        for e in exams:
            db.refresh(e)

        print("Created 3 Exams.")

        # 2. Create Questions
        questions = []
        for exam in exams:
            for i in range(10):
                q = Question(
                    exam_id=exam.id,
                    question_text=f"Sample Question {i+1} for {exam.title}?",
                    option_a=f"Option A for Q{i+1}",
                    option_b=f"Option B for Q{i+1}",
                    option_c=f"Option C for Q{i+1}",
                    option_d=f"Option D for Q{i+1}",
                    correct_answer=random.choice(["A", "B", "C", "D"]),
                    marks=1
                )
                db.add(q)
                questions.append(q)
        
        db.commit()
        print(f"Created {len(questions)} Questions.")

        # 3. Create Invitations and Results
        print("Creating Invitations and Results...")
        for student in students:
            # Let's say all students took Exam 1 and Exam 2
            for exam in exams[:2]:
                # Invitation
                inv = ExamInvitation(
                    exam_id=exam.id,
                    student_id=student.id,
                    is_used=True,
                    email_sent=True
                )
                db.add(inv)

                # Result
                score = random.randint(3, 10) # Out of 10
                percentage = (score / 10.0) * 100
                status = "Pass" if percentage >= exam.passing_score else "Fail"
                if percentage >= 90:
                    grade = "A"
                elif percentage >= 80:
                    grade = "B"
                elif percentage >= 70:
                    grade = "C"
                elif percentage >= 60:
                    grade = "D"
                else:
                    grade = "F"

                res = Result(
                    student_id=student.id,
                    exam_id=exam.id,
                    score=score,
                    total_marks=10,
                    percentage=percentage,
                    grade=grade,
                    pass_fail_status=status,
                    submitted_at=datetime.utcnow() - timedelta(days=random.randint(1, 4)),
                    is_submitted=True
                )
                db.add(res)
            
            # For Exam 3, only 20 students have taken it so far
            if random.random() < 0.2:
                exam = exams[2]
                inv = ExamInvitation(
                    exam_id=exam.id,
                    student_id=student.id,
                    is_used=True,
                    email_sent=True
                )
                db.add(inv)
                score = random.randint(2, 10)
                percentage = (score / 10.0) * 100
                status = "Pass" if percentage >= exam.passing_score else "Fail"
                grade = "A" if percentage >= 90 else "B" if percentage >= 70 else "C" if percentage >= 50 else "F"
                
                res = Result(
                    student_id=student.id,
                    exam_id=exam.id,
                    score=score,
                    total_marks=10,
                    percentage=percentage,
                    grade=grade,
                    pass_fail_status=status,
                    submitted_at=datetime.utcnow(),
                    is_submitted=True
                )
                db.add(res)

        db.commit()
        print("Exams data seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_exams()
