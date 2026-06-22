from rest_framework import serializers
from .models import User, ClassInfo, Student, Criterion, GroupCriterion, SubItem, Evaluation, EvaluationDetail, Activity, ActivityParticipant

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name', 'role', 'student_id', 'plain_password')

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

    class Meta:
        model = Student
        fields = ('id', 'student_id', 'full_name', 'email', 'class_info', 'class_name', 'faculty', 'cohort', 'gender', 'phone', 'password')

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
    class_name = serializers.CharField(source='student.class_info.name', read_only=True)

    class Meta:
        model = ActivityParticipant
        fields = ('id', 'student', 'student_name', 'class_name', 'status', 'evidence_url')

class ActivitySerializer(serializers.ModelSerializer):
    participants = ActivityParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Activity
        fields = ('id', 'title', 'description', 'points', 'criterion', 'date', 'organizer', 'status', 'participants')
