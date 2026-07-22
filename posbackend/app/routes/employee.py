from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeLogin,
)
from app.utils.email_service import send_employee_login_email
from app.auth.dependencies import get_current_user
from app.auth.password import (
    hash_password,
    verify_password,
)
from app.auth.jwt import create_access_token
from app.models.user import User
router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
)


# ===========================
# Create Employee
# ===========================
@router.post("/")
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    employee = Employee(
        full_name=payload.full_name,
        email=payload.email,
        password=hash_password(payload.password),
        permissions=payload.permissions,
        business_id=user["business_id"],
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


# ===========================
# Get Employees
# ===========================
@router.get("")
def get_employees(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    employees = (
        db.query(Employee)
        .filter(Employee.business_id == user["business_id"])
        .all()
    )

    return employees


# ===========================
# Update Employee
# ===========================
@router.put("/{employee_id}")
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.business_id == user["business_id"],
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    employee.full_name = payload.full_name
    employee.email = payload.email
    employee.permissions = payload.permissions

    if payload.password:
        employee.password = hash_password(payload.password)

    db.commit()
    db.refresh(employee)

    return employee


# ===========================
# Delete Employee
# ===========================
@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.business_id == user["business_id"],
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    db.delete(employee)
    db.commit()

    return {
        "message": "Employee deleted successfully"
    }


# ===========================
# Employee Login
# ===========================
@router.post("/login")
async def employee_login(
    payload: EmployeeLogin,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(Employee.email == payload.email)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    if not verify_password(
        payload.password,
        employee.password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    token = create_access_token(
        {
            "sub": employee.email,
            "employee_id": employee.id,
            "business_id": employee.business_id,
            "permissions": employee.permissions,
            "role": "employee",
            "name": employee.full_name,
        }
    )

    # Send login notification to owner
    owner = (
        db.query(User)
        .filter(User.business_id == employee.business_id)
        .filter(User.role == "owner")
        .first()
    )

    if owner:
        await send_employee_login_email(
            owner_email=owner.email,
            employee_name=employee.full_name,
            business_name=owner.business_name,
        )

    return {
        "access_token": token,
        "user": {
            "id": employee.id,
            "name": employee.full_name,
            "email": employee.email,
            "role": "employee",
            "permissions": employee.permissions,
        },
    }