import socket

print("Testing...")

s = socket.create_connection(
    ("smtp-relay.brevo.com", 465),
    timeout=10
)

print("Connected!")
s.close()