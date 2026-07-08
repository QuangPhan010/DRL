from ...models import Evaluation

class EvaluationQueries:
    """
    Query execution for DRL (Evaluation) reports.
    Supports filtering by year, semester, faculty, and class.
    """
    def execute(self, parameters):
        school_year = parameters.get('school_year')
        semester = parameters.get('semester')
        faculty = parameters.get('faculty')
        class_name = parameters.get('class_name')

        queryset = Evaluation.objects.all()

        if school_year:
            queryset = queryset.filter(year=school_year)
        if semester:
            queryset = queryset.filter(semester=semester)
        if faculty:
            queryset = queryset.filter(student__faculty__iexact=faculty.strip())
        if class_name:
            queryset = queryset.filter(student__class_info__name__iexact=class_name.strip())

        queryset = queryset.select_related('student', 'student__class_info').order_by('student__student_id')

        results = []
        for eval_obj in queryset:
            results.append({
                'student_id': eval_obj.student.student_id if eval_obj.student else '',
                'full_name': eval_obj.student.full_name if eval_obj.student else '',
                'class_name': eval_obj.student.class_info.name if (eval_obj.student and eval_obj.student.class_info) else '',
                'faculty': eval_obj.student.faculty if eval_obj.student else '',
                'gpa': float(eval_obj.academic_gpa) if eval_obj.academic_gpa is not None else 0.0,
                'gpa_classification': eval_obj.academic_classification or 'Chưa xếp loại',
                'self_score': eval_obj.base_score,
                'total_score': eval_obj.total_score,
                'classification': eval_obj.classification or 'Chưa xếp loại',
                'status': eval_obj.get_status_display()
            })
        return results
