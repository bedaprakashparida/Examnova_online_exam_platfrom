import sys, smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
sys.path.insert(0, '.')
from app.config import settings

smtp_pass = settings.SMTP_PASSWORD.replace(' ', '')

msg = MIMEMultipart('alternative')
msg['Subject'] = 'ExamNova - Test Email'
msg['From'] = f'ExamNova <{settings.SMTP_USER}>'
msg['To'] = settings.SMTP_USER
html = '<h2>Email is working!</h2><p>ExamNova is correctly configured.</p>'
msg.attach(MIMEText(html, 'html', 'utf-8'))

ctx = ssl.create_default_context()
with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ctx, timeout=30) as s:
    s.login(settings.SMTP_USER, smtp_pass)
    s.send_message(msg)

print('SUCCESS - Test email sent to', settings.SMTP_USER)
