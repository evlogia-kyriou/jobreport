# services/pdf_service.py

import io
import httpx
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, Image, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from models.report import JobReportData, AcUnitData
import sentry_sdk

# ── Colours ──────────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1B2A4A")
BLUE   = colors.HexColor("#2563EB")
GREEN  = colors.HexColor("#16A34A")
AMBER  = colors.HexColor("#D97706")
RED    = colors.HexColor("#DC2626")
LGREY  = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")
WHITE  = colors.white

# ── Styles ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

sTitle    = ParagraphStyle("sTitle",    fontName="Helvetica-Bold",
                           fontSize=18, textColor=WHITE,  alignment=TA_CENTER)
sSubtitle = ParagraphStyle("sSubtitle", fontName="Helvetica",
                           fontSize=10, textColor=colors.HexColor("#BFDBFE"),
                           alignment=TA_CENTER)
sSection  = ParagraphStyle("sSection",  fontName="Helvetica-Bold",
                           fontSize=11, textColor=NAVY)
sBody     = ParagraphStyle("sBody",     fontName="Helvetica",
                           fontSize=9,  textColor=colors.HexColor("#1E293B"),
                           leading=14)
sBold     = ParagraphStyle("sBold",     fontName="Helvetica-Bold",
                           fontSize=9,  textColor=NAVY)
sTH       = ParagraphStyle("sTH",       fontName="Helvetica-Bold",
                           fontSize=8,  textColor=WHITE, alignment=TA_CENTER)
sTD       = ParagraphStyle("sTD",       fontName="Helvetica",
                           fontSize=8,  textColor=colors.HexColor("#1E293B"),
                           leading=12)
sTDc      = ParagraphStyle("sTDc",      fontName="Helvetica",
                           fontSize=8,  textColor=colors.HexColor("#1E293B"),
                           alignment=TA_CENTER, leading=12)
sSmall    = ParagraphStyle("sSmall",    fontName="Helvetica",
                           fontSize=7,  textColor=colors.HexColor("#64748B"))
sFooter   = ParagraphStyle("sFooter",   fontName="Helvetica",
                           fontSize=7,  textColor=colors.HexColor("#64748B"),
                           alignment=TA_CENTER)

# ── Helpers ───────────────────────────────────────────────────────────────────
def sp(h=4):    return Spacer(1, h * mm)
def hr():       return HRFlowable(width="100%", thickness=0.5,
                                  color=BORDER, spaceAfter=3*mm,
                                  spaceBefore=3*mm)

def section_banner(text: str):
    t = Table([[Paragraph(text, sSection)]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LINEBEFORE",    (0,0), (0,-1),  3, BLUE),
    ]))
    return t

def info_row(label: str, value: str):
    return [Paragraph(label, sBold), Paragraph(value, sTD)]

def fetch_image(url: str) -> io.BytesIO | None:
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                return io.BytesIO(response.content)
    except Exception as e:
        sentry_sdk.capture_exception(e)
    return None

def format_datetime(dt: datetime | None) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d %b %Y, %H.%M WIB")

def format_date(dt_str: str) -> str:
    try:
        dt = datetime.fromisoformat(dt_str)
        return dt.strftime("%A, %d %B %Y")
    except Exception:
        return dt_str

# ── Section label mapping ─────────────────────────────────────────────────────
SECTION_LABELS = {
    "kedatangan":        "1. Kedatangan",
    "pencucian_indoor":  "2. Pencucian — Indoor",
    "pencucian_outdoor": "3. Pencucian — Outdoor",
    "penyelesaian":      "4. Penyelesaian",
    "laporan_kerusakan": "5. Laporan Kerusakan",
}

# ── Step status label ─────────────────────────────────────────────────────────
def step_status(step) -> str:
    if step.is_flagged:
        return "⚑ Ditandai"
    if step.is_completed:
        return "✓ Selesai"
    return "○ Belum"

def step_value(step) -> str:
    if step.input_value and step.input_unit:
        return f"{step.input_value} {step.input_unit}"
    if step.input_value:
        return step.input_value
    return "—"

