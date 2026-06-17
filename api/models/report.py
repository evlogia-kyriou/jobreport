# models/report.py

from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import datetime

class GenerateSinglePdfRequest(BaseModel):
    job_id: UUID4

class GenerateBatchPdfRequest(BaseModel):
    job_ids: list[UUID4] = Field(
        min_length=1,
        max_length=50,
        description="List of job IDs to include in batch PDF"
    )

class JobStepData(BaseModel):
    order_number:   int
    description:    str
    section:        str
    step_type:      str
    input_value:    Optional[str] = None
    input_unit:     Optional[str] = None
    is_completed:   bool
    photo_url:      Optional[str] = None
    completed_by:   Optional[str] = None
    completed_at:   Optional[datetime] = None
    is_flagged:     bool = False
    flag_note:      Optional[str] = None

class AcUnitData(BaseModel):
    name:    str
    type:    Optional[str] = None
    brand:   Optional[str] = None
    pk:      Optional[str] = None
    status:  str
    steps:   list[JobStepData] = []
    findings: list[dict] = []

class SignatureData(BaseModel):
    technician_name:          str
    technician_signature_url: str
    technician_signed_at:     datetime
    pic_name:                 Optional[str] = None
    pic_signature_url:        Optional[str] = None
    pic_signed_at:            Optional[datetime] = None

class AdminApprovalData(BaseModel):
    approved_by:    str
    reason:         str
    worker_note:    Optional[str] = None
    approved_at:    datetime

class JobReportData(BaseModel):
    job_id:         str
    title:          str
    job_date:       str
    worker_1_name:  str
    worker_2_name:  Optional[str] = None
    submitted_at:   Optional[datetime] = None
    duration_minutes: Optional[int] = None
    ac_units:       list[AcUnitData] = []
    signature:      Optional[SignatureData] = None
    admin_approval: Optional[AdminApprovalData] = None