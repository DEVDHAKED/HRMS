from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class EmployeeBase(BaseModel):
    employee_id: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    department: str = Field(..., min_length=1, max_length=100)


class EmployeeCreate(EmployeeBase):
    pass


class Employee(EmployeeBase):
    id: int

    class Config:
        from_attributes = True


class AttendanceBase(BaseModel):
    employee_id: int = Field(..., gt=0)
    date: date
    status: Literal["Present", "Absent"]


class AttendanceCreate(AttendanceBase):
    pass


class Attendance(AttendanceBase):
    id: int

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    employee: Employee
    records: List[Attendance]


class DailyAttendanceSummary(BaseModel):
    date: date
    present: int
    absent: int
    total_employees: int

