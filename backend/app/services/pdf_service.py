import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# Color palette
INDIGO = colors.HexColor("#4f46e5")
INDIGO_LIGHT = colors.HexColor("#e0e7ff")
GREEN = colors.HexColor("#16a34a")
RED = colors.HexColor("#dc2626")
SLATE = colors.HexColor("#334155")
SLATE_LIGHT = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#e2e8f0")


def generate_student_report(
    student_name: str,
    student_email: str,
    student_roll: str,
    exam_title: str,
    score: int,
    total_marks: int,
    percentage: float,
    grade: str,
    pass_fail: str,
    submitted_at: datetime,
    answers_detail: list = None,  # [{"question": str, "selected": str, "correct": str, "is_correct": bool}]
) -> bytes:
    """
    Generate a professional PDF result report.
    Returns PDF as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=INDIGO,
        spaceAfter=4,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=SLATE,
        alignment=TA_CENTER,
        spaceAfter=16,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Normal"],
        fontSize=13,
        textColor=INDIGO,
        fontName="Helvetica-Bold",
        spaceBefore=16,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        textColor=SLATE,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("🎓 Examination Result Report", title_style))
    story.append(Paragraph("Secure QR Code Based Online Examination System", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=INDIGO, spaceAfter=16))

    # ── Student Info Table ────────────────────────────────────────────────────
    story.append(Paragraph("Student Information", section_header_style))

    student_data = [
        ["Student Name", student_name, "Email", student_email],
        ["Roll Number", student_roll or "N/A", "Report Date", datetime.now().strftime("%d %b %Y")],
        ["Exam Name", exam_title, "Submission Time", submitted_at.strftime("%d %b %Y, %I:%M %p")],
    ]

    student_table = Table(student_data, colWidths=[3.5 * cm, 6 * cm, 3 * cm, 5.5 * cm])
    student_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), INDIGO_LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), INDIGO_LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, -1), SLATE),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [SLATE_LIGHT, colors.white]),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 0.3 * inch))

    # ── Result Summary ────────────────────────────────────────────────────────
    story.append(Paragraph("Result Summary", section_header_style))

    status_color = GREEN if pass_fail == "Pass" else RED
    grade_color = GREEN if grade in ["A", "B"] else (INDIGO if grade in ["C", "D"] else RED)

    result_data = [
        ["Score", "Total Marks", "Percentage", "Grade", "Status"],
        [
            str(score),
            str(total_marks),
            f"{percentage:.1f}%",
            grade,
            pass_fail,
        ],
    ]

    result_table = Table(result_data, colWidths=[3.6 * cm, 3.6 * cm, 3.6 * cm, 3.6 * cm, 3.6 * cm])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (2, 1), (2, 1), grade_color),
        ("TEXTCOLOR", (3, 1), (3, 1), grade_color),
        ("TEXTCOLOR", (4, 1), (4, 1), status_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, 1), [SLATE_LIGHT]),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 0.3 * inch))

    # ── Grade Scale ───────────────────────────────────────────────────────────
    story.append(Paragraph("Grade Scale", section_header_style))

    grade_data = [
        ["Grade", "Range", "Remark"],
        ["A", "90 - 100%", "Excellent"],
        ["B", "80 - 89%", "Very Good"],
        ["C", "70 - 79%", "Good"],
        ["D", "60 - 69%", "Satisfactory"],
        ["F", "Below 60%", "Fail"],
    ]

    grade_table = Table(grade_data, colWidths=[3 * cm, 5 * cm, 10 * cm])
    grade_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SLATE_LIGHT, colors.white]),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(grade_table)
    story.append(Spacer(1, 0.3 * inch))

    # ── Answer Detail (if provided) ───────────────────────────────────────────
    if answers_detail:
        story.append(Paragraph("Detailed Answer Analysis", section_header_style))

        ans_data = [["#", "Question", "Your Answer", "Correct Answer", "Result"]]
        for i, item in enumerate(answers_detail, 1):
            ans_data.append([
                str(i),
                Paragraph(item.get("question", "")[:80], body_style),
                item.get("selected", "—") or "—",
                item.get("correct", ""),
                "✓" if item.get("is_correct") else "✗",
            ])

        ans_table = Table(
            ans_data,
            colWidths=[1 * cm, 9 * cm, 2.5 * cm, 2.5 * cm, 1.8 * cm],
        )
        ans_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SLATE_LIGHT, colors.white]),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (2, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))

        # Color correct/incorrect rows
        for row_idx, item in enumerate(answers_detail, 1):
            if item.get("is_correct"):
                ans_table.setStyle(TableStyle([
                    ("TEXTCOLOR", (4, row_idx), (4, row_idx), GREEN),
                    ("FONTNAME", (4, row_idx), (4, row_idx), "Helvetica-Bold"),
                ]))
            else:
                ans_table.setStyle(TableStyle([
                    ("TEXTCOLOR", (4, row_idx), (4, row_idx), RED),
                    ("FONTNAME", (4, row_idx), (4, row_idx), "Helvetica-Bold"),
                ]))

        story.append(ans_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.4 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=8))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y at %I:%M %p')} | "
        "Secure QR Code Based Online Examination System",
        ParagraphStyle("Footer", parent=body_style, alignment=TA_CENTER, fontSize=8, textColor=colors.grey)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
