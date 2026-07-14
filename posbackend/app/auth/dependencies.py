from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.jwt import decode_token
from app.models.user import User
from app.models.employee import Employee

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = decode_token(token)

        role = payload.get("role")
        business_id = payload.get("business_id")

    except:
        raise HTTPException(401, "Invalid token")

    # OWNER
    if role == "owner":
        email = payload.get("sub")

        user = db.query(User).filter(
            User.email == email
        ).first()

        if not user:
            raise HTTPException(404, "User not found")

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "business_id": business_id,
            "role": "owner"
        }

    # EMPLOYEE
    elif role == "employee":
        employee_id = payload.get("employee_id")

        employee = db.query(Employee).filter(
            Employee.id == employee_id
        ).first()

        if not employee:
            raise HTTPException(404, "Employee not found")

        return {
            "id": employee.id,
            "name": employee.full_name,
            "business_id": employee.business_id,
            "role": "employee",
            "permissions": employee.permissions,
        }

    raise HTTPException(401, "Invalid token")