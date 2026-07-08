import os
import io
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

class PdfExporter:
    """
    PDF Report Exporter for Training Points.
    Generates a stylized PDF using ReportLab with Unicode Vietnamese support.
    """
    def export(self, data, parameters):
        # Register standard Windows Arial font for Unicode Vietnamese support
        font_name = 'Helvetica'
        font_bold_name = 'Helvetica-Bold'
        font_italic_name = 'Helvetica-Oblique'
        
        # Windows Fonts path
        win_font_dir = "C:\\Windows\\Fonts"
        arial_ttf = os.path.join(win_font_dir, "arial.ttf")
        arial_bd_ttf = os.path.join(win_font_dir, "arialbd.ttf")
        arial_it_ttf = os.path.join(win_font_dir, "ariali.ttf")
        
        if os.path.exists(arial_ttf):
            try:
                pdfmetrics.registerFont(TTFont('Arial', arial_ttf))
                font_name = 'Arial'
                if os.path.exists(arial_bd_ttf):
                    pdfmetrics.registerFont(TTFont('Arial-Bold', arial_bd_ttf))
                    font_bold_name = 'Arial-Bold'
                else:
                    font_bold_name = 'Arial'
                if os.path.exists(arial_it_ttf):
                    pdfmetrics.registerFont(TTFont('Arial-Italic', arial_it_ttf))
                    font_italic_name = 'Arial-Italic'
                else:
                    font_italic_name = 'Arial'
            except Exception:
                pass

        school_year = parameters.get('school_year', '')
        semester = parameters.get('semester', '')
        faculty = parameters.get('faculty', '')
        class_name = parameters.get('class_name', '')
        
        # Prepare document
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=landscape(letter),
            rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
        )
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName=font_bold_name,
            fontSize=16,
            textColor=colors.HexColor('#1F497D'),
            alignment=1, # Center
            spaceAfter=6
        )
        
        sub_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName=font_italic_name,
            fontSize=11,
            alignment=1, # Center
            spaceAfter=15
        )

        header_style = ParagraphStyle(
            'HeaderStyle',
            fontName=font_bold_name,
            fontSize=9,
            textColor=colors.white,
            alignment=1 # Center
        )

        cell_style = ParagraphStyle(
            'CellStyle',
            fontName=font_name,
            fontSize=9,
            alignment=0 # Left
        )

        cell_center_style = ParagraphStyle(
            'CellCenterStyle',
            fontName=font_name,
            fontSize=9,
            alignment=1 # Center
        )
        
        # Title & Subtitle paragraphs
        story.append(Paragraph("BÁO CÁO TỔNG HỢP ĐIỂM RÈN LUYỆN SINH VIÊN", title_style))
        
        sub_text = f"Năm học: {school_year}  |  Học kỳ: {semester}"
        filters = []
        if faculty:
            filters.append(f"Khoa: {faculty}")
        if class_name:
            filters.append(f"Lớp: {class_name}")
        if filters:
            sub_text += "  |  " + " - ".join(filters)
        story.append(Paragraph(sub_text, sub_style))
        story.append(Spacer(1, 10))
        
        # Headers definitions
        headers = [
            Paragraph("STT", header_style),
            Paragraph("MSSV", header_style),
            Paragraph("Họ và tên", header_style),
            Paragraph("Lớp", header_style),
            Paragraph("Khoa", header_style),
            Paragraph("GPA", header_style),
            Paragraph("Xếp loại HT", header_style),
            Paragraph("Điểm tự ĐG", header_style),
            Paragraph("Điểm RL tổng", header_style),
            Paragraph("Xếp loại RL", header_style),
            Paragraph("Trạng thái", header_style)
        ]
        
        table_data = [headers]
        
        # Data rows
        for idx, item in enumerate(data, 1):
            row = [
                Paragraph(str(idx), cell_center_style),
                Paragraph(item.get('student_id', ''), cell_center_style),
                Paragraph(item.get('full_name', ''), cell_style),
                Paragraph(item.get('class_name', ''), cell_center_style),
                Paragraph(item.get('faculty', ''), cell_style),
                Paragraph(str(item.get('gpa', 0.0)), cell_center_style),
                Paragraph(item.get('gpa_classification', ''), cell_center_style),
                Paragraph(str(item.get('self_score', 0)), cell_center_style),
                Paragraph(str(item.get('total_score', 0)), cell_center_style),
                Paragraph(item.get('classification', ''), cell_center_style),
                Paragraph(item.get('status', ''), cell_center_style)
            ]
            table_data.append(row)
            
        # Create Table and set Styles
        # Widths must sum up to width of landcape letter minus margins (approx 732 pts)
        col_widths = [25, 60, 110, 60, 80, 40, 70, 55, 60, 80, 92]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F497D')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('TOPPADDING', (0,1), (-1,-1), 5),
            ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        ]))
        
        story.append(t)
        
        # Build document
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
