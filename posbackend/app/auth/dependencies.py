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

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


    # ======================
    # OWNER
    # ======================
    if role == "owner":

        email = payload.get("sub")

        user = db.query(User).filter(
            User.email == email
        ).first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "business_id": user.business_id,
            "role": "owner",

            # OWNER HAS ALL PERMISSIONS
            "permissions": {
                "products": True,
                "sales": True,
                "customers": True,
                "employees": True,
                "reports": True,
                "settings": True
            }
        }


    # ======================
    # EMPLOYEE
    # ======================
    elif role == "employee":

        employee_id = payload.get("employee_id")

        employee = db.query(Employee).filter(
            Employee.id == employee_id
        ).first()


        if not employee:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )


        return {
            "id": employee.id,
            "name": employee.name,
            "business_id": employee.business_id,
            "role": "employee",
            "permissions": employee.permissions
        }


    raise HTTPException(
        status_code=401,
        detail="Invalid user role"
    )
    