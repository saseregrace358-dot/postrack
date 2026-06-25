from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.auth.dependencies import get_current_user
from app.auth.password import hash_password
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeLogin
)

from app.auth.password import (
    hash_password,
    verify_password
)

from app.auth.jwt import create_access_token

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


@router.post("/")
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    employee = Employee(
        name=payload.name,
        password=hash_password(payload.password),
        permissions=payload.permissions,
        business_id=user["business_id"]
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee


@router.get("/")
def get_employees(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Employee).filter(
        Employee.business_id == user["business_id"]
    ).all()


@router.put("/{employee_id}")
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.business_id == user["business_id"]
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee.name = payload.name
    employee.permissions = payload.permissions

    if payload.password:
        employee.password = hash_password(payload.password)

    db.commit()
    db.refresh(employee)

    return employee


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.business_id == user["business_id"]
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
        "message": "Employee deleted successfully"
    }
@router.post("/login")
def employee_login(
    payload: EmployeeLogin,
    db: Session = Depends(get_db)
):
    print("LOGIN PAYLOAD:", payload.dict())

    employee = db.query(Employee).filter(
        Employee.name == payload.name
    ).first()

    print("FOUND EMPLOYEE:", employee)

    
    if not employee:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not verify_password(
        payload.password,
        employee.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "employee_id": employee.id,
        "name": employee.name,
        "business_id": employee.business_id,
        "permissions": employee.permissions,
        "role": "employee"
    })

    return {
        "access_token": token,
        "user": {
            "id": employee.id,
            "name": employee.name,
            "role": "employee",
            "permissions": employee.permissions
        }
    }