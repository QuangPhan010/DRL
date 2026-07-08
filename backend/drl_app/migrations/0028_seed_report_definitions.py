from django.db import migrations

def seed_report_definitions(apps, schema_editor):
    ReportDefinition = apps.get_model('drl_app', 'ReportDefinition')
    
    definitions = [
        {
            "code": "evaluation_summary",
            "name": "Báo cáo tổng hợp điểm rèn luyện",
            "description": "Tổng hợp điểm rèn luyện của sinh viên theo học kỳ và năm học.",
            "module": "evaluation",
            "category": "Báo cáo Điểm rèn luyện",
            "permission_required": "advisor"
        },
        {
            "code": "evaluation_detail",
            "name": "Báo cáo chi tiết điểm rèn luyện",
            "description": "Chi tiết điểm rèn luyện của từng sinh viên theo các tiêu chí.",
            "module": "evaluation",
            "category": "Báo cáo Điểm rèn luyện",
            "permission_required": "advisor"
        },
        {
            "code": "student_list",
            "name": "Danh sách sinh viên",
            "description": "Xuất danh sách sinh viên theo lớp, khoa hoặc khóa học.",
            "module": "student",
            "category": "Báo cáo Sinh viên",
            "permission_required": "advisor"
        },
        {
            "code": "student_statistics",
            "name": "Thống kê sinh viên",
            "description": "Báo cáo thống kê số lượng và tỷ lệ sinh viên theo xếp loại rèn luyện.",
            "module": "student",
            "category": "Báo cáo Sinh viên",
            "permission_required": "student_affairs"
        },
        {
            "code": "transcript_summary",
            "name": "Tổng hợp kết quả học tập",
            "description": "Báo cáo tổng hợp GPA và điểm rèn luyện phục vụ xét học bổng.",
            "module": "transcript",
            "category": "Báo cáo Kết quả học tập",
            "permission_required": "academic_affairs"
        },
        {
            "code": "activity_summary",
            "name": "Tổng hợp hoạt động ngoại khóa",
            "description": "Danh sách hoạt động và số lượng sinh viên đăng ký tham gia.",
            "module": "activity",
            "category": "Báo cáo Hoạt động",
            "permission_required": "advisor"
        },
        {
            "code": "attendance_summary",
            "name": "Báo cáo điểm danh hoạt động",
            "description": "Báo cáo chi tiết minh chứng tham gia hoạt động của sinh viên.",
            "module": "activity",
            "category": "Báo cáo Hoạt động",
            "permission_required": "advisor"
        },
        {
            "code": "fraud_report",
            "name": "Báo cáo gian lận minh chứng",
            "description": "Danh sách các trường hợp nghi ngờ gian lận hoặc trùng lặp minh chứng.",
            "module": "fraud",
            "category": "Báo cáo Gian lận",
            "permission_required": "student_affairs"
        },
        {
            "code": "audit_report",
            "name": "Báo cáo vết hệ thống (Audit Log)",
            "description": "Lịch sử thao tác, truy cập và thay đổi cấu hình hệ thống.",
            "module": "audit",
            "category": "Báo cáo Hệ thống",
            "permission_required": "admin"
        }
    ]

    for d in definitions:
        ReportDefinition.objects.update_or_create(
            code=d["code"],
            defaults={
                "name": d["name"],
                "description": d["description"],
                "module": d["module"],
                "category": d["category"],
                "permission_required": d["permission_required"],
                "is_active": True
            }
        )

def remove_report_definitions(apps, schema_editor):
    ReportDefinition = apps.get_model('drl_app', 'ReportDefinition')
    ReportDefinition.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('drl_app', '0027_reportdefinition_reportjob'),
    ]

    operations = [
        migrations.RunPython(seed_report_definitions, remove_report_definitions),
    ]
