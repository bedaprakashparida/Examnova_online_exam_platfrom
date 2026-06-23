import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.services.auth_service import hash_password

def seed_jury_student():
    db = SessionLocal()
    try:
        # 1. Create or update the demo teacher
        teacher_email = "teacher@examnova.com"
        teacher_password = "ExamNovaTch@2026#"
        teacher_name = "Demo Teacher"

        teacher = db.query(Teacher).filter(Teacher.email == teacher_email).first()
        if teacher:
            teacher.name = teacher_name
            teacher.password_hash = hash_password(teacher_password)
            teacher.is_verified = 1
            db.commit()
            db.refresh(teacher)
            print(f"Updated existing demo teacher: {teacher_email}")
        else:
            teacher = Teacher(
                name=teacher_name,
                email=teacher_email,
                password_hash=hash_password(teacher_password),
                teacher_role="teacher",
                is_verified=1
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)
            print(f"Created new demo teacher: {teacher_email}")

        # 2. Ensure there is a classroom
        classroom = db.query(Classroom).first()
        if not classroom:
            classroom = Classroom(
                name="Demo Classroom (Jury)",
                description="Classroom for Jury demonstration",
                section="Section A",
                created_by=teacher.id
            )
            db.add(classroom)
            db.commit()
            db.refresh(classroom)
            print(f"Created demo classroom: {classroom.name}")
        else:
            print(f"Using existing classroom: {classroom.name}")

        # 3. Create or update the dummy student
        student_email = "student@examnova.com"
        student_password = "ExamNovaStu@2026#"
        student_name = "Demo Student"
        student_roll_number = "DEMO001"

        student = db.query(Student).filter(Student.email == student_email).first()
        if student:
            student.name = student_name
            student.password_hash = hash_password(student_password)
            student.roll_number = student_roll_number
            student.class_id = classroom.id
            db.commit()
            print(f"Updated existing dummy student: {student_email}")
        else:
            student = Student(
                name=student_name,
                email=student_email,
                password_hash=hash_password(student_password),
                roll_number=student_roll_number,
                class_id=classroom.id
            )
            db.add(student)
            db.commit()
            print(f"Created new dummy student: {student_email}")

        print("\n======================================")
        print("      JURY DEMO CREDENTIALS")
        print("======================================")
        print("  STUDENT PORTAL:")
        print("  URL        : http://localhost:5173/login")
        print(f"  Email      : {student_email}")
        print(f"  Password   : {student_password}")
        print(f"  Roll No    : {student_roll_number}")
        print("--------------------------------------")
        print("  TEACHER PORTAL:")
        print("  URL        : http://localhost:5173/teacher/login")
        print(f"  Email      : {teacher_email}")
        print(f"  Password   : {teacher_password}")
        print("======================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_jury_student()
