import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from drl_app.models import SystemConfig, CriteriaSet, Student, Evaluation, User, StudentClassPosition
from drl_app.views import create_notification

class Command(BaseCommand):
    help = 'Gửi thông báo nhắc nhở hạn chót nộp phiếu DRL hoặc phê duyệt phiếu.'

    def handle(self, *args, **options):
        # 1. Lấy thông tin hạn chót tự đánh giá
        deadline_config = SystemConfig.objects.filter(key='self_assessment_deadline').first()
        if not deadline_config or not deadline_config.value:
            self.stdout.write(self.style.WARNING("Chưa cấu hình hạn chót tự đánh giá."))
            return

        try:
            val = deadline_config.value
            if len(val) == 10:
                deadline_date = timezone.make_aware(timezone.datetime.strptime(val, "%Y-%m-%d") + datetime.timedelta(days=1))
            else:
                deadline_date = timezone.datetime.fromisoformat(val)
                if timezone.is_naive(deadline_date):
                    deadline_date = timezone.make_aware(deadline_date)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Lỗi parse hạn chót: {e}"))
            return

        now = timezone.now()
        time_left = deadline_date - now
        days_left = time_left.days

        self.stdout.write(f"Hạn chót tự đánh giá: {deadline_date}. Còn lại {days_left} ngày.")

        # Lấy bộ tiêu chí hoạt động hiện hành
        active_set = CriteriaSet.objects.filter(is_active=True).first()
        if not active_set:
            self.stdout.write(self.style.WARNING("Không có bộ tiêu chí đang kích hoạt."))
            return

        semester = active_set.semester
        year = active_set.academic_year

        # Gửi nhắc nhở nộp phiếu tự đánh giá cho sinh viên trước 3 ngày và trước 1 ngày
        if days_left in [1, 3]:
            # Tìm tất cả sinh viên
            students = Student.objects.all()
            for student in students:
                student_user = User.objects.filter(student_id=student.student_id).first()
                if not student_user:
                    continue

                # Kiểm tra xem sinh viên đã nộp phiếu chưa
                has_submitted = Evaluation.objects.filter(
                    student=student,
                    semester=semester,
                    year=year
                ).exclude(status='draft').exists()

                if not has_submitted:
                    create_notification(
                        user=student_user,
                        title=f"Nhắc nhở hạn chót tự chấm DRL: Còn {days_left} ngày",
                        message=f"Hạn chót tự chấm điểm rèn luyện HK{semester} {year} là ngày {val}. Vui lòng hoàn thành phiếu tự chấm của bạn.",
                        type='evaluation',
                        level='warning',
                        action_url='/'
                    )
            self.stdout.write(self.style.SUCCESS(f"Đã gửi nhắc nhở nộp phiếu tự chấm cho sinh viên."))

        # Nhắc nhở duyệt phiếu cho lớp trưởng & cố vấn nếu gần đến hạn chót (trong vòng 3 ngày)
        if days_left <= 3:
            # Nhắc lớp trưởng/lớp phó của các lớp có phiếu ở trạng thái 'class_pending'
            class_pending_evals = Evaluation.objects.filter(
                semester=semester,
                year=year,
                status='class_pending'
            )
            classes_needing_class_review = set(class_pending_evals.values_list('student__class_info_id', flat=True))

            for class_id in classes_needing_class_review:
                if not class_id:
                    continue
                # Tìm ban cán sự lớp
                monitors = User.objects.filter(
                    student_id__in=StudentClassPosition.objects.filter(
                        class_info_id=class_id,
                        position__name__in=['Lớp trưởng', 'Lớp phó']
                    ).values_list('student__student_id', flat=True)
                )
                pending_count = class_pending_evals.filter(student__class_info_id=class_id).count()
                for monitor in monitors:
                    create_notification(
                        user=monitor,
                        title="Nhắc nhở duyệt phiếu DRL cấp Lớp",
                        message=f"Lớp của bạn còn {pending_count} phiếu tự đánh giá đang chờ duyệt cấp Lớp. Vui lòng phê duyệt trước hạn chót.",
                        type='evaluation',
                        level='warning',
                        action_url='/class-review'
                    )

            # Nhắc cố vấn của các lớp có phiếu ở trạng thái 'advisor_pending'
            advisor_pending_evals = Evaluation.objects.filter(
                semester=semester,
                year=year,
                status='advisor_pending'
            )
            classes_needing_advisor_review = set(advisor_pending_evals.values_list('student__class_info_id', flat=True))

            for class_id in classes_needing_advisor_review:
                if not class_id:
                    continue
                # Tìm cố vấn lớp
                from drl_app.models import ClassInfo
                clazz = ClassInfo.objects.filter(id=class_id).first()
                if clazz and clazz.advisor:
                    pending_count = advisor_pending_evals.filter(student__class_info_id=class_id).count()
                    create_notification(
                        user=clazz.advisor,
                        title="Nhắc nhở duyệt phiếu DRL cấp Cố vấn",
                        message=f"Lớp {clazz.name} còn {pending_count} phiếu tự đánh giá đang chờ bạn phê duyệt. Vui lòng phê duyệt trước hạn chót.",
                        type='evaluation',
                        level='warning',
                        action_url='/approvals'
                    )
            self.stdout.write(self.style.SUCCESS("Đã gửi nhắc nhở duyệt phiếu tồn đọng cho cán sự và cố vấn."))