# ── Cover page ────────────────────────────────────────────────────────────────
def build_cover(story: list, job: JobReportData):
    # Header banner
    banner_data = [
        [Paragraph("LAPORAN PEKERJAAN", sTitle)],
        [Paragraph("Laporan Servis Unit AC", sSubtitle)],
    ]
    banner = Table(banner_data, colWidths=[170*mm])
    banner.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), NAVY),
        ("TOPPADDING",   (0,0), (-1,-1), 12),
        ("BOTTOMPADDING",(0,0), (-1,-1), 12),
        ("LEFTPADDING",  (0,0), (-1,-1), 14),
        ("RIGHTPADDING", (0,0), (-1,-1), 14),
        ("ROUNDEDCORNERS", [5]),
    ]))
    story.append(banner)
    story.append(sp(5))

    # Job info table
    workers = job.worker_1_name
    if job.worker_2_name:
        workers += f", {job.worker_2_name}"

    info_data = [
        info_row("Pekerjaan",  job.title),
        info_row("Tanggal",    format_date(job.job_date)),
        info_row("Teknisi",    workers),
        info_row("Total Unit", f"{len(job.ac_units)} unit AC"),
    ]

    if job.submitted_at:
        info_data.append(
            info_row("Dikirim", format_datetime(job.submitted_at))
        )
    if job.duration_minutes:
        hours   = job.duration_minutes // 60
        minutes = job.duration_minutes % 60
        info_data.append(
            info_row("Durasi", f"{hours} jam {minutes} menit")
        )

    info_table = Table(info_data, colWidths=[55*mm, 115*mm])
    info_table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [WHITE, LGREY]),
        ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    story.append(info_table)
    story.append(sp(4))

    # Unit summary
    story.append(section_banner("Ringkasan Unit AC"))
    story.append(sp(2))

    summary_rows = [[
        Paragraph("#",            sTH),
        Paragraph("Nama",         sTH),
        Paragraph("Tipe / Brand", sTH),
        Paragraph("Status",       sTH),
    ]]

    for i, unit in enumerate(job.ac_units, 1):
        type_brand = " / ".join(filter(None, [unit.type, unit.brand, unit.pk]))
        status_map = {
            "completed":            "Selesai ✓",
            "not_found":            "Tidak Ditemukan",
            "added_by_technician":  "Ditambahkan Teknisi",
            "in_progress":          "Berlangsung",
            "pending":              "Menunggu",
        }
        status_label = status_map.get(unit.status, unit.status)

        summary_rows.append([
            Paragraph(str(i),          sTDc),
            Paragraph(unit.name,       sTD),
            Paragraph(type_brand or "—", sTD),
            Paragraph(status_label,    sTDc),
        ])

    summary = Table(summary_rows, colWidths=[12*mm, 60*mm, 65*mm, 33*mm])
    summary.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  NAVY),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, LGREY]),
        ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(summary)

# ── AC unit section ───────────────────────────────────────────────────────────
def build_ac_unit_section(story: list, unit: AcUnitData, unit_number: int):
    story.append(PageBreak())

    # AC unit header
    type_brand = " — ".join(filter(None, [unit.type, unit.brand, unit.pk]))
    header_text = f"Unit {unit_number}: {unit.name}"
    if type_brand:
        header_text += f"  |  {type_brand}"

    header = Table([[Paragraph(header_text, sSection)]], colWidths=[170*mm])
    header.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#1B2A4A")),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))

    # Override style for white text
    header_style = ParagraphStyle("hdr", fontName="Helvetica-Bold",
                                  fontSize=11, textColor=WHITE)
    header = Table([[Paragraph(header_text, header_style)]], colWidths=[170*mm])
    header.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), NAVY),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS", [3]),
    ]))
    story.append(header)
    story.append(sp(3))

    # Handle not found
    if unit.status == "not_found":
        not_found = Table(
            [[Paragraph("Unit AC tidak ditemukan di lokasi.", sBody)]],
            colWidths=[170*mm]
        )
        not_found.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,-1), colors.HexColor("#FEF2F2")),
            ("LEFTPADDING",  (0,0), (-1,-1), 10),
            ("TOPPADDING",   (0,0), (-1,-1), 8),
            ("BOTTOMPADDING",(0,0), (-1,-1), 8),
            ("LINEBEFORE",   (0,0), (0,-1),  4, RED),
        ]))
        story.append(not_found)
        return

    # Group steps by section
    sections: dict[str, list] = {}
    for step in unit.steps:
        sections.setdefault(step.section, []).append(step)

    for section_key, section_steps in sections.items():
        label = SECTION_LABELS.get(section_key, section_key)
        story.append(sp(2))
        story.append(section_banner(label))
        story.append(sp(2))

        for step in sorted(section_steps, key=lambda s: s.order_number):
            build_step(story, step)

    # Findings
    if unit.findings:
        story.append(sp(2))
        story.append(section_banner("Laporan Kerusakan"))
        story.append(sp(2))
        build_findings(story, unit.findings)

