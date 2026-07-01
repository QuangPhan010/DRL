from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import TranscriptImport, TranscriptImportItem
from .services.transcript_matching import build_transcript_item
from .services.transcript_parser import parse_transcript_pdf
from .services.transcript_statistics import build_summary
from .transcript_serializers import (
    TranscriptImportDetailSerializer,
    TranscriptImportListSerializer,
)


class AcademicAffairsOrAdminPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'academic_affairs')


class TranscriptImportViewSet(viewsets.ModelViewSet):
    queryset = TranscriptImport.objects.all().select_related('uploaded_by').prefetch_related('items', 'items__student')
    permission_classes = [AcademicAffairsOrAdminPermission]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TranscriptImportDetailSerializer
        return TranscriptImportListSerializer

    def create(self, request, *args, **kwargs):
        return Response(
            {'error': 'Use /import/ to upload a transcript PDF.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=False, methods=['post'], url_path='import')
    def import_pdf(self, request):
        uploaded_file = request.FILES.get('file')
        semester = request.data.get('semester') or None

        if not uploaded_file:
            return Response({'error': 'File PDF is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                parsed = parse_transcript_pdf(uploaded_file)
                import_record = TranscriptImport.objects.create(
                    class_name=parsed.class_name,
                    semester=semester,
                    source_file_name=uploaded_file.name,
                    uploaded_by=request.user if request.user.is_authenticated else None,
                )

                response_items = []
                for row in parsed.rows:
                    item_data = build_transcript_item(row.student_code, row.full_name, row.gpa)
                    transcript_item = TranscriptImportItem.objects.create(
                        transcript_import=import_record,
                        student=item_data['student'],
                        student_code=item_data['student_code'],
                        full_name=item_data['full_name'],
                        gpa=item_data['gpa'],
                        classification=item_data['classification'],
                        status=item_data['status'],
                    )
                    response_items.append({
                        'id': transcript_item.id,
                        'student': transcript_item.student.id if transcript_item.student else None,
                        'student_code': transcript_item.student_code,
                        'full_name': transcript_item.full_name,
                        'gpa': float(transcript_item.gpa),
                        'classification': transcript_item.classification,
                        'status': transcript_item.status,
                    })

                summary_counts, summary_percent, total = build_summary(response_items)
                import_record.total_students = total
                import_record.summary_data = {
                    'counts': summary_counts,
                    'percentages': summary_percent,
                }
                import_record.save(update_fields=['total_students', 'summary_data'])

                return Response({
                    'import_id': import_record.id,
                    'class_name': import_record.class_name,
                    'semester': import_record.semester,
                    'source_file_name': import_record.source_file_name,
                    'total_students': total,
                    'students': response_items,
                    'summary': summary_counts,
                    'summary_percent': summary_percent,
                })
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

