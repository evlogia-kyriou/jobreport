# controllers/report_controller.py

import re
import asyncio
import sentry_sdk
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from auth.dependencies import require_admin, AuthenticatedUser
from models.report import GenerateBatchPdfRequest, JobReportData
from services.pdf_service import generate_job_pdf, merge_pdfs
from utils.supabase_client import supabase
import io

router  = APIRouter(prefix="/reports", tags=["Reports"])
limiter = Limiter(key_func=get_remote_address)

# ── Data fetching ─────────────────────────────────────────────────────────────

def fetch_job_report_data(job_id: str) -> JobReportData:
    # Fetch job
    job_result = supabase.from_("jobs") \
        .select("""
            id, title, job_date, submitted_at, duration_minutes,
            worker_1:users!worker_1_id(name),
            worker_2:users!worker_2_id(name)
        """) \
        .eq("id", job_id) \
        .single() \
        .execute()

    if not job_result.data:
        raise HTTPException(404, "Laporan tidak ditemukan.")

    job = job_result.data

    # Fetch AC units with steps and findings
    units_result = supabase.from_("ac_units") \
        .select("""
            id, name, type, brand, pk, status, not_found_note,
            job_steps(
                order_number, description, section, step_type,
                input_value, input_unit, is_completed, photo_url,
                is_flagged, flag_note, is_condition_abnormal,
                completed_by:users!completed_by(name),
                completed_at
            ),
            findings(
                custom_description, photo_url,
                finding_type:finding_types(name)
            )
        """) \
        .eq("job_id", job_id) \
        .order("order_number") \
        .execute()

    # Fetch signature
    sig_result = supabase.from_("job_signatures") \
        .select("""
            technician_id,
            technician:users!technician_id(name),
            technician_signature_url,
            technician_signed_at,
            pic_name,
            pic_signature_url,
            pic_signed_at
        """) \
        .eq("job_id", job_id) \
        .maybe_single() \
        .execute()

    # Fetch admin approval (if no signature)
    approval_result = supabase.from_("admin_approvals") \
        .select("""
            reason, worker_note, approved_at,
            admin:users!approved_by(name)
        """) \
        .eq("job_id", job_id) \
        .maybe_single() \
        .execute()

    # Build JobReportData
    from models.report import (
        AcUnitData, JobStepData, SignatureData,
        AdminApprovalData
    )

    ac_units = []
    for unit in (units_result.data or []):
        steps = []
        for step in (unit.get("job_steps") or []):
            completed_by_name = None
            if step.get("completed_by"):
                completed_by_name = step["completed_by"]["name"]

            steps.append(JobStepData(
                order_number=step["order_number"],
                description=step["description"],
                section=step["section"],
                step_type=step["step_type"],
                input_value=step.get("input_value"),
                input_unit=step.get("input_unit"),
                is_completed=step["is_completed"],
                photo_url=step.get("photo_url"),
                completed_by=completed_by_name,
                completed_at=step.get("completed_at"),
                is_flagged=step.get("is_flagged", False),
                flag_note=step.get("flag_note"),
            ))

        findings = []
        for finding in (unit.get("findings") or []):
            findings.append({
                "finding_type_name": finding["finding_type"]["name"]
                    if finding.get("finding_type") else "Temuan",
                "custom_description": finding.get("custom_description"),
                "photo_url": finding.get("photo_url"),
            })

        ac_units.append(AcUnitData(
            name=unit["name"],
            type=unit.get("type"),
            brand=unit.get("brand"),
            pk=unit.get("pk"),
            status=unit["status"],
            steps=sorted(steps, key=lambda s: s.order_number),
            findings=findings,
        ))

    # Signature
    signature = None
    if sig_result.data:
        s = sig_result.data
        signature = SignatureData(
            technician_name=s["technician"]["name"],
            technician_signature_url=s["technician_signature_url"],
            technician_signed_at=s["technician_signed_at"],
            pic_name=s.get("pic_name"),
            pic_signature_url=s.get("pic_signature_url"),
            pic_signed_at=s.get("pic_signed_at"),
        )

    # Admin approval
    admin_approval = None
    if approval_result.data:
        a = approval_result.data
        admin_approval = AdminApprovalData(
            approved_by=a["admin"]["name"],
            reason=a["reason"],
            worker_note=a.get("worker_note"),
            approved_at=a["approved_at"],
        )

    return JobReportData(
        job_id=str(job["id"]),
        title=job["title"],
        job_date=str(job["job_date"]),
        worker_1_name=job["worker_1"]["name"],
        worker_2_name=job["worker_2"]["name"]
            if job.get("worker_2") else None,
        submitted_at=job.get("submitted_at"),
        duration_minutes=job.get("duration_minutes"),
        ac_units=ac_units,
        signature=signature,
        admin_approval=admin_approval,
    )

def safe_filename(text: str, max_length: int = 50) -> str:
    clean = re.sub(r'[^\w\s-]', '', text).strip()
    clean = re.sub(r'\s+', '_', clean)
    return clean[:max_length]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{job_id}/pdf")
@limiter.limit("10/minute")
async def generate_single_pdf(
    request: Request,
    job_id: str,
    current_user: AuthenticatedUser = Depends(require_admin)
):
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("job_id", job_id)
        scope.set_user({"id": current_user.id, "name": current_user.name})

        try:
            job      = fetch_job_report_data(job_id)
            pdf_bytes = generate_job_pdf(job)

            date_str  = job.job_date.replace("-", "")
            filename  = f"laporan_{safe_filename(job.title)}_{date_str}.pdf"

            return StreamingResponse(
                io.BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Length": str(len(pdf_bytes)),
                    "Cache-Control": "no-store"
                }
            )

        except HTTPException:
            raise
        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise HTTPException(500, "Gagal membuat laporan. Coba lagi.")


@router.post("/batch/pdf")
@limiter.limit("3/minute")
async def generate_batch_pdf(
    request: Request,
    batch_request: GenerateBatchPdfRequest,
    current_user: AuthenticatedUser = Depends(require_admin)
):
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("batch_size", len(batch_request.job_ids))
        scope.set_user({"id": current_user.id})

        try:
            job_ids = [str(jid) for jid in batch_request.job_ids]

            # Generate all PDFs concurrently
            loop   = asyncio.get_event_loop()
            jobs   = await loop.run_in_executor(
                None,
                lambda: [fetch_job_report_data(jid) for jid in job_ids]
            )
            pdfs   = await loop.run_in_executor(
                None,
                lambda: [generate_job_pdf(job) for job in jobs]
            )
            merged = await loop.run_in_executor(None, lambda: merge_pdfs(pdfs))

            today    = datetime.today().strftime("%Y%m%d")
            count    = len(job_ids)
            filename = f"laporan_batch_{today}_{count}pekerjaan.pdf"

            return StreamingResponse(
                io.BytesIO(merged),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Length": str(len(merged)),
                    "Cache-Control": "no-store"
                }
            )

        except HTTPException:
            raise
        except Exception as e:
            sentry_sdk.capture_exception(e)
            raise HTTPException(500, "Gagal membuat laporan batch. Coba lagi.")