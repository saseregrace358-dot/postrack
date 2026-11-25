
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.employee import Employee
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeLogin,
)
from app.utils.email_service import send_employee_login_email
from app.auth.dependencies import get_current_user
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token

from app.services.subscription_service import (
    get_valid_subscription,
    check_creation_limit,
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
)


# ===========================
# Helpers
# ===========================

def get_business_id(user):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    return business_id


def check_employee_access(db: Session, business_id):
    get_valid_subscription(db, business_id)


def employee_response(employee: Employee):
    return {
        "id": employee.id,
        "full_name": employee.full_name,
        "email": employee.email,
        "phone": employee.phone,
        "role": employee.role,
        "status": employee.status,
        "permissions": employee.permissions or [],
        "business_id": employee.business_id,
    }


def check_duplicate_email(
    db: Session,
    email: str,
    exclude_employee_id=None,
):
    query = db.query(Employee).filter(
        Employee.email == email
    )

    if exclude_employee_id is not None:
        query = query.filter(
            Employee.id != exclude_employee_id
        )

    if query.first():
        raise HTTPException(
            status_code=409,
            detail="An employee with this email already exists.",
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
    business_id = get_business_id(user)

    check_employee_access(db, business_id)

    check_creation_limit(
        db,
        business_id,
        "employees",
    )

    check_duplicate_email(
        db,
        payload.email,
    )

    employee = Employee(
        full_name=payload.full_name.strip(),
        email=payload.email.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        password=hash_password(payload.password),
        role=payload.role.strip(),
        status=payload.status,
        permissions=payload.permissions,
        business_id=business_id,
    )

    try:
        db.add(employee)
        db.commit()
        db.refresh(employee)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="An employee with this email already exists.",
        )

    return employee_response(employee)


# ===========================
# Get Employees
# ===========================

@router.get("")
def get_employees(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    check_employee_access(db, business_id)

    employees = (
        db.query(Employee)
        .filter(Employee.business_id == business_id)
        .order_by(Employee.created_at.desc())
        .all()
    )

    return [
        employee_response(employee)
        for employee in employees
    ]


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
    business_id = get_business_id(user)

    check_employee_access(db, business_id)

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.business_id == business_id,
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    check_duplicate_email(
        db,
        payload.email.strip(),
        exclude_employee_id=employee.id,
    )

    employee.full_name = payload.full_name.strip()
    employee.email = payload.email.strip()
    employee.phone = (
        payload.phone.strip()
        if payload.phone
        else None
    )
    employee.role = payload.role.strip()
    employee.status = payload.status
    employee.permissions = payload.permissions

    if payload.password and payload.password.strip():
        employee.password = hash_password(
            payload.password
        )

    try:
        db.commit()
        db.refresh(employee)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="An employee with this email already exists.",
        )

    return employee_response(employee)


# ===========================
# Delete Employee
# ===========================

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    check_employee_access(db, business_id)

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.business_id == business_id,
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    db.delete(employee)
    db.commit()

    return {
        "message": "Employee deleted successfully."
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

    if not employee or not verify_password(
        payload.password,
        employee.password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials.",
        )

    # Inactive employees cannot log in.
    if (employee.status or "").lower() != "active":
        raise HTTPException(
            status_code=403,
            detail="Your employee account is inactive. Contact your business owner.",
        )

    check_employee_access(
        db,
        employee.business_id,
    )

    token = create_access_token(
        {
            "sub": employee.email,
            "employee_id": employee.id,
            "business_id": employee.business_id,
            "permissions": employee.permissions or [],
            "role": "employee",
            "job_role": employee.role,
            "name": employee.full_name,
        }
    )

    owner = (
        db.query(User)
        .filter(
            User.business_id == employee.business_id,
            User.role == "owner",
        )
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
            "phone": employee.phone,
            "role": "employee",
            "job_role": employee.role,
            "status": employee.status,
            "permissions": employee.permissions or [],
        },
    }
