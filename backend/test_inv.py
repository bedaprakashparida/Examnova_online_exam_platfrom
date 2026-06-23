import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.student import Student
from app.models.exam import Exam
from app.models.invitation import ExamInvitation

def test_invites():
    db = SessionLocal()
    # get first student
    student = db.query(Student).first()
    print(f"Student: {student.id}")
    
    # get first two exams
    exams = db.query(Exam).limit(2).all()
    print(f"Exams: {[e.id for e in exams]}")
    
    # Try to insert invite for exam 1
    inv1 = ExamInvitation(exam_id=exams[0].id, student_id=student.id)
    db.add(inv1)
    db.commit()
    print("Added to Exam 1")
    
    # Try to insert invite for exam 2
    inv2 = ExamInvitation(exam_id=exams[1].id, student_id=student.id)
    db.add(inv2)
    db.commit()
    print("Added to Exam 2")
    
if __name__ == "__main__":
    try:
        test_invites()
    except Exception as e:
        print(f"ERROR: {e}")
