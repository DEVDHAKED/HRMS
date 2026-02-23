from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Attendance, Employee
from .schemas import Attendance as AttendanceSchema
from .schemas import AttendanceCreate, AttendanceSummary, DailyAttendanceSummary
from .schemas import Employee as EmployeeSchema
from .schemas import EmployeeCreate

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HRMS Lite API", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/employees",
    response_model=EmployeeSchema,
    status_code=status.HTTP_201_CREATED,
)
def create_employee(
    employee: EmployeeCreate, db: Session = Depends(get_db)
):
    existing = db.execute(
        select(Employee).where(
            (Employee.employee_id == employee.employee_id)
            | (Employee.email == employee.email)
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this ID or email already exists.",
        )

    db_employee = Employee(
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        email=employee.email,
        department=employee.department,
    )
    db.add(db_employee)
    try:
        db.commit()
        db.refresh(db_employee)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this ID or email already exists.",
        )

    return db_employee


@app.get("/employees", response_model=list[EmployeeSchema])
def list_employees(db: Session = Depends(get_db)):
    employees = db.execute(select(Employee).order_by(Employee.id)).scalars().all()
    return employees


@app.delete(
    "/employees/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )
    db.delete(employee)
    db.commit()
    return


@app.post(
    "/attendance",
    response_model=AttendanceSchema,
    status_code=status.HTTP_201_CREATED,
)
def mark_attendance(
    record: AttendanceCreate, db: Session = Depends(get_db)
):
    employee = db.get(Employee, record.employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found for attendance.",
        )

    existing = db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == record.employee_id,
                Attendance.date == record.date,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.status = record.status
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    db_record = Attendance(
        employee_id=record.employee_id,
        date=record.date,
        status=record.status,
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get(
    "/employees/{employee_id}/attendance",
    response_model=AttendanceSummary,
)
def get_employee_attendance(
    employee_id: int, db: Session = Depends(get_db)
):
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )

    records = (
        db.execute(
            select(Attendance)
            .where(Attendance.employee_id == employee_id)
            .order_by(Attendance.date.desc())
        )
        .scalars()
        .all()
    )

    return AttendanceSummary(employee=employee, records=records)


@app.get(
    "/attendance/summary",
    response_model=DailyAttendanceSummary,
)
def get_daily_attendance_summary(
    summary_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    total_employees = db.execute(
        select(func.count(Employee.id))
    ).scalar_one()

    present = db.execute(
        select(func.count(Attendance.id)).where(
            and_(Attendance.date == summary_date, Attendance.status == "Present")
        )
    ).scalar_one()

    absent = db.execute(
        select(func.count(Attendance.id)).where(
            and_(Attendance.date == summary_date, Attendance.status == "Absent")
        )
    ).scalar_one()

    return DailyAttendanceSummary(
        date=summary_date,
        present=present,
        absent=absent,
        total_employees=total_employees,
    )