# ── Step rendering ────────────────────────────────────────────────────────────
def build_step(story: list, step):
    elements = []

    # Step header row
    status_color = GREEN if step.is_completed else (AMBER if step.is_flagged else BORDER)
    step_header_data = [[
        Paragraph(f"{step.order_number}. {step.description}", sBold),
        Paragraph(step_status(step), sTDc)
    ]]
    step_header = Table(step_header_data, colWidths=[140*mm, 30*mm])
    step_header.setStyle(TableStyle([
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    elements.append(step_header)

    # Measurement value (if numeric step)
    value = step_value(step)
    if value != "—":
        elements.append(
            Paragraph(f"Nilai: {value}", sSmall)
        )

    # Completion info
    if step.completed_by and step.completed_at:
        elements.append(
            Paragraph(
                f"Diselesaikan oleh: {step.completed_by} — "
                f"{format_datetime(step.completed_at)}",
                sSmall
            )
        )

    # Flag note
    if step.is_flagged and step.flag_note:
        flag_box = Table(
            [[Paragraph(f"⚑ Catatan Admin: {step.flag_note}", sSmall)]],
            colWidths=[170*mm]
        )
        flag_box.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,-1), colors.HexColor("#FFFBEB")),
            ("LEFTPADDING",  (0,0), (-1,-1), 8),
            ("TOPPADDING",   (0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0), (-1,-1), 4),
            ("LINEBEFORE",   (0,0), (0,-1),  3, AMBER),
        ]))
        elements.append(sp(1))
        elements.append(flag_box)

    # Photo
    if step.photo_url:
        elements.append(sp(2))
        img_buffer = fetch_image(step.photo_url)
        if img_buffer:
            try:
                img = Image(img_buffer, width=80*mm, height=60*mm)
                img.hAlign = "LEFT"
                elements.append(img)
            except Exception as e:
                sentry_sdk.capture_exception(e)
                elements.append(
                    Paragraph("[Foto tidak dapat dimuat]", sSmall)
                )

    elements.append(sp(1))
    elements.append(HRFlowable(
        width="100%", thickness=0.3,
        color=BORDER, spaceAfter=2*mm
    ))

    story.append(KeepTogether(elements))

# ── Findings section ──────────────────────────────────────────────────────────
def build_findings(story: list, findings: list[dict]):
    for i, finding in enumerate(findings, 1):
        elements = []
        finding_type = finding.get("finding_type_name", "Temuan")
        description  = finding.get("custom_description", "")
        photo_url    = finding.get("photo_url")

        elements.append(
            Paragraph(f"Temuan {i}: {finding_type}", sBold)
        )
        if description:
            elements.append(Paragraph(description, sBody))

        if photo_url:
            elements.append(sp(2))
            img_buffer = fetch_image(photo_url)
            if img_buffer:
                try:
                    img = Image(img_buffer, width=80*mm, height=60*mm)
                    img.hAlign = "LEFT"
                    elements.append(img)
                except Exception:
                    pass

        elements.append(sp(2))
        story.append(KeepTogether(elements))

