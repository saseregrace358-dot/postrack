from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate
)
from app.auth.dependencies import get_current_user

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
        age=payload.age,
        sex=payload.sex,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        state_of_origin=payload.stateOfOrigin,
        position=payload.position,
        date_of_employment=payload.dateOfEmployment,
        status=payload.status,
        performance=payload.performance,
        salary_range=payload.salaryRange,
        avatar=payload.avatar,
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
    employee.age = payload.age
    employee.sex = payload.sex
    employee.email = payload.email
    employee.phone = payload.phone
    employee.address = payload.address
    employee.state_of_origin = payload.stateOfOrigin
    employee.position = payload.position
    employee.date_of_employment = payload.dateOfEmployment
    employee.status = payload.status
    employee.performance = payload.performance
    employee.salary_range = payload.salaryRange
    employee.avatar = payload.avatar

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