import sys; sys.path.insert(0,'.')
from app.database import engine
from sqlalchemy import text, inspect

insp = inspect(engine)
t_cols = [c['name'] for c in insp.get_columns('teachers')]
print('Teacher cols:', t_cols)

with engine.connect() as conn:
    if 'teacher_role' not in t_cols:
        conn.execute(text("ALTER TABLE teachers ADD COLUMN teacher_role VARCHAR(20) DEFAULT 'teacher'"))
        # Mark existing records as admin so they keep full access
        conn.execute(text("UPDATE teachers SET teacher_role='admin'"))
        print('Added teacher_role column, existing teachers set to admin')
    else:
        print('teacher_role already exists')
    conn.commit()

print('Migration complete')
