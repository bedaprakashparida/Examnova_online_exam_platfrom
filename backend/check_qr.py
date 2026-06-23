import sqlite3

def check_schema():
    conn = sqlite3.connect('qr_exam.db')
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='exam_invitations'")
    row = cursor.fetchone()
    if row:
        print("TABLE:", row[0])
    
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='exam_invitations'")
    for row in cursor.fetchall():
        if row[0]:
            print("INDEX:", row[0])
            
    conn.close()

if __name__ == "__main__":
    check_schema()
