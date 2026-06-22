from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import User, ClassInfo, Student, Criterion, Evaluation, EvaluationDetail, Activity, ActivityParticipant
from .serializers import (
    UserSerializer, ClassInfoSerializer, StudentSerializer, CriterionSerializer, 
    EvaluationSerializer, ActivitySerializer, ActivityParticipantSerializer
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
        
        # Demote previous monitor of this same class
        class_students = Student.objects.filter(class_info=class_info)
        User.objects.filter(student_id__in=class_students.values_list('student_id', flat=True), role='class_monitor').update(role='student')
        
        # Promote new student user
        User.objects.filter(student_id=student_id).update(role='class_monitor')
        
        return Response({'message': f'Student {student_id} is now the class monitor'})

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
class CriterionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Criterion.objects.all()
    serializer_class = CriterionSerializer
    permission_classes = [permissions.AllowAny]

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
        return Response(ActivitySerializer(activity).data)

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

