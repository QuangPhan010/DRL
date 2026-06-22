from django.contrib.auth.models import AbstractUser
from django.db import models

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

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.full_name or self.username} ({self.get_role_display()})"

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