# ── Approval / signature page ─────────────────────────────────────────────────
def build_approval_page(story: list, job: JobReportData):
    story.append(PageBreak())
    story.append(section_banner("Persetujuan"))
    story.append(sp(4))

    story.append(Paragraph(
        f"Semua {len(job.ac_units)} unit AC telah diperiksa dan "
        f"didokumentasikan sesuai SOP.",
        sBody
    ))
    story.append(sp(4))

    if job.signature:
        sig = job.signature

        # Technician signature
        story.append(Paragraph("Tanda Tangan Teknisi", sBold))
        story.append(sp(2))

        tech_info = Table([
            info_row("Nama",   sig.technician_name),
            info_row("Waktu",  format_datetime(sig.technician_signed_at)),
        ], colWidths=[45*mm, 125*mm])
        tech_info.setStyle(TableStyle([
            ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
            ("ROWBACKGROUNDS",(0,0), (-1,-1), [WHITE, LGREY]),
            ("LEFTPADDING",   (0,0), (-1,-1), 8),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ]))
        story.append(tech_info)
        story.append(sp(2))

        tech_sig_buffer = fetch_image(sig.technician_signature_url)
        if tech_sig_buffer:
            try:
                sig_img = Image(tech_sig_buffer, width=80*mm, height=40*mm)
                sig_img.hAlign = "LEFT"
                story.append(sig_img)
            except Exception:
                story.append(Paragraph("[Tanda tangan tidak dapat dimuat]", sSmall))

        story.append(sp(5))
        story.append(hr())

        # PIC signature (if signed)
        if sig.pic_name and sig.pic_signature_url:
            story.append(Paragraph("Tanda Tangan PIC Klien", sBold))
            story.append(sp(2))

            pic_info = Table([
                info_row("Nama",   sig.pic_name),
                info_row("Waktu",  format_datetime(sig.pic_signed_at)),
            ], colWidths=[45*mm, 125*mm])
            pic_info.setStyle(TableStyle([
                ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
                ("ROWBACKGROUNDS",(0,0), (-1,-1), [WHITE, LGREY]),
                ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ("TOPPADDING",    (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ]))
            story.append(pic_info)
            story.append(sp(2))

            pic_sig_buffer = fetch_image(sig.pic_signature_url)
            if pic_sig_buffer:
                try:
                    pic_img = Image(pic_sig_buffer, width=80*mm, height=40*mm)
                    pic_img.hAlign = "LEFT"
                    story.append(pic_img)
                except Exception:
                    story.append(Paragraph("[Tanda tangan tidak dapat dimuat]", sSmall))

    elif job.admin_approval:
        approval = job.admin_approval
        story.append(Paragraph("Disetujui oleh Admin", sBold))
        story.append(sp(2))

        approval_box = Table([[
            Paragraph(
                f"Tanda tangan PIC klien tidak diperoleh.\n"
                f"Alasan: {approval.worker_note or '—'}\n"
                f"Disetujui oleh: {approval.approved_by}\n"
                f"Waktu: {format_datetime(approval.approved_at)}",
                sBody
            )
        ]], colWidths=[170*mm])
        approval_box.setStyle(TableStyle([
            ("BACKGROUND",   (0,0), (-1,-1), colors.HexColor("#FFFBEB")),
            ("LEFTPADDING",  (0,0), (-1,-1), 10),
            ("TOPPADDING",   (0,0), (-1,-1), 8),
            ("BOTTOMPADDING",(0,0), (-1,-1), 8),
            ("LINEBEFORE",   (0,0), (0,-1),  4, AMBER),
        ]))
        story.append(approval_box)

    story.append(sp(6))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(sp(2))
    story.append(Paragraph(
        "Dokumen ini dihasilkan secara otomatis oleh sistem pelaporan. "
        "Sah tanpa tanda tangan basah.",
        sFooter
    ))

# ── Footer function ───────────────────────────────────────────────────────────
def make_footer(job_title: str):
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#64748B"))

        # Left
        canvas.drawString(20*mm, 12*mm, "JobReport")

        # Center
        title = job_title[:50] + "..." if len(job_title) > 50 else job_title
        canvas.drawCentredString(A4[0]/2, 12*mm, title)

        # Right
        canvas.drawRightString(
            A4[0] - 20*mm, 12*mm,
            f"Hal. {doc.page}"
        )
        canvas.restoreState()
    return footer

# ── Main generate function ────────────────────────────────────────────────────
def generate_job_pdf(job: JobReportData) -> bytes:
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18*mm,
        bottomMargin=22*mm,
        leftMargin=20*mm,
        rightMargin=20*mm
    )

    story = []

    # Cover page
    build_cover(story, job)

    # AC unit sections
    for i, unit in enumerate(job.ac_units, 1):
        build_ac_unit_section(story, unit, i)

    # Approval page
    build_approval_page(story, job)

    # Build with footer
    doc.build(
        story,
        onFirstPage=make_footer(job.title),
        onLaterPages=make_footer(job.title)
    )

    buffer.seek(0)
    return buffer.read()

# ── Batch merge ───────────────────────────────────────────────────────────────
def merge_pdfs(pdf_bytes_list: list[bytes]) -> bytes:
    from pypdf import PdfWriter, PdfReader

    writer = PdfWriter()
    for pdf_bytes in pdf_bytes_list:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.read()