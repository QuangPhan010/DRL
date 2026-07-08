import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import io

class ExcelExporter:
    """
    Excel Report Exporter for Training Points.
    Generates a stylized excel file using openpyxl.
    """
    def export(self, data, parameters):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Điểm Rèn Luyện"
        
        # Show grid lines
        ws.views.sheetView[0].showGridLines = True
        
        # Styles definition
        title_font = Font(name="Calibri", size=16, bold=True, color="1F497D")
        subtitle_font = Font(name="Calibri", size=11, italic=True)
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        data_font = Font(name="Calibri", size=11)
        
        header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
        
        thin_side = Side(border_style="thin", color="D3D3D3")
        border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        
        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")
        
        school_year = parameters.get('school_year', '')
        semester = parameters.get('semester', '')
        faculty = parameters.get('faculty', '')
        class_name = parameters.get('class_name', '')
        
        # Title lines
        ws.append([]) # Row 1
        ws.cell(row=2, column=1, value="BÁO CÁO TỔNG HỢP ĐIỂM RÈN LUYỆN SINH VIÊN").font = title_font
        ws.cell(row=3, column=1, value=f"Năm học: {school_year} | Học kỳ: {semester}").font = subtitle_font
        
        filters = []
        if faculty:
            filters.append(f"Khoa: {faculty}")
        if class_name:
            filters.append(f"Lớp: {class_name}")
        if filters:
            ws.cell(row=4, column=1, value=" - ".join(filters)).font = subtitle_font
            start_row = 6
        else:
            start_row = 5
            
        headers = [
            "STT", "MSSV", "Họ và tên", "Lớp", "Khoa", 
            "GPA", "Xếp loại học tập", "Điểm tự đánh giá", 
            "Điểm rèn luyện tổng", "Xếp loại rèn luyện", "Trạng thái"
        ]
        
        # Headers Row
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = border
            
        # Write data rows
        for row_idx, item in enumerate(data, 1):
            r = start_row + row_idx
            ws.cell(row=r, column=1, value=row_idx).alignment = align_center
            ws.cell(row=r, column=2, value=item.get('student_id', '')).alignment = align_center
            ws.cell(row=r, column=3, value=item.get('full_name', '')).alignment = align_left
            ws.cell(row=r, column=4, value=item.get('class_name', '')).alignment = align_center
            ws.cell(row=r, column=5, value=item.get('faculty', '')).alignment = align_left
            ws.cell(row=r, column=6, value=item.get('gpa', 0.0)).alignment = align_right
            ws.cell(row=r, column=7, value=item.get('gpa_classification', '')).alignment = align_center
            ws.cell(row=r, column=8, value=item.get('self_score', 0)).alignment = align_right
            ws.cell(row=r, column=9, value=item.get('total_score', 0)).alignment = align_right
            ws.cell(row=r, column=10, value=item.get('classification', '')).alignment = align_center
            ws.cell(row=r, column=11, value=item.get('status', '')).alignment = align_center
            
            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=r, column=col_idx)
                cell.font = data_font
                cell.border = border
                
        # Auto-fit column widths
        for col in ws.columns:
            max_len = 0
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            for cell in col[start_row-1:]:
                if cell.value:
                    # Account for UTF-8 character length vs width approximations
                    val_str = str(cell.value)
                    max_len = max(max_len, len(val_str))
            ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
            
        # Save to byte stream
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()
