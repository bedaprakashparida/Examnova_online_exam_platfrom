import sys
import random
from faker import Faker

sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.teacher import Teacher
from app.models.classroom import Classroom
from app.models.student import Student
from app.services.auth_service import hash_password

fake = Faker()

def seed_data():
    db = SessionLocal()
    try:
        print("Starting data seeding...")

        # 1. Create 45 Teachers
        print("Seeding 45 teachers...")
        teachers = []
        default_teacher_pwd = hash_password("password123")
        for i in range(45):
            name = fake.name()
            email = f"teacher{i+1}@demo.com"
            teacher = Teacher(
                name=name,
                email=email,
                password_hash=default_teacher_pwd,
                teacher_role="teacher",
                needs_password_change=False,
                is_verified=1
            )
            db.add(teacher)
            teachers.append(teacher)
        
        db.commit()
        for t in teachers:
            db.refresh(t)

        print("Seeding 4 classrooms...")
        # 2. Create 4 Classrooms (assigned to the first 4 teachers)
        classrooms = []
        class_names = ["Computer Science 101", "Advanced Mathematics", "Physics Fundamentals", "Literature & Arts"]
        for i in range(4):
            classroom = Classroom(
                name=class_names[i],
                description=f"Demo class for {class_names[i]}",
                section=f"Section {chr(65+i)}",
                created_by=teachers[i].id
            )
            db.add(classroom)
            classrooms.append(classroom)
        
        db.commit()
        for c in classrooms:
            db.refresh(c)

        print("Seeding 101 students...")
        # 3. Create 101 Students distributed across the 4 classrooms
        default_student_pwd = hash_password("student123")
        for i in range(101):
            name = fake.name()
            email = f"student{i+1}@demo.com"
            classroom = random.choice(classrooms)
            student = Student(
                name=name,
                email=email,
                roll_number=f"DEMO{1000+i}",
                password_hash=default_student_pwd,
                class_id=classroom.id
            )
            db.add(student)

        db.commit()
        print("Data seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
