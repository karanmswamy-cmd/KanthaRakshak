import io
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.screening_test import ScreeningTest
from app.models.patient import Patient

class ReportService:
    """
    Generates institutional-grade PDF summary documents using ReportLab.
    """

    @classmethod
    def generate_pdf_report(cls, test: ScreeningTest, patient: Patient) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Custom typography styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a")
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0d9488")
        )
        header_meta = ParagraphStyle(
            'HeaderMeta',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748b")
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#1e293b")
        )
        body_text = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )
        disclaimer_text = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            alignment=1 # Centered
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("KanthaRakshak", title_style))
        story.append(Paragraph("Every Swallow Counts &bull; Team SunForge Decision Support Prototype", subtitle_style))
        story.append(Paragraph(f"Test ID: {test.id} &bull; Timestamp: {test.started_at.strftime('%Y-%m-%d %H:%M:%S')}", header_meta))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f172a"), spaceAfter=15))

        # 2. Patient Demographics Table
        story.append(Paragraph("1. Patient Demographics & Ward Context", section_heading))
        story.append(Spacer(1, 6))

        pt_data = [
            [
                Paragraph("<b>Patient ID:</b>", body_text), Paragraph(patient.id, body_text),
                Paragraph("<b>Code:</b>", body_text), Paragraph(patient.patient_code or "N/A", body_text)
            ],
            [
                Paragraph("<b>Name / Initials:</b>", body_text), Paragraph(patient.name, body_text),
                Paragraph("<b>Ward:</b>", body_text), Paragraph(patient.ward or "Unassigned", body_text)
            ],
            [
                Paragraph("<b>Age & Cohort:</b>", body_text), Paragraph(f"{patient.age} yrs ({patient.age_group})", body_text),
                Paragraph("<b>Sex:</b>", body_text), Paragraph(patient.sex or "Not stated", body_text)
            ]
        ]
        pt_table = Table(pt_data, colWidths=[90, 175, 75, 190])
        pt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(pt_table)
        story.append(Spacer(1, 15))

        # 3. Final Screening Result Box
        story.append(Paragraph("2. Final Screening Result", section_heading))
        story.append(Spacer(1, 6))

        result_color = colors.HexColor("#10b981") if test.final_result == "LOW_RISK" else (
            colors.HexColor("#f59e0b") if test.final_result == "RETEST" else colors.HexColor("#ef4444")
        )
        bg_color = colors.HexColor("#ecfdf5") if test.final_result == "LOW_RISK" else (
            colors.HexColor("#fffbeb") if test.final_result == "RETEST" else colors.HexColor("#fef2f2")
        )

        result_text_map = {
            "LOW_RISK": "LOW RISK",
            "RETEST": "RETEST / INCONCLUSIVE",
            "POSSIBLE_RISK": "POSSIBLE ASPIRATION RISK"
        }
        res_display = result_text_map.get(test.final_result, test.final_result)

        rec_text = "No concerning swallowing pattern was identified during this screening." if test.final_result == "LOW_RISK" else (
            "Signal quality was insufficient or sensors disagreed. Re-align sensors and repeat test." if test.final_result == "RETEST" else
            "Potentially abnormal swallowing characteristics were identified. Further assessment by a qualified clinician or speech-language professional is recommended."
        )

        res_data = [
            [Paragraph(f"<font size='16' color='{result_color.hexval()}'><b>{res_display}</b></font>", body_text)],
            [Paragraph(f"<b>Clinical Recommendation:</b> {rec_text}", body_text)]
        ]
        res_table = Table(res_data, colWidths=[530])
        res_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('BOX', (0, 0), (-1, -1), 1.5, result_color),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(res_table)
        story.append(Spacer(1, 15))

        # 4. Quantitative Telemetry Metrics Table
        story.append(Paragraph("3. Quantitative Acoustic & Kinematic Metrics", section_heading))
        story.append(Spacer(1, 6))

        metrics_data = [
            [
                Paragraph("<b>Signal Quality:</b>", body_text), Paragraph(test.signal_quality, body_text),
                Paragraph("<b>Noise Floor:</b>", body_text), Paragraph(test.noise_level, body_text)
            ],
            [
                Paragraph("<b>Piezo Event:</b>", body_text), Paragraph("DETECTED" if test.piezo_detected else "NONE", body_text),
                Paragraph("<b>Motion Event:</b>", body_text), Paragraph("DETECTED" if test.motion_detected else "NONE", body_text)
            ],
            [
                Paragraph("<b>Sensor Agreement:</b>", body_text), Paragraph(test.sensor_agreement, body_text),
                Paragraph("<b>Swallow Duration:</b>", body_text), Paragraph(f"{test.swallow_duration:.0f} ms [Ref: 450-1250]*", body_text)
            ],
            [
                Paragraph("<b>Dominant Frequency:</b>", body_text), Paragraph(f"{test.dominant_frequency:.1f} Hz", body_text),
                Paragraph("<b>Rule Verification:</b>", body_text), Paragraph(f"{test.rule_result} [RESEARCH_REQ]*", body_text)
            ]
        ]
        metrics_table = Table(metrics_data, colWidths=[110, 155, 110, 155])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 15))

        # 5. Explanations & Heuristic Rationales
        story.append(Paragraph("4. Decision Reasoning & Explanations", section_heading))
        story.append(Spacer(1, 6))

        reasons = []
        if test.explanation_json:
            try:
                reasons = json.loads(test.explanation_json)
            except:
                reasons = [test.explanation_json]

        for r in reasons:
            story.append(Paragraph(f"&bull; {r}", body_text))
            story.append(Spacer(1, 3))

        story.append(Spacer(1, 15))

        # 6. Mandatory Institutional Disclaimer
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
        story.append(Paragraph(
            "\"KanthaRakshak is an experimental screening prototype and is not intended to provide a clinical diagnosis.\"<br/>"
            "Physiological thresholds marked with (*) are non-medically validated engineering placeholders under research validation.<br/>"
            "This document is for decision-support only and does not replace FEES or VFSS videofluoroscopy.",
            disclaimer_text
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer
