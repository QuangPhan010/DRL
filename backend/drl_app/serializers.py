from rest_framework import serializers
from .models import User, ClassInfo, Student, Criterion, GroupCriterion, SubItem, Evaluation, EvaluationDetail, Activity, ActivityParticipant, Organization, UserOrganization, ClassPosition, StudentClassPosition, ActivityCheckIn, ActivityCheckOut, ActivityAttendance, FraudDetection, AuditLog, ChangeRequest

class ClassPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassPosition
        fields = ('id', 'name')

class StudentClassPositionSerializer(serializers.ModelSerializer):
    position_name = serializers.CharField(source='position.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)

    class Meta:
        model = StudentClassPosition
        fields = ('id', 'class_info', 'position', 'position_name', 'assigned_by', 'assigned_by_name', 'assigned_date')

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('id', 'name', 'type')

class UserOrganizationSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_type = serializers.CharField(source='organization.type', read_only=True)
    
    class Meta:
        model = UserOrganization
        fields = ('id', 'organization', 'organization_name', 'organization_type', 'position')

class UserSerializer(serializers.ModelSerializer):
    roles = serializers.ReadOnlyField()
    organizations = UserOrganizationSerializer(source='user_organizations', many=True, read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name', 'role', 'roles', 'student_id', 'plain_password', 'organizations')


class ClassInfoSerializer(serializers.ModelSerializer):
    advisor_name = serializers.CharField(source='advisor.full_name', read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassInfo
        fields = ('id', 'name', 'faculty', 'cohort', 'advisor', 'advisor_name', 'student_count')

    def get_student_count(self, obj):
        return obj.students.count()

class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_info.name', read_only=True)
    password = serializers.CharField(source='user.plain_password', read_only=True, default='')
    positions = StudentClassPositionSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = ('id', 'student_id', 'full_name', 'email', 'class_info', 'class_name', 'faculty', 'cohort', 'gender', 'phone', 'password', 'positions')

class SubItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubItem
        fields = ('id', 'name', 'max_score')

class GroupCriterionSerializer(serializers.ModelSerializer):
    subItems = SubItemSerializer(source='sub_items', many=True, read_only=True)

    class Meta:
        model = GroupCriterion
        fields = ('id', 'name', 'subItems')

class CriterionSerializer(serializers.ModelSerializer):
    groups = GroupCriterionSerializer(many=True, read_only=True)

    class Meta:
        model = Criterion
        fields = ('id', 'code', 'name', 'max_score', 'description', 'groups')

class EvaluationDetailSerializer(serializers.ModelSerializer):
    sub_item_id = serializers.IntegerField(source='sub_item.id')
    sub_item_name = serializers.CharField(source='sub_item.name', read_only=True)

    class Meta:
        model = EvaluationDetail
        fields = ('id', 'sub_item_id', 'sub_item_name', 'score')

class EvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    class_name = serializers.CharField(source='student.class_info.name', read_only=True)
    details = EvaluationDetailSerializer(many=True, read_only=True)
    scores = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = (
            'id', 'student', 'student_name', 'class_name', 'student_id',
            'semester', 'year', 'note', 'total_score', 'classification',
            'status', 'submitted_at', 'reviewed_by', 'review_note',
            'class_confirmed', 'details', 'scores'
        )

    def get_scores(self, obj):
        # Return key-value pairs of criterion_id: score
        # For our frontend, scores is structured as a mapping of criterion_id -> parent score
        scores = {}
        for detail in obj.details.all():
            # Get the top-level parent criterion for the sub_item
            criterion = detail.sub_item.group.criterion
            scores[str(criterion.id)] = scores.get(str(criterion.id), 0) + detail.score
        
        # Clamp scores within max_score for each criterion
        for crit_id, val in scores.items():
            try:
                c = Criterion.objects.get(id=int(crit_id))
                scores[crit_id] = max(0, min(c.max_score, val))
            except Criterion.DoesNotExist:
                pass
        return scores

class ActivityParticipantSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    class_name = serializers.CharField(source='student.class_info.name', read_only=True)

    class Meta:
        model = ActivityParticipant
        fields = ('id', 'student', 'student_id', 'student_name', 'class_name', 'status', 'evidence_url')

class ActivitySerializer(serializers.ModelSerializer):
    participants = ActivityParticipantSerializer(many=True, read_only=True)
    check_in_time = serializers.SerializerMethodField()
    selfie_resubmit_requested = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ('id', 'title', 'description', 'points', 'criterion', 'date', 'organizer', 'status', 'participants', 'latitude', 'longitude', 'radius_meters', 'duration_minutes', 'check_in_time', 'selfie_resubmit_requested', 'start_time', 'end_time')

    def get_check_in_time(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if hasattr(request.user, 'student_profile') and request.user.student_profile:
                checkin = obj.checkins.filter(student=request.user.student_profile).order_by('-check_in_time').first()
                if checkin:
                    return checkin.check_in_time.isoformat()
        return None

    def get_selfie_resubmit_requested(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if hasattr(request.user, 'student_profile') and request.user.student_profile:
                student = request.user.student_profile
                fraud = obj.frauds.filter(student=student, rule_code='RULE_4').first()
                if fraud and "Đã yêu cầu gửi lại" in fraud.description:
                    return True
        return False

class ActivityCheckInSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = ActivityCheckIn
        fields = '__all__'

class ActivityCheckOutSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)

    class Meta:
        model = ActivityCheckOut
        fields = '__all__'

class ActivityAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id_str = serializers.CharField(source='student.student_id', read_only=True)
    class_name = serializers.CharField(source='student.class_info.name', read_only=True)

    class Meta:
        model = ActivityAttendance
        fields = '__all__'

class FraudDetectionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id_str = serializers.CharField(source='student.student_id', read_only=True)
    activity_title = serializers.CharField(source='activity.title', read_only=True)

    class Meta:
        model = FraudDetection
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'

class ChangeRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)

    class Meta:
        model = ChangeRequest
        fields = '__all__'

