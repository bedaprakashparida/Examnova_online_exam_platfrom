import sys; sys.path.insert(0,'.')
from sqlalchemy import text
from app.database import engine
with engine.connect() as c:
    rows = c.execute(text("SELECT email, otp_code, otp_expiry FROM teachers")).fetchall()
    for r in rows:
        print(f"email={r[0]} otp={r[1]} expiry={r[2]}")
