import smtplib

try:
    server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10)
    print("Connected!")
    server.login(
        "saseregrace358@gmail.com",
        "isvskjfjigdfjuzg"
    )
    print("Login successful!")
    server.quit()
except Exception as e:
    print(repr(e))