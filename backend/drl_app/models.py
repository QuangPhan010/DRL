from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_first_login', False)
        return super().create_superuser(username, email, password, **extra_fields)

    def create_user(self, username, email=None, password=None, **extra_fields):
        # Allow default behavior for regular users
        return super().create_user(username, email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('advisor', 'Cố vấn học tập'),
        ('student', 'Sinh viên'),
        ('organizer', 'Ban tổ chức'),
        ('class_monitor', 'Ban cán sự lớp'),
        ('student_affairs', 'Phòng CTSV'),
        ('academic_affairs', 'Phòng Đào tạo'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    full_name = models.CharField(max_length=150, blank=True)
    student_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    is_first_login = models.BooleanField(default=True)
    plain_password = models.CharField(max_length=128, blank=True, null=True)

    objects = CustomUserManager()

    @property
    def roles(self):
        roles_list = [self.role]
        
        # Auto-grant class_monitor role if student is Lớp trưởng or Lớp phó
        if hasattr(self, 'student_profile') and self.student_profile:
            has_monitor_pos = StudentClassPosition.objects.filter(
                student=self.student_profile,
                position__name__in=['Lớp trưởng', 'Lớp phó']
            ).exists()
            if has_monitor_pos and 'class_monitor' not in roles_list:
                roles_list.append('class_monitor')
                if 'student' not in roles_list:
                    roles_list.append('student')

        if self.role == 'class_monitor' and 'student' not in roles_list:
            roles_list.append('student')
        if self.user_organizations.exists() and 'organizer' not in roles_list:
            roles_list.append('organizer')
        return roles_list

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.full_name or self.username} ({self.get_role_display()})"

class Organization(models.Model):
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=100) # e.g. CLB, Khoa, CTSV

    class Meta:
        db_table = 'organization'

    def __str__(self):
        return self.name

class UserOrganization(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_organizations')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    position = models.CharField(max_length=100) # e.g. Chủ nhiệm, Phó chủ nhiệm, Phụ trách

    class Meta:
        db_table = 'user_organization'
        unique_together = ('user', 'organization')

    def __str__(self):
        return f"{self.user.full_name or self.user.username} - {self.organization.name} ({self.position})"


class ClassInfo(models.Model):
    name = models.CharField(max_length=100, unique=True)
    faculty = models.CharField(max_length=100)
    cohort = models.CharField(max_length=50)
    advisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_classes', limit_choices_to={'role': 'advisor'})

    class Meta:
        db_table = 'class_info'

    def __str__(self):
        return self.name

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='student_profile')
    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    class_info = models.ForeignKey(ClassInfo, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    faculty = models.CharField(max_length=100)
    cohort = models.CharField(max_length=50)
    gender = models.CharField(max_length=10, choices=(('Nam', 'Nam'), ('Nữ', 'Nữ')), default='Nam')
    phone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'student'

    def __str__(self):
        return f"{self.full_name} ({self.student_id})"

class ClassPosition(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'class_position'

    def __str__(self):
        return self.name

class StudentClassPosition(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='positions')
    class_info = models.ForeignKey(ClassInfo, on_delete=models.CASCADE, related_name='student_positions')
    position = models.ForeignKey(ClassPosition, on_delete=models.CASCADE, related_name='student_assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_positions')
    assigned_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_class_position'
        unique_together = ('student', 'class_info', 'position')

    def __str__(self):
        return f"{self.student.full_name} - {self.class_info.name}: {self.position.name}"


class Criterion(models.Model):
    code = models.CharField(max_length=10, unique=True) # e.g. I, II, III
    name = models.CharField(max_length=255)
    max_score = models.IntegerField()
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'criterion'

    def __str__(self):
        return f"{self.code}. {self.name}"

class GroupCriterion(models.Model):
    criterion = models.ForeignKey(Criterion, on_delete=models.CASCADE, related_name='groups')
    name = models.CharField(max_length=255)

    class Meta:
        db_table = 'group_criterion'

    def __str__(self):
        return self.name

class SubItem(models.Model):
    group = models.ForeignKey(GroupCriterion, on_delete=models.CASCADE, related_name='sub_items')
    name = models.TextField()
    max_score = models.IntegerField() # can be negative for penalty

    class Meta:
        db_table = 'sub_item'

    def __str__(self):
        return self.name[:50]

class Evaluation(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Nháp'),
        ('class_pending', 'Chờ cán sự rà soát'),
        ('advisor_pending', 'Chờ cố vấn duyệt'),
        ('pending', 'Chờ duyệt cấp trường'),
        ('approved', 'Đã duyệt hoàn tất'),
        ('rejected', 'Bị từ chối'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='evaluations')
    semester = models.CharField(max_length=20) # e.g. HK1, HK2
    year = models.CharField(max_length=20) # e.g. 2024-2025
    note = models.TextField(blank=True, null=True)
    total_score = models.IntegerField(default=0)
    classification = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_evaluations')
    review_note = models.TextField(blank=True, null=True)
    class_confirmed = models.BooleanField(default=False)

    class Meta:
        db_table = 'evaluation'
        unique_together = ('student', 'semester', 'year')

    def __str__(self):
        return f"DRL {self.student.student_id} - {self.semester} {self.year}"

class EvaluationDetail(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='details')
    sub_item = models.ForeignKey(SubItem, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)

    class Meta:
        db_table = 'evaluation_detail'
        unique_together = ('evaluation', 'sub_item')

class Activity(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    points = models.IntegerField()
    criterion = models.ForeignKey(Criterion, on_delete=models.CASCADE, related_name='activities')
    date = models.DateField()
    organizer = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=(('upcoming', 'Upcoming'), ('completed', 'Completed')), default='upcoming')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=10.850100)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=106.771200)
    radius_meters = models.IntegerField(default=100)
    duration_minutes = models.IntegerField(default=180)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    class Meta:
        db_table = 'activity'

    def __str__(self):
        return self.title

class ActivityParticipant(models.Model):
    STATUS_CHOICES = (
        ('registered', 'Đã đăng ký'),
        ('attended', 'Đã tham gia'),
        ('evidence_submitted', 'Đã nộp minh chứng'),
    )
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='participants')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='activity_participations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')
    evidence_url = models.URLField(blank=True, null=True)

    class Meta:
        db_table = 'activity_participant'
        unique_together = ('activity', 'student')

class ActivityCheckIn(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='checkins')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='checkins')
    check_in_time = models.DateTimeField(auto_now_add=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    selfie_file_id = models.CharField(max_length=255, blank=True, null=True)
    device_id = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()

    class Meta:
        db_table = 'activity_check_in'

class ActivityCheckOut(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='checkouts')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='checkouts')
    check_out_time = models.DateTimeField(auto_now_add=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    selfie_file_id = models.CharField(max_length=255, blank=True, null=True)
    device_id = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()

    class Meta:
        db_table = 'activity_check_out'

class ActivityAttendance(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='attendance_records')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    duration_minutes = models.IntegerField(default=0)
    completion_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'activity_attendance'
        unique_together = ('activity', 'student')

class FraudDetection(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='frauds', null=True, blank=True)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='frauds', null=True, blank=True)
    rule_code = models.CharField(max_length=50) # e.g. RULE_1, RULE_5
    severity = models.CharField(max_length=20) # High, Medium, Critical
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fraud_detection'

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=255)
    entity_name = models.CharField(max_length=100)
    entity_id = models.IntegerField(null=True, blank=True)
    before_value = models.TextField(blank=True, null=True)
    after_value = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    device_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_log'

class ChangeRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Chờ duyệt'),
        ('approved', 'Đã duyệt'),
        ('rejected', 'Từ chối'),
    )
    request_type = models.CharField(max_length=100)
    reason = models.TextField()
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_changes')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_changes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'change_request'

