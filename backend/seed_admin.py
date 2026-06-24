import sys; sys.path.insert(0,'.')
from app.database import engine
from sqlalchemy.orm import Session
from app.models.teacher import Teacher
from app.services.auth_service import hash_password, get_teacher_by_email

db = Session(engine)

email = "bedaprakashparida8@gmail.com"
password = "Admin@12345"
name = "Super Admin"

existing = db.query(Teacher).filter(Teacher.email == email).first()
if existing:
    existing.password_hash = hash_password(password)
    existing.teacher_role  = "admin"
    existing.is_verified   = True
    db.commit()
    print(f"Updated existing admin: {email}")
else:
    admin = Teacher(
        name=name,
        email=email,
        password_hash=hash_password(password),
        teacher_role="admin",
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    print(f"Created admin account: {email}")

db.close()
print("\n=============================")
print("  DEMO ADMIN CREDENTIALS")
print("=============================")
print(f"  URL   : http://localhost:5173/admin/login")
print(f"  Email : {email}")
print(f"  Pass  : {password}")
print("=============================")
