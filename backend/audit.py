import sys; sys.path.insert(0,'.')
import urllib.request, urllib.error, json

BASE = 'http://localhost:8001/api'
results_log = []

def req(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except:
            return e.code, {'detail': str(e)}
    except Exception as ex:
        return 0, {'detail': str(ex)}

def check(label, s, d, ok_codes=(200, 201)):
    ok = s in ok_codes
    tag = 'OK  ' if ok else 'FAIL'
    results_log.append((tag, s, label, d))
    print(f'[{tag}] {s}  {label}')
    if not ok:
        print(f'       >>> {str(d)[:200]}')
    return ok

# ── Auth: Get admin token ──────────────────────────────────────────────────────
s, d = req('POST', '/auth/login/admin/verify-otp', {'email': 'admin@qrexam.com', 'otp': '301677'})
check('Admin verify OTP', s, d)
token = d.get('access_token') if s == 200 else None

if not token:
    print('FATAL: Cannot get admin token. Rerun get_otp.py first.')
    sys.exit(1)

print(f'\nAdmin token obtained. role={d.get("role")}\n')

# ── Teacher Management ─────────────────────────────────────────────────────────
s, d = req('GET', '/auth/admin/teachers', token=token)
check('GET  /auth/admin/teachers', s, d)

s, d = req('POST', '/auth/admin/teachers',
    {'name': 'Audit Teacher', 'email': 'audit_tch@demo.com', 'password': 'Test@1234', 'teacher_role': 'teacher'}, token=token)
check('POST /auth/admin/teachers (create)', s, d, (200, 201))
teach_id = d.get('id') if s in (200, 201) else None

if teach_id:
    s, d = req('PATCH', f'/auth/admin/teachers/{teach_id}/role', {'teacher_role': 'admin'}, token=token)
    check('PATCH /auth/admin/teachers/{id}/role', s, d)

    s, d = req('DELETE', f'/auth/admin/teachers/{teach_id}', token=token)
    check('DELETE /auth/admin/teachers/{id}', s, d)

# ── Classrooms ────────────────────────────────────────────────────────────────
s, d = req('GET', '/classrooms/', token=token)
check('GET  /classrooms/', s, d)

s, d = req('POST', '/classrooms/', {'name': 'Audit Class', 'description': 'Test'}, token=token)
check('POST /classrooms/ (create)', s, d, (200, 201))
class_id = d.get('id') if s in (200, 201) else None

# ── Exams ─────────────────────────────────────────────────────────────────────
s, d = req('GET', '/exams/', token=token)
check('GET  /exams/', s, d)

s, d = req('POST', '/exams/', {'title': 'Audit Exam', 'description': 'Test', 'duration_minutes': 30, 'passing_score': 50}, token=token)
check('POST /exams/ (create)', s, d, (200, 201))
exam_id = d.get('id') if s in (200, 201) else None

if exam_id:
    s, d = req('GET', f'/exams/{exam_id}', token=token)
    check('GET  /exams/{id}', s, d)

    s, d = req('PUT', f'/exams/{exam_id}',
        {'title': 'Audit Exam v2', 'description': 'Updated', 'duration_minutes': 45, 'passing_score': 60}, token=token)
    check('PUT  /exams/{id} (update)', s, d)

    s, d = req('POST', f'/exams/{exam_id}/publish', token=token)
    check('POST /exams/{id}/publish', s, d, (200, 201))

# ── Questions ─────────────────────────────────────────────────────────────────
q_id = None
if exam_id:
    s, d = req('GET', f'/questions/exam/{exam_id}', token=token)
    check('GET  /questions/exam/{id}', s, d)

    s, d = req('POST', f'/questions/exam/{exam_id}',
        {'text': 'Q1: 2+2?', 'option_a': '3', 'option_b': '4', 'option_c': '5', 'option_d': '6',
         'correct_answer': 'B', 'marks': 1}, token=token)
    check('POST /questions/exam/{id} (create)', s, d, (200, 201))
    q_id = d.get('id') if s in (200, 201) else None

    if q_id:
        s, d = req('PUT', f'/questions/{q_id}',
            {'text': 'Q1 updated', 'option_a': '3', 'option_b': '4', 'option_c': '5', 'option_d': '6',
             'correct_answer': 'B', 'marks': 2}, token=token)
        check('PUT  /questions/{id} (update)', s, d)

        s, d = req('DELETE', f'/questions/{q_id}', token=token)
        check('DELETE /questions/{id}', s, d)

# ── Students ──────────────────────────────────────────────────────────────────
s, d = req('GET', '/students/', token=token)
check('GET  /students/', s, d)

s, d = req('POST', '/students/', {'name': 'Audit Student', 'email': 'audit_stu@demo.com', 'roll_number': 'AUD001'}, token=token)
check('POST /students/ (create)', s, d, (200, 201))
stu_id = d.get('id') if s in (200, 201) else None

if stu_id:
    s, d = req('GET', f'/students/{stu_id}', token=token)
    check('GET  /students/{id}', s, d)

# ── Invitations ───────────────────────────────────────────────────────────────
if exam_id and stu_id:
    s, d = req('POST', '/invitations/send', {'exam_id': exam_id, 'student_ids': [stu_id]}, token=token)
    check('POST /invitations/send', s, d, (200, 201))

    s, d = req('GET', f'/invitations/exam/{exam_id}', token=token)
    check('GET  /invitations/exam/{id}', s, d)

# ── Results ───────────────────────────────────────────────────────────────────
if exam_id:
    s, d = req('GET', f'/results/exam/{exam_id}', token=token)
    check('GET  /results/exam/{id}', s, d)

# ── Analytics ─────────────────────────────────────────────────────────────────
s, d = req('GET', '/analytics/dashboard', token=token)
check('GET  /analytics/dashboard', s, d)

if exam_id:
    s, d = req('GET', f'/analytics/exam/{exam_id}', token=token)
    check('GET  /analytics/exam/{id}', s, d)

# ── SMTP Settings ─────────────────────────────────────────────────────────────
s, d = req('GET', '/auth/smtp-settings', token=token)
check('GET  /auth/smtp-settings', s, d)

s, d = req('PUT', '/auth/smtp-settings',
    {'smtp_host': 'smtp.gmail.com', 'smtp_port': 465,
     'smtp_user': 'bedaprakashparida8@gmail.com',
     'smtp_password': 'ognykcvchktsnikn', 'smtp_ssl': True}, token=token)
check('PUT  /auth/smtp-settings (save)', s, d)

# ── Student token login ───────────────────────────────────────────────────────
s, d = req('POST', '/auth/exam-token-login', {'token': 'bad_token_xyz'})
check('POST /auth/exam-token-login (bad token => 401)', s, d, (401,))

# ── Student password login ────────────────────────────────────────────────────
s, d = req('POST', '/auth/login/student', {'email': 'audit_stu@demo.com', 'password': 'wrongpass'})
check('POST /auth/login/student (wrong pw => 401)', s, d, (401,))

# ── Auth me ───────────────────────────────────────────────────────────────────
s, d = req('GET', '/auth/me', token=token)
check('GET  /auth/me', s, d)

# ── Cleanup ───────────────────────────────────────────────────────────────────
print('\n--- Cleanup ---')
if exam_id:
    s, d = req('DELETE', f'/exams/{exam_id}', token=token)
    check('DELETE /exams/{id} (cleanup)', s, d)
if stu_id:
    s, d = req('DELETE', f'/students/{stu_id}', token=token)
    check('DELETE /students/{id} (cleanup)', s, d)
if class_id:
    s, d = req('DELETE', f'/classrooms/{class_id}', token=token)
    check('DELETE /classrooms/{id} (cleanup)', s, d, (200, 204))

# ── Summary ───────────────────────────────────────────────────────────────────
total = len(results_log)
passed = sum(1 for r in results_log if r[0] == 'OK  ')
failed = [r for r in results_log if r[0] == 'FAIL']

print('\n' + '='*60)
print('  FULL AUDIT REPORT')
print('='*60)
print(f'  Total checks : {total}')
print(f'  PASSED       : {passed}')
print(f'  FAILED       : {len(failed)}')
if failed:
    print('\n  FAILURES:')
    for r in failed:
        print(f'    [{r[1]}] {r[2]}')
        detail = r[3]
        if isinstance(detail, dict):
            print(f'           {str(detail)[:200]}')
print('='*60)
