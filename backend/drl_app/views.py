import math
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import User, ClassInfo, Student, Criterion, Evaluation, EvaluationDetail, Activity, ActivityParticipant, Organization, UserOrganization, ClassPosition, StudentClassPosition, ActivityCheckIn, ActivityCheckOut, ActivityAttendance, FraudDetection, AuditLog, ChangeRequest, ExternalActivity, EvidenceFile, EvidenceReview, FraudFlag
from .serializers import (
    UserSerializer, ClassInfoSerializer, StudentSerializer, CriterionSerializer, 
    EvaluationSerializer, ActivitySerializer, ActivityParticipantSerializer,
    OrganizationSerializer, UserOrganizationSerializer, ClassPositionSerializer, StudentClassPositionSerializer,
    ActivityCheckInSerializer, ActivityCheckOutSerializer, ActivityAttendanceSerializer, FraudDetectionSerializer, AuditLogSerializer, ChangeRequestSerializer,
    ExternalActivitySerializer, EvidenceFileSerializer, EvidenceReviewSerializer, FraudFlagSerializer
)

# 1. Login View
@swagger_auto_schema(
    method='post',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['username', 'password'],
        properties={
            'username': openapi.Schema(type=openapi.TYPE_STRING),
            'password': openapi.Schema(type=openapi.TYPE_STRING)
        }
    ),
    responses={200: openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'token': openapi.Schema(type=openapi.TYPE_STRING),
            'user': openapi.Schema(type=openapi.TYPE_OBJECT)
        }
    )}
)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    from django.db.models import Q
    user_obj = User.objects.filter(Q(username=username) | Q(student_id=username)).first()
    if user_obj:
        user = authenticate(username=user_obj.username, password=password)
        if user:
            if not user.is_active:
                return Response({'error': 'Tài khoản đã bị đóng.'}, status=status.HTTP_403_FORBIDDEN)
            return Response({
                'token': f"mock-token-for-{user.username}",
                'user': UserSerializer(user).data,
                'is_first_login': user.is_first_login
            })
    return Response({'error': 'Invalid username or password'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def change_password_view(request):
    username = request.data.get('username')
    new_password = request.data.get('password')
    if not username or not new_password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.db.models import Q
    user = User.objects.filter(Q(username=username) | Q(student_id=username)).first()
    if not user:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
    user.set_password(new_password)
    user.is_first_login = False
    user.plain_password = new_password
    user.save()
    return Response({'message': 'Password changed successfully', 'user': UserSerializer(user).data})

# 2. ClassInfo ViewSet
class ClassInfoViewSet(viewsets.ModelViewSet):
    serializer_class = ClassInfoSerializer
    permission_classes = [permissions.AllowAny] # In actual build, we can restrict by roles.

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'advisor':
            return ClassInfo.objects.filter(advisor=user)
        
        advisor_id = self.request.query_params.get('advisorId') or self.request.query_params.get('advisor_id')
        if advisor_id:
            return ClassInfo.objects.filter(advisor_id=advisor_id)
            
        return ClassInfo.objects.all()

    @action(detail=True, methods=['post'], url_path='assign-advisor')
    def assign_advisor(self, request, pk=None):
        class_info = self.get_object_value(pk)
        advisor_id = request.data.get('advisorId') or request.data.get('advisor_id')
        if not advisor_id:
            class_info.advisor = None
            class_info.save()
            return Response(ClassInfoSerializer(class_info).data)
        
        advisor = get_object_or_404(User, id=advisor_id, role='advisor')
        class_info.advisor = advisor
        class_info.save()
        return Response(ClassInfoSerializer(class_info).data)

    @action(detail=True, methods=['post'], url_path='assign-monitor')
    def assign_monitor(self, request, pk=None):
        class_info = self.get_object_value(pk)
        student_id = request.data.get('studentId') or request.data.get('student_id')
        student = get_object_or_404(Student, student_id=student_id, class_info=class_info)
        
        # Demote previous monitor
        position, _ = ClassPosition.objects.get_or_create(name='Lớp trưởng')
        StudentClassPosition.objects.filter(class_info=class_info, position=position).delete()
        
        # Assign new monitor
        assigned_by = request.user if request.user.is_authenticated else None
        StudentClassPosition.objects.create(student=student, class_info=class_info, position=position, assigned_by=assigned_by)
        
        # Backwards compatibility: update roles
        User.objects.filter(student_id=student_id).update(role='class_monitor')
        
        return Response({'message': f'Student {student_id} is now the class monitor'})

    @action(detail=True, methods=['post'], url_path='assign-position')
    def assign_position(self, request, pk=None):
        class_info = self.get_object_value(pk)
        student_id = request.data.get('studentId') or request.data.get('student_id')
        position_name = request.data.get('positionName') or request.data.get('position_name')
        
        student = get_object_or_404(Student, student_id=student_id, class_info=class_info)
        position, _ = ClassPosition.objects.get_or_create(name=position_name)
        
        assigned_by = request.user if request.user.is_authenticated else None
        
        # Unique positions per class
        if position_name in ['Lớp trưởng', 'Lớp phó', 'Bí thư']:
            StudentClassPosition.objects.filter(class_info=class_info, position=position).delete()
            
            # Backwards compatibility with the static role
            if position_name == 'Lớp trưởng':
                class_students = Student.objects.filter(class_info=class_info)
                User.objects.filter(student_id__in=class_students.values_list('student_id', flat=True), role='class_monitor').update(role='student')
                User.objects.filter(student_id=student_id).update(role='class_monitor')

        StudentClassPosition.objects.update_or_create(
            student=student,
            class_info=class_info,
            position=position,
            defaults={'assigned_by': assigned_by}
        )
        
        return Response({'message': f'Student {student_id} has been assigned position {position_name}'})

    @action(detail=True, methods=['post'], url_path='revoke-position')
    def revoke_position(self, request, pk=None):
        class_info = self.get_object_value(pk)
        student_id = request.data.get('studentId') or request.data.get('student_id')
        position_name = request.data.get('positionName') or request.data.get('position_name')
        
        student = get_object_or_404(Student, student_id=student_id, class_info=class_info)
        
        StudentClassPosition.objects.filter(
            student=student,
            class_info=class_info,
            position__name=position_name
        ).delete()
        
        # If revoking Lớp trưởng, revert role to student for backwards compatibility
        if position_name == 'Lớp trưởng':
            User.objects.filter(student_id=student_id, role='class_monitor').update(role='student')
            
        return Response({'message': f'Revoked position {position_name} from student {student_id}'})

    def get_object_value(self, pk):
        return get_object_or_404(ClassInfo, pk=pk)

    @action(detail=True, methods=['get', 'post'], url_path='students')
    def students(self, request, pk=None):
        class_info = self.get_object_value(pk)
        if request.method == 'GET':
            students = Student.objects.filter(class_info=class_info)
            return Response(StudentSerializer(students, many=True).data)
        
        elif request.method == 'POST':
            student_id = request.data.get('studentId') or request.data.get('student_id')
            student = get_object_or_404(Student, student_id=student_id)
            student.class_info = class_info
            student.save()
            return Response(StudentSerializer(student).data)

    @action(detail=True, methods=['delete'], url_path='students/(?P<student_id>[^/.]+)')
    def remove_student(self, request, pk=None, student_id=None):
        class_info = self.get_object_value(pk)
        student = get_object_or_404(Student, student_id=student_id, class_info=class_info)
        student.class_info = None
        student.save()
        return Response({'message': 'Student removed from class successfully'})

# 3. Student ViewSet
class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.all()
        if user.is_authenticated and user.role == 'advisor':
            queryset = queryset.filter(class_info__advisor=user)
            
        student_id = self.request.query_params.get('student_id') or self.request.query_params.get('studentId')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        class_name = self.request.query_params.get('class_name') or self.request.query_params.get('className')
        if class_name:
            queryset = queryset.filter(class_info__name=class_name)
            
        return queryset

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file was submitted'}, status=status.HTTP_400_BAD_REQUEST)

        import openpyxl
        import random
        try:
            wb = openpyxl.load_workbook(file_obj, read_only=True)
            sheet = wb.active
            
            students_created = 0
            first_row = True
            header_map = {}
            for row in sheet.iter_rows(values_only=True):
                if first_row:
                    first_row = False
                    for idx, cell in enumerate(row):
                        if cell:
                            header_map[str(cell).strip().lower()] = idx
                    continue
                
                # Skip completely empty rows
                if not any(row):
                    continue

                def get_val(names):
                    for name in names:
                        if name in header_map:
                            idx = header_map[name]
                            if idx < len(row):
                                val = row[idx]
                                return str(val).strip() if val is not None else ''
                    return ''

                student_id = get_val(['mã sv', 'ma sv', 'student id', 'student_id', 'mã sinh viên', 'ma sinh vien'])
                full_name = get_val(['họ và tên', 'ho va ten', 'full name', 'fullname', 'tên', 'ten'])
                email = get_val(['email', 'thư điện tử', 'thu dien tu'])
                class_name = get_val(['lớp', 'lop', 'class', 'class name', 'class_name'])
                faculty = get_val(['khoa', 'faculty', 'khoa đào tạo', 'khoa dao tao']) or 'Công nghệ Thông tin'
                cohort = get_val(['khóa', 'khoa', 'cohort', 'niên khóa', 'nien khoa']) or 'K20'
                gender = get_val(['giới tính', 'gioi tinh', 'gender']) or 'Nam'
                phone = get_val(['số điện thoại', 'so dien thoai', 'phone', 'sđt', 'sdt'])

                if not student_id or not full_name or not email:
                    continue

                # Find or create class
                from .models import ClassInfo
                class_obj = None
                if class_name:
                    class_obj, _ = ClassInfo.objects.get_or_create(
                        name=class_name,
                        defaults={'faculty': faculty, 'cohort': cohort}
                    )

                student_obj = Student.objects.filter(student_id=student_id).first()
                if not student_obj:
                    user_obj = User.objects.filter(student_id=student_id).first()
                    if not user_obj:
                        username = student_id.lower()
                        if User.objects.filter(username=username).exists():
                            username = f"{username}_{random.randint(1000, 9999)}"
                        random_password = generate_random_password()
                        user_obj = User.objects.create_user(
                            username=username,
                            email=email,
                            password=random_password,
                            role='student',
                            full_name=full_name,
                            student_id=student_id,
                            is_first_login=True,
                            plain_password=random_password
                        )

                    Student.objects.create(
                        user=user_obj,
                        student_id=student_id,
                        full_name=full_name,
                        email=email,
                        class_info=class_obj,
                        faculty=faculty,
                        cohort=cohort,
                        gender=gender,
                        phone=phone
                    )
                    students_created += 1
                else:
                    student_obj.full_name = full_name
                    student_obj.email = email
                    if class_obj:
                        student_obj.class_info = class_obj
                    student_obj.faculty = faculty
                    student_obj.cohort = cohort
                    student_obj.gender = gender
                    if phone:
                        student_obj.phone = phone
                    student_obj.save()

            return Response({'message': f'Nhập thành công danh sách sinh viên.', 'created_count': students_created})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        import openpyxl
        from django.http import HttpResponse
        
        # Get query parameters
        faculty = request.query_params.get('faculty')
        class_name = request.query_params.get('className') or request.query_params.get('class_name')
        
        # Filter queryset
        queryset = Student.objects.all()
        if faculty and faculty != 'all':
            queryset = queryset.filter(faculty__iexact=faculty)
        if class_name and class_name != 'all':
            queryset = queryset.filter(class_info__name__iexact=class_name)
            
        # Group by class name
        from collections import defaultdict
        grouped_students = defaultdict(list)
        for student in queryset:
            c_name = student.class_info.name if student.class_info else "Chưa xếp lớp"
            grouped_students[c_name].append(student)
            
        wb = openpyxl.Workbook()
        
        # Remove default sheet
        default_sheet = wb.active
        wb.remove(default_sheet)
        
        if not grouped_students:
            # If empty, create at least one empty sheet
            wb.create_sheet(title="Sinh viên")
        else:
            for c_name, students_list in grouped_students.items():
                sheet_title = c_name[:30]
                sheet = wb.create_sheet(title=sheet_title)
                
                headers = ["Mã SV", "Họ và tên", "Lớp", "Khoa", "Giới tính", "Email", "Số điện thoại", "Mật khẩu"]
                sheet.append(headers)
                
                for s in students_list:
                    if not s.user:
                        username = s.student_id.lower()
                        import random
                        if User.objects.filter(username=username).exists():
                            username = f"{username}_{random.randint(1000, 9999)}"
                        
                        random_password = generate_random_password()
                        user_obj = User.objects.create_user(
                            username=username,
                            email=s.email,
                            password=random_password,
                            role='student',
                            full_name=s.full_name,
                            student_id=s.student_id,
                            is_first_login=True,
                            plain_password=random_password
                        )
                        s.user = user_obj
                        s.save()
                    
                    plain_password = s.user.plain_password
                    if not plain_password:
                        random_password = generate_random_password()
                        s.user.set_password(random_password)
                        s.user.plain_password = random_password
                        s.user.save()
                        plain_password = random_password
                        
                    sheet.append([
                        s.student_id,
                        s.full_name,
                        s.class_info.name if s.class_info else "Chưa xếp lớp",
                        s.faculty,
                        s.gender,
                        s.email,
                        s.phone or "",
                        plain_password
                    ])
                
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="danh_sach_sinh_vien.xlsx"'
        wb.save(response)
        return response

# 4. Criterion ViewSet
class CriterionViewSet(viewsets.ModelViewSet):
    queryset = Criterion.objects.all()
    serializer_class = CriterionSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        code = request.data.get('code')
        name = request.data.get('name')
        max_score = request.data.get('maxScore') or request.data.get('max_score', 0)
        description = request.data.get('description', '')
        groups_data = request.data.get('groups', [])

        criterion = Criterion.objects.create(
            code=code,
            name=name,
            max_score=max_score,
            description=description
        )

        from .models import GroupCriterion, SubItem
        for g in groups_data:
            group = GroupCriterion.objects.create(
                criterion=criterion,
                name=g.get('name', '')
            )
            for s in g.get('subItems', []):
                SubItem.objects.create(
                    group=group,
                    name=s.get('name', ''),
                    max_score=s.get('maxScore') or s.get('max_score', 0)
                )

        return Response(CriterionSerializer(criterion).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None, *args, **kwargs):
        criterion = self.get_object()
        criterion.code = request.data.get('code', criterion.code)
        criterion.name = request.data.get('name', criterion.name)
        criterion.max_score = request.data.get('maxScore') or request.data.get('max_score', criterion.max_score)
        criterion.description = request.data.get('description', criterion.description)
        criterion.save()

        groups_data = request.data.get('groups')
        if groups_data is not None:
            criterion.groups.all().delete()
            from .models import GroupCriterion, SubItem
            for g in groups_data:
                group = GroupCriterion.objects.create(
                    criterion=criterion,
                    name=g.get('name', '')
                )
                for s in g.get('subItems', []):
                    SubItem.objects.create(
                        group=group,
                        name=s.get('name', ''),
                        max_score=s.get('maxScore') or s.get('max_score', 0)
                    )

        return Response(CriterionSerializer(criterion).data)

# 5. Evaluation ViewSet
class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        queryset = Evaluation.objects.all()
        
        if user.is_authenticated and user.role == 'advisor':
            queryset = queryset.filter(student__class_info__advisor=user)
            
        class_name = self.request.query_params.get('className') or self.request.query_params.get('class_name')
        semester = self.request.query_params.get('semester')
        year = self.request.query_params.get('year')
        status_param = self.request.query_params.get('status')
        
        student_id = self.request.query_params.get('studentId') or self.request.query_params.get('student_id')
        
        if class_name:
            queryset = queryset.filter(student__class_info__name=class_name)
        if semester:
            queryset = queryset.filter(semester=semester)
        if year:
            queryset = queryset.filter(year=year)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if student_id:
            queryset = queryset.filter(student__student_id=student_id)
            
        return queryset

    def create(self, request, *args, **kwargs):
        student_id = request.data.get('studentId') or request.data.get('student_id')
        student = get_object_or_404(Student, student_id=student_id)
        semester = request.data.get('semester')
        year = request.data.get('year')
        scores_data = request.data.get('scores', {}) # dict of subitem_id -> score
        note = request.data.get('note', '')
        status_param = request.data.get('status', 'draft')

        # Create or update evaluation
        evaluation, created = Evaluation.objects.update_or_create(
            student=student, semester=semester, year=year,
            defaults={
                'note': note,
                'status': status_param,
                'class_confirmed': False
            }
        )

        # Clear old details
        evaluation.details.all().delete()

        # Write new details and calculate total score
        total_score = 0
        from .models import SubItem
        for sub_item_id, score_val in scores_data.items():
            try:
                sub_item = SubItem.objects.get(id=sub_item_id)
                EvaluationDetail.objects.create(
                    evaluation=evaluation,
                    sub_item=sub_item,
                    score=score_val
                )
            except SubItem.DoesNotExist:
                pass

        # Recalculate total score based on parent criteria constraints
        total_score = 0
        for criterion in Criterion.objects.all():
            crit_score = 0
            details = EvaluationDetail.objects.filter(evaluation=evaluation, sub_item__group__criterion=criterion)
            for d in details:
                crit_score += d.score
            # Clamp between 0 and max_score
            total_score += max(0, min(criterion.max_score, crit_score))

        evaluation.total_score = total_score
        
        # Classify
        if total_score >= 90:
            evaluation.classification = "Xuất sắc"
        elif total_score >= 80:
            evaluation.classification = "Tốt"
        elif total_score >= 65:
            evaluation.classification = "Khá"
        elif total_score >= 50:
            evaluation.classification = "Trung bình"
        elif total_score >= 35:
            evaluation.classification = "Yếu"
        else:
            evaluation.classification = "Kém"

        evaluation.save()
        return Response(EvaluationSerializer(evaluation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        evaluation = self.get_object()
        review_note = request.data.get('reviewNote', '')
        evaluation.class_confirmed = True
        evaluation.status = 'advisor_pending'
        evaluation.review_note = review_note
        evaluation.save()
        return Response(EvaluationSerializer(evaluation).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        evaluation = self.get_object()
        status_param = request.data.get('status') # 'approved', 'rejected', 'pending'
        review_note = request.data.get('reviewNote', '')
        
        if status_param not in ['approved', 'rejected', 'pending']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            
        evaluation.status = status_param
        evaluation.review_note = review_note
        evaluation.save()
        return Response(EvaluationSerializer(evaluation).data)

# 6. Activity ViewSet
class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], url_path='register')
    def register(self, request, pk=None):
        activity = self.get_object()
        student_id = request.data.get('studentId') or request.data.get('student_id')
        student = get_object_or_404(Student, student_id=student_id)
        
        participant, created = ActivityParticipant.objects.get_or_create(
            activity=activity, student=student,
            defaults={'status': 'registered'}
        )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='submit-evidence')
    def submit_evidence(self, request, pk=None):
        activity = self.get_object()
        student_id = request.data.get('studentId') or request.data.get('student_id')
        evidence_url = request.data.get('evidenceUrl')
        student = get_object_or_404(Student, student_id=student_id)
        
        participant = get_object_or_404(ActivityParticipant, activity=activity, student=student)
        participant.status = 'evidence_submitted'
        participant.evidence_url = evidence_url
        participant.save()

        # Fraud Rule 8 check: If modifying points/status after CTSV approval, log it
        # (For this mock, we write an audit log entry)
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action="Nộp minh chứng hoạt động",
            entity_name="ActivityParticipant",
            entity_id=participant.id,
            before_value="registered",
            after_value="evidence_submitted",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='confirm-attended')
    def confirm_attended(self, request, pk=None):
        activity = self.get_object()
        student_id = request.data.get('studentId') or request.data.get('student_id')
        student = get_object_or_404(Student, student_id=student_id)
        participant = get_object_or_404(ActivityParticipant, activity=activity, student=student)
        participant.status = 'attended'
        participant.save()
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='approve-points')
    def approve_points(self, request, pk=None):
        activity = self.get_object()
        activity.status = 'completed'
        activity.save()
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='check-in', permission_classes=[permissions.IsAuthenticated])
    def check_in(self, request, pk=None):
        activity = self.get_object()
        if not hasattr(request.user, 'student_profile') or not request.user.student_profile:
            return Response({'error': 'Tài khoản không phải là sinh viên hoặc không có hồ sơ sinh viên'}, status=status.HTTP_400_BAD_REQUEST)
        student = request.user.student_profile
        
        # Check check-in timing (UTC+7 / Asia/Ho_Chi_Minh)
        import datetime
        import pytz
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        now = timezone.now()
        
        if activity.start_time and activity.date:
            naive_start = datetime.datetime.combine(activity.date, activity.start_time)
            start_dt = tz.localize(naive_start)
            checkin_start = start_dt - datetime.timedelta(minutes=10)
            if now < checkin_start:
                return Response({'error': 'Hoạt động chưa mở check-in. Vui lòng quay lại trước giờ diễn ra 10 phút.'}, status=status.HTTP_400_BAD_REQUEST)
                
        if activity.end_time and activity.date:
            naive_end = datetime.datetime.combine(activity.date, activity.end_time)
            end_dt = tz.localize(naive_end)
            if now > end_dt:
                return Response({'error': 'Hoạt động đã kết thúc, không thể check-in.'}, status=status.HTTP_400_BAD_REQUEST)

        lat = float(request.data.get('latitude', 0.0))
        lon = float(request.data.get('longitude', 0.0))
        selfie_id = request.data.get('selfieFileId') or request.data.get('selfie_file_id', '')
        device_id = request.data.get('deviceId') or request.data.get('device_id', 'unknown_device')
        ip_addr = request.data.get('ipAddress') or request.data.get('ip_address') or request.META.get('REMOTE_ADDR', '127.0.0.1')

        # Check if they are updating a missing selfie
        existing_checkin = ActivityCheckIn.objects.filter(activity=activity, student=student).first()
        if existing_checkin and selfie_id:
            existing_checkin.selfie_file_id = selfie_id
            existing_checkin.save()
            
            # If there was a RULE_4 fraud detection, delete it
            RULE_4_fraud = FraudDetection.objects.filter(student=student, activity=activity, rule_code="RULE_4").first()
            if RULE_4_fraud:
                RULE_4_fraud.delete()
                
            # Write AuditLog
            AuditLog.objects.create(
                user=request.user,
                action="Bổ sung ảnh selfie thành công",
                entity_name="ActivityCheckIn",
                entity_id=existing_checkin.id,
                before_value="Thiếu ảnh selfie",
                after_value=selfie_id,
                ip_address=ip_addr
            )
            return Response({
                'message': 'Bổ sung ảnh selfie thành công',
                'gps_valid': True,
                'distance_meters': 0.0,
                'check_in': ActivityCheckInSerializer(existing_checkin).data
            })

        # 1. Haversine distance validation
        def haversine(lat1, lon1, lat2, lon2):
            dLat = (lat2 - lat1) * math.pi / 180.0
            dLon = (lon2 - lon1) * math.pi / 180.0
            lat1 = lat1 * math.pi / 180.0
            lat2 = lat2 * math.pi / 180.0
            a = (pow(math.sin(dLat / 2), 2) +
                 pow(math.sin(dLon / 2), 2) *
                 math.cos(lat1) * math.cos(lat2))
            return 6371000 * 2 * math.asin(math.sqrt(a)) # meters

        act_lat = float(activity.latitude) if activity.latitude is not None else 10.850100
        act_lon = float(activity.longitude) if activity.longitude is not None else 106.771200
        act_radius = int(activity.radius_meters) if activity.radius_meters is not None else 100

        dist = haversine(act_lat, act_lon, lat, lon)
        is_gps_invalid = dist > act_radius

        if is_gps_invalid:
            FraudDetection.objects.create(
                student=student,
                activity=activity,
                rule_code="RULE_1",
                severity="High",
                description=f"Check-in ngoài bán kính GPS cho phép: {dist:.1f}m (Giới hạn {act_radius}m)"
            )

        # 2. Selfie validation
        if not selfie_id:
            FraudDetection.objects.create(
                student=student,
                activity=activity,
                rule_code="RULE_4",
                severity="Medium",
                description="Check-in thiếu ảnh selfie minh chứng thực tế"
            )

        # 3. Shared device within 3 minutes check
        three_minutes_ago = timezone.now() - timezone.timedelta(minutes=3)
        shared_device_checkins = ActivityCheckIn.objects.filter(
            activity=activity,
            device_id=device_id,
            check_in_time__gte=three_minutes_ago
        ).exclude(student=student)

        if shared_device_checkins.exists():
            other_students = ", ".join([ci.student.student_id for ci in shared_device_checkins])
            FraudDetection.objects.create(
                student=student,
                activity=activity,
                rule_code="RULE_5",
                severity="High",
                description=f"Nhiều tài khoản check-in chung một thiết bị ({device_id}) trong thời gian ngắn: {other_students}"
            )

        # Save check-in
        checkin_obj = ActivityCheckIn.objects.create(
            activity=activity,
            student=student,
            latitude=lat,
            longitude=lon,
            selfie_file_id=selfie_id,
            device_id=device_id,
            ip_address=ip_addr
        )

        # Initialize/update Attendance record
        attendance, _ = ActivityAttendance.objects.get_or_create(activity=activity, student=student)
        attendance.save()

        return Response({
            'message': 'Check-in thành công',
            'gps_valid': not is_gps_invalid,
            'distance_meters': dist,
            'check_in': ActivityCheckInSerializer(checkin_obj).data
        })

    @action(detail=True, methods=['post'], url_path='check-out', permission_classes=[permissions.IsAuthenticated])
    def check_out(self, request, pk=None):
        activity = self.get_object()
        if not hasattr(request.user, 'student_profile') or not request.user.student_profile:
            return Response({'error': 'Tài khoản không phải là sinh viên hoặc không có hồ sơ sinh viên'}, status=status.HTTP_400_BAD_REQUEST)
        student = request.user.student_profile

        # Validate that check-in occurred
        checkin_obj = ActivityCheckIn.objects.filter(activity=activity, student=student).order_by('-check_in_time').first()
        if not checkin_obj:
            return Response({'error': 'Bạn chưa thực hiện check-in cho hoạt động này.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check check-out timing (UTC+7 / Asia/Ho_Chi_Minh)
        import datetime
        import pytz
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        now = timezone.now()

        if activity.end_time and activity.date:
            naive_end = datetime.datetime.combine(activity.date, activity.end_time)
            end_dt = tz.localize(naive_end)
            checkout_start = end_dt - datetime.timedelta(minutes=10)
            if now < checkout_start:
                remaining_seconds = int((checkout_start - now).total_seconds())
                remaining_mins = max(1, int(remaining_seconds / 60))
                return Response({
                    'error': f'Chưa thể check-out. Bạn chỉ có thể check-out trước khi kết thúc 10 phút (Còn khoảng {remaining_mins} phút nữa).'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        lat = float(request.data.get('latitude', 0.0))
        lon = float(request.data.get('longitude', 0.0))
        selfie_id = request.data.get('selfieFileId') or request.data.get('selfie_file_id', '')
        device_id = request.data.get('deviceId') or request.data.get('device_id', 'unknown_device')
        ip_addr = request.data.get('ipAddress') or request.data.get('ip_address') or request.META.get('REMOTE_ADDR', '127.0.0.1')

        # 1. Haversine distance validation
        def haversine(lat1, lon1, lat2, lon2):
            dLat = (lat2 - lat1) * math.pi / 180.0
            dLon = (lon2 - lon1) * math.pi / 180.0
            lat1 = lat1 * math.pi / 180.0
            lat2 = lat2 * math.pi / 180.0
            a = (pow(math.sin(dLat / 2), 2) +
                 pow(math.sin(dLon / 2), 2) *
                 math.cos(lat1) * math.cos(lat2))
            return 6371000 * 2 * math.asin(math.sqrt(a)) # meters

        act_lat = float(activity.latitude) if activity.latitude is not None else 10.850100
        act_lon = float(activity.longitude) if activity.longitude is not None else 106.771200
        act_radius = int(activity.radius_meters) if activity.radius_meters is not None else 100
        act_duration = int(activity.duration_minutes) if activity.duration_minutes is not None else 180

        dist = haversine(act_lat, act_lon, lat, lon)
        is_gps_invalid = dist > act_radius

        if is_gps_invalid:
            FraudDetection.objects.create(
                student=student,
                activity=activity,
                rule_code="RULE_2",
                severity="High",
                description=f"Check-out ngoài bán kính GPS cho phép: {dist:.1f}m (Giới hạn {act_radius}m)"
            )

        # Save check-out
        checkout_obj = ActivityCheckOut.objects.create(
            activity=activity,
            student=student,
            latitude=lat,
            longitude=lon,
            selfie_file_id=selfie_id,
            device_id=device_id,
            ip_address=ip_addr
        )

        # Calculate duration
        checkin_obj = ActivityCheckIn.objects.filter(activity=activity, student=student).order_by('-check_in_time').first()
        duration_mins = 0
        completion_pct = 0.0
        is_completed = False

        if checkin_obj:
            delta = checkout_obj.check_out_time - checkin_obj.check_in_time
            duration_mins = int(delta.total_seconds() / 60)
            if act_duration > 0:
                completion_pct = (duration_mins / act_duration) * 100
                is_completed = completion_pct >= 70.0

        # Update Attendance
        attendance, _ = ActivityAttendance.objects.get_or_create(activity=activity, student=student)
        attendance.duration_minutes = duration_mins
        attendance.completion_percent = completion_pct
        attendance.is_completed = is_completed
        attendance.save()

        # Update Participant status to 'attended' if completed
        if is_completed:
            participant = ActivityParticipant.objects.filter(activity=activity, student=student).first()
            if participant:
                participant.status = 'attended'
                participant.save()

        return Response({
            'message': 'Check-out thành công',
            'gps_valid': not is_gps_invalid,
            'distance_meters': dist,
            'duration_minutes': duration_mins,
            'completion_percent': completion_pct,
            'is_completed': is_completed,
            'check_out': ActivityCheckOutSerializer(checkout_obj).data
        })


import string
import random

def generate_random_password(length=8):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] # Restrict to admin in production

    def create(self, request, *args, **kwargs):
        full_name = request.data.get('fullName') or request.data.get('full_name', '')
        email = request.data.get('email', '')
        student_id = request.data.get('studentId') or request.data.get('student_id', '')
        role = request.data.get('role', 'student')
        
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-generate student_id if not provided
        if not student_id:
            ROLE_PREFIX_MAP = {
                'admin': 'AD',
                'advisor': 'GV',
                'student': 'SV',
                'class_monitor': 'SV',
                'organizer': 'BTC',
                'student_affairs': 'CTSV',
                'academic_affairs': 'DT',
            }
            prefix = ROLE_PREFIX_MAP.get(role, 'US')
            existing_ids = User.objects.filter(student_id__startswith=prefix).values_list('student_id', flat=True)
            max_num = 0
            for sid in existing_ids:
                if sid and sid.startswith(prefix):
                    num_part = sid[len(prefix):]
                    if num_part.isdigit():
                        max_num = max(max_num, int(num_part))
            next_num = max_num + 1
            student_id = f"{prefix}{str(next_num).zfill(4)}"
            
        username = student_id.lower()
        if User.objects.filter(username=username).exists() or User.objects.filter(student_id=student_id).exists():
            return Response({'error': f'Account with ID {student_id} already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        random_password = generate_random_password()
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=random_password,
            role=role,
            full_name=full_name,
            student_id=student_id,
            is_first_login=True,
            plain_password=random_password
        )
        
        # If student role, create a student profile
        if role in ['student', 'class_monitor']:
            Student.objects.create(
                user=user,
                student_id=student_id,
                full_name=full_name,
                email=email,
                faculty='Công nghệ Thông tin',
                cohort='K20'
            )
            
        serializer = self.get_serializer(user)
        return Response({
            'user': serializer.data,
            'password': random_password
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        random_password = generate_random_password()
        user.set_password(random_password)
        user.is_first_login = True
        user.plain_password = random_password
        user.save()
        return Response({
            'message': 'Password reset successfully',
            'password': random_password
        })

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({
            'message': f"Account has been {'opened' if user.is_active else 'closed'} successfully",
            'is_active': user.is_active
        })

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.AllowAny]

class UserOrganizationViewSet(viewsets.ModelViewSet):
    queryset = UserOrganization.objects.all()
    serializer_class = UserOrganizationSerializer
    permission_classes = [permissions.AllowAny]

class ClassPositionViewSet(viewsets.ModelViewSet):
    queryset = ClassPosition.objects.all()
    serializer_class = ClassPositionSerializer
    permission_classes = [permissions.AllowAny]

class StudentClassPositionViewSet(viewsets.ModelViewSet):
    queryset = StudentClassPosition.objects.all()
    serializer_class = StudentClassPositionSerializer
    permission_classes = [permissions.AllowAny]

class FraudDetectionViewSet(viewsets.ModelViewSet):
    queryset = FraudDetection.objects.all()
    serializer_class = FraudDetectionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = FraudDetection.objects.all()
        # support filters by rule_code, severity, student_id, activity_id
        rule_code = self.request.query_params.get('ruleCode') or self.request.query_params.get('rule_code')
        severity = self.request.query_params.get('severity')
        student = self.request.query_params.get('studentId') or self.request.query_params.get('student_id')
        activity = self.request.query_params.get('activityId') or self.request.query_params.get('activity_id')
        
        if rule_code:
            queryset = queryset.filter(rule_code=rule_code)
        if severity:
            queryset = queryset.filter(severity=severity)
        if student:
            queryset = queryset.filter(student__student_id=student)
        if activity:
            queryset = queryset.filter(activity_id=activity)
            
        return queryset

    @action(detail=True, methods=['post'], url_path='request-resubmit')
    def request_resubmit(self, request, pk=None):
        fraud = self.get_object()
        if fraud.rule_code != 'RULE_4':
            return Response({'error': 'Chỉ có thể yêu cầu gửi lại đối với vi phạm thiếu ảnh selfie'}, status=status.HTTP_400_BAD_REQUEST)
        
        if "Đã yêu cầu gửi lại" not in fraud.description:
            fraud.description += " (Đã yêu cầu gửi lại minh chứng)"
            fraud.save()
            
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action="Yêu cầu bổ sung ảnh selfie",
            entity_name="FraudDetection",
            entity_id=fraud.id,
            before_value="Thiếu ảnh selfie",
            after_value="Đang chờ sinh viên gửi lại",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({'message': 'Đã gửi yêu cầu bổ sung ảnh selfie thành công', 'description': fraud.description})

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.AllowAny]

class ChangeRequestViewSet(viewsets.ModelViewSet):
    queryset = ChangeRequest.objects.all()
    serializer_class = ChangeRequestSerializer
    permission_classes = [permissions.AllowAny]


class ExternalActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalActivitySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        queryset = ExternalActivity.objects.all().prefetch_related('evidence_files', 'fraud_flags', 'reviews')
        
        # Filtering by Student
        if user.is_authenticated and user.role == 'student':
            if hasattr(user, 'student_profile'):
                queryset = queryset.filter(student=user.student_profile)
            else:
                queryset = queryset.none()
        
        # Filtering by Advisor
        elif user.is_authenticated and user.role == 'advisor':
            queryset = queryset.filter(student__class_info__advisor=user)

        # Query parameter filters
        student_id = self.request.query_params.get('studentId')
        if student_id:
            queryset = queryset.filter(student__student_id=student_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'student_profile'):
            serializer.save(student=user.student_profile)
        else:
            # For testing/mocking when user might not have a student profile
            first_student = Student.objects.first()
            serializer.save(student=first_student)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_activity(self, request, pk=None):
        activity = self.get_object()
        if activity.status not in ['draft', 'need_more_info']:
            return Response({'error': 'Hoạt động phải ở trạng thái Draft hoặc Cần bổ sung mới được nộp.'}, status=status.HTTP_400_BAD_REQUEST)

        # Clear existing fraud flags for this activity
        activity.fraud_flags.all().delete()

        # Run Anti-fraud Rules Check
        evidence_files = activity.evidence_files.all()
        student = activity.student

        # Rule 1, 2, 3: Evidence File Hash Checks
        for ev in evidence_files:
            # Rule 1: Duplicate hash (any match in system)
            dup_any = EvidenceFile.objects.filter(file_hash=ev.file_hash).exclude(activity=activity)
            if dup_any.exists():
                FraudFlag.objects.create(
                    activity=activity,
                    rule_code='RULE_1',
                    severity='High',
                    description=f"Minh chứng '{ev.file_name}' trùng hash SHA256 với minh chứng khác trong hệ thống."
                )

                # Rule 2: One evidence used by multiple students
                dup_other_student = dup_any.exclude(activity__student=student)
                if dup_other_student.exists():
                    other_sv_ids = list(dup_other_student.values_list('activity__student__student_id', flat=True))
                    other_sv_ids_str = ", ".join(other_sv_ids)
                    FraudFlag.objects.create(
                        activity=activity,
                        rule_code='RULE_2',
                        severity='Critical',
                        description=f"Minh chứng '{ev.file_name}' được sử dụng bởi sinh viên khác (Mã SV: {other_sv_ids_str})."
                    )

                # Rule 3: Reused evidence (same student, different activities)
                dup_same_student = dup_any.filter(activity__student=student)
                if dup_same_student.exists():
                    other_act_names = list(dup_same_student.values_list('activity__activity_name', flat=True))
                    other_act_names_str = ", ".join(other_act_names)
                    FraudFlag.objects.create(
                        activity=activity,
                        rule_code='RULE_3',
                        severity='High',
                        description=f"Minh chứng '{ev.file_name}' bị nộp lại nhiều lần cho các hoạt động khác của bạn (Hoạt động: {other_act_names_str})."
                    )

        # Rule 4: Activity outside semester range
        # Typical semester break is July (7) and August (8)
        if activity.start_date.month in [7, 8] or activity.end_date.month in [7, 8]:
            FraudFlag.objects.create(
                activity=activity,
                rule_code='RULE_4',
                severity='Medium',
                description=f"Thời gian hoạt động ({activity.start_date} - {activity.end_date}) diễn ra ngoài khoảng thời gian học kỳ chính."
            )

        # Rule 5: Proposed score exceeds rules (> 10 points)
        if activity.proposed_score > 10:
            FraudFlag.objects.create(
                activity=activity,
                rule_code='RULE_5',
                severity='High',
                description=f"Số điểm đề xuất ({activity.proposed_score} điểm) vượt quá mức quy định cho hoạt động ngoài trường (tối đa 10 điểm)."
            )

        # Rule 6: Gained points for same activity name before
        gained_before = ExternalActivity.objects.filter(
            student=student,
            activity_name__iexact=activity.activity_name,
            status='approved'
        ).exclude(id=activity.id)
        if gained_before.exists():
            FraudFlag.objects.create(
                activity=activity,
                rule_code='RULE_6',
                severity='Critical',
                description=f"Sinh viên đã được cộng điểm cho hoạt động có cùng tên '{activity.activity_name}' trước đó."
            )

        # Rule 7: Organizer name in suspicious watchlist
        suspicious_keywords = ["tự phát", "không rõ", "cá nhân", "nhóm sinh viên", "nhóm tự phát", "scam", "chưa xác minh", "unknown"]
        org_name_lower = activity.organizer_name.lower()
        if any(kw in org_name_lower for kw in suspicious_keywords):
            FraudFlag.objects.create(
                activity=activity,
                rule_code='RULE_7',
                severity='Medium',
                description=f"Đơn vị tổ chức '{activity.organizer_name}' nằm trong danh sách cần xác minh hoặc có tên không rõ ràng."
            )

        # Update status
        activity.status = 'submitted'
        activity.save()

        # Audit logging
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action="Nộp hồ sơ hoạt động ngoài trường",
            entity_name="ExternalActivity",
            entity_id=activity.id,
            before_value="draft",
            after_value="submitted",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(ExternalActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='review-advisor')
    def review_advisor(self, request, pk=None):
        activity = self.get_object()
        reviewer = request.user if request.user.is_authenticated else None
        
        status_input = request.data.get('status') # 'advisor_approved', 'need_more_info', 'rejected_by_advisor'
        comment = request.data.get('comment', '')

        if status_input not in ['advisor_approved', 'need_more_info', 'rejected_by_advisor']:
            return Response({'error': 'Trạng thái xét duyệt của Cố vấn không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = activity.status
        activity.status = status_input
        activity.save()

        # Create review entry
        EvidenceReview.objects.create(
            activity=activity,
            reviewer=reviewer,
            review_level='advisor',
            status=status_input,
            comment=comment
        )

        # Audit logging
        AuditLog.objects.create(
            user=reviewer,
            action="Cố vấn học tập xét duyệt hoạt động",
            entity_name="ExternalActivity",
            entity_id=activity.id,
            before_value=old_status,
            after_value=status_input,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(ExternalActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='review-ctsv')
    def review_ctsv(self, request, pk=None):
        activity = self.get_object()
        reviewer = request.user if request.user.is_authenticated else None
        
        status_input = request.data.get('status') # 'approved', 'rejected'
        comment = request.data.get('comment', '')

        if status_input not in ['approved', 'rejected']:
            return Response({'error': 'Trạng thái xét duyệt của CTSV không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = activity.status
        activity.status = status_input
        activity.save()

        # Create review entry
        EvidenceReview.objects.create(
            activity=activity,
            reviewer=reviewer,
            review_level='ctsv',
            status=status_input,
            comment=comment
        )

        # Audit logging
        AuditLog.objects.create(
            user=reviewer,
            action="Phòng CTSV phê duyệt cuối hoạt động ngoài trường",
            entity_name="ExternalActivity",
            entity_id=activity.id,
            before_value=old_status,
            after_value=status_input,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(ExternalActivitySerializer(activity).data)

    @action(detail=False, methods=['post'], url_path='random-audit')
    def random_audit(self, request):
        # CTSV requests random audit of approved activities (usually 5% to 10%)
        import random
        percent = int(request.data.get('percent', 10))
        if percent < 5 or percent > 15:
            percent = 10 # Default to 10%

        approved_activities = list(ExternalActivity.objects.filter(status='approved'))
        total_count = len(approved_activities)
        if total_count == 0:
            return Response({'message': 'Không có hồ sơ đã duyệt nào để hậu kiểm.', 'audited_ids': []})

        audit_count = max(1, int(total_count * (percent / 100.0)))
        audited_samples = random.sample(approved_activities, audit_count)

        audited_ids = []
        for act in audited_samples:
            audited_ids.append(act.id)
            # Log the post-audit action
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action="Hậu kiểm ngẫu nhiên hồ sơ hoạt động ngoài trường",
                entity_name="ExternalActivity",
                entity_id=act.id,
                before_value="approved",
                after_value="approved_audited",
                ip_address=request.META.get('REMOTE_ADDR')
            )

        return Response({
            'message': f'Đã chọn ngẫu nhiên {audit_count} hồ sơ ({percent}%) trên tổng số {total_count} hồ sơ đã duyệt để tiến hành hậu kiểm.',
            'audited_activities': ExternalActivitySerializer(audited_samples, many=True).data
        })


class EvidenceFileViewSet(viewsets.ModelViewSet):
    queryset = EvidenceFile.objects.all()
    serializer_class = EvidenceFileSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Calculate SHA256 file hash if not provided
        import hashlib
        file_obj = self.request.FILES.get('file')
        file_hash = self.request.data.get('file_hash')

        if file_obj and not file_hash:
            sha256 = hashlib.sha256()
            for chunk in file_obj.chunks():
                sha256.update(chunk)
            file_hash = sha256.hexdigest()
            serializer.save(file_hash=file_hash, file_size=file_obj.size)
        else:
            serializer.save()


class EvidenceReviewViewSet(viewsets.ModelViewSet):
    queryset = EvidenceReview.objects.all()
    serializer_class = EvidenceReviewSerializer
    permission_classes = [permissions.AllowAny]


class FraudFlagViewSet(viewsets.ModelViewSet):
    queryset = FraudFlag.objects.all()
    serializer_class = FraudFlagSerializer
    permission_classes = [permissions.AllowAny]





