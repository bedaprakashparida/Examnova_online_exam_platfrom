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

def seed_specific_teacher():
    db = SessionLocal()
    try:
        # Find the teacher
        teacher = db.query(Teacher).filter(Teacher.name.ilike("%bedaprakash%")).first()
        if not teacher:
            # Let's try matching parida or something if first fails
            teacher = db.query(Teacher).filter(Teacher.email.ilike("%beda%")).first()
        
        if not teacher:
            print("Teacher not found!")
            return
            
        print(f"Found Teacher: {teacher.name} ({teacher.email})")

        # Create 2 classes
        class_names = ["Advanced Python Programming", "Web Development Bootcamp"]
        classrooms = []
        for i, c_name in enumerate(class_names):
            classroom = Classroom(
                name=c_name,
                description=f"Dummy class for {teacher.name}",
                section=f"Batch {i+1}",
                created_by=teacher.id
            )
            db.add(classroom)
            classrooms.append(classroom)
            
        db.commit()
        for c in classrooms:
            db.refresh(c)
            
        print("Created 2 classes.")

        # Create 30 students across these 2 classes
        default_student_pwd = hash_password("student123")
        for i in range(30):
            name = fake.name()
            # unique email to avoid conflicts
            email = f"beda_student_{random.randint(1000, 99999)}_{i}@demo.com"
            classroom = random.choice(classrooms)
            student = Student(
                name=name,
                email=email,
                roll_number=f"BEDA{1000+i}-{random.randint(10,99)}",
                password_hash=default_student_pwd,
                class_id=classroom.id
            )
            db.add(student)

        db.commit()
        print("Successfully added 30 dummy students to the classes.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_specific_teacher()
