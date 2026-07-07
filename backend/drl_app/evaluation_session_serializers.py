from rest_framework import serializers

from .models import EvaluationSession


class EvaluationSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True, allow_null=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True, allow_null=True)
    evaluation_status = serializers.CharField(source='evaluation.status', read_only=True, allow_null=True)
    evaluation_total_score = serializers.IntegerField(source='evaluation.total_score', read_only=True, allow_null=True)

    class Meta:
        model = EvaluationSession
        fields = (
            'id',
            'evaluation',
            'student',
            'student_name',
            'student_id',
            'semester',
            'year',
            'status',
            'started_at',
            'last_active',
            'device_info',
            'ip_address',
            'created_at',
            'updated_at',
            'evaluation_status',
            'evaluation_total_score',
        )
        read_only_fields = (
            'started_at',
            'last_active',
            'created_at',
            'updated_at',
            'evaluation_status',
            'evaluation_total_score',
        )
