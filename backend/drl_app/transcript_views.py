from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AuditLog, ClassInfo, TranscriptImport, TranscriptImportItem
from .services.transcript_statistics import build_summary
from .services.transcript_validator import validate_transcript_upload
from .transcript_serializers import TranscriptImportDetailSerializer, TranscriptImportListSerializer


class AcademicAffairsOrAdminPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ("admin", "academic_affairs")


class TranscriptImportViewSet(viewsets.ModelViewSet):
    permission_classes = [AcademicAffairsOrAdminPermission]

    def get_queryset(self):
        return (
            TranscriptImport.objects.all()
            .select_related("uploaded_by", "class_info")
            .prefetch_related("items", "items__student")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TranscriptImportDetailSerializer
        return TranscriptImportListSerializer

    def create(self, request, *args, **kwargs):
        return Response(
            {"error": "Use /validate/ to create a transcript validation session and /import/ to confirm it."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=False, methods=["post"], url_path="validate")
    def validate_pdf(self, request):
        uploaded_file = request.FILES.get("file")
        class_id = request.data.get("class_id") or request.data.get("classId")
        school_year = (request.data.get("school_year") or request.data.get("schoolYear") or "").strip()
        semester = (request.data.get("semester") or "").strip() or None

        if not uploaded_file:
            return Response({"error": "File PDF is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded_file.name.lower().endswith(".pdf"):
            return Response({"error": "Only PDF files are supported."}, status=status.HTTP_400_BAD_REQUEST)
        if not class_id:
            return Response({"error": "class_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not school_year:
            return Response({"error": "school_year is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not semester:
            return Response({"error": "semester is required."}, status=status.HTTP_400_BAD_REQUEST)

        selected_class = ClassInfo.objects.filter(id=class_id).first()
        if not selected_class:
            return Response({"error": "Selected class was not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            import_record, result = validate_transcript_upload(
                uploaded_file=uploaded_file,
                class_info=selected_class,
                school_year=school_year,
                semester=semester,
                uploaded_by=request.user if request.user.is_authenticated else None,
            )
        except ValueError as exc:
            if request.user and request.user.is_authenticated:
                try:
                    AuditLog.objects.create(
                        user=request.user,
                        action="Validate Transcript",
                        entity_name="TranscriptImport",
                        entity_id=None,
                        before_value="parse_pdf",
                        after_value="failed",
                    )
                except Exception:
                    pass
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        students = [
            {
                "student_db_id": item.get("student_db_id"),
                "student_id": item.get("student_id") or "",
                "student_code": item.get("student_code"),
                "full_name": item.get("full_name") or "",
                "gpa": float(item.get("gpa") or 0),
                "classification": item.get("classification") or "",
                "match_status": item.get("match_status") or "NOT_FOUND",
                "remark": item.get("remark") or "",
            }
            for item in result["students"]
        ]

        return Response(
            {
                "valid": result["valid"],
                "class_match": result["class_match"],
                "selected_class": result["selected_class"],
                "selected_class_id": result["selected_class_id"],
                "pdf_class": result["pdf_class"],
                "validation_session": import_record.id,
                "status": import_record.status,
                "students": students,
                "summary": result["summary"],
                "summary_percent": result["summary_percent"],
                "total_students": result["total_students"],
                "original_filename": result["original_filename"],
            }
        )

    @action(detail=False, methods=["post"], url_path="import")
    def import_pdf(self, request):
        validation_session = request.data.get("validation_session") or request.data.get("validationSession")
        if not validation_session:
            return Response({"error": "validation_session is required."}, status=status.HTTP_400_BAD_REQUEST)

        import_record = self.get_queryset().filter(id=validation_session).first()
        if not import_record:
            return Response({"error": "Validation session was not found."}, status=status.HTTP_404_NOT_FOUND)
        if import_record.status == "IMPORTED":
            return Response({"error": "This validation session has already been imported."}, status=status.HTTP_400_BAD_REQUEST)
        if not import_record.class_info:
            return Response({"error": "Selected class is missing for this validation session."}, status=status.HTTP_400_BAD_REQUEST)
        if import_record.pdf_class_name and import_record.class_info.name.strip().upper() != import_record.pdf_class_name.strip().upper():
            import_record.status = "FAILED"
            import_record.save(update_fields=["status"])
            return Response(
                {"error": f"PDF thuoc lop {import_record.pdf_class_name} nhung ban dang import vao lop {import_record.class_info.name}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preview_data = import_record.preview_data or []
        if not preview_data:
            import_record.status = "FAILED"
            import_record.save(update_fields=["status"])
            return Response({"error": "Validation data is empty."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                items = []
                for row in preview_data:
                    transcript_item = TranscriptImportItem.objects.create(
                        transcript_import=import_record,
                        student_id=row.get("student_db_id") or None,
                        student_code=row.get("student_code") or "",
                        full_name=row.get("full_name") or "",
                        gpa=row.get("gpa") or 0,
                        classification=row.get("classification") or "Yeu",
                        status=row.get("match_status") or "NOT_FOUND",
                        match_status=row.get("match_status") or "NOT_FOUND",
                        remark=row.get("remark") or "",
                    )
                    items.append(
                        {
                            "id": transcript_item.id,
                            "student": transcript_item.student.id if transcript_item.student else None,
                            "student_code": transcript_item.student_code,
                            "full_name": transcript_item.full_name,
                            "gpa": float(transcript_item.gpa),
                            "classification": transcript_item.classification,
                            "match_status": transcript_item.match_status,
                            "remark": transcript_item.remark,
                        }
                    )

                summary_counts, summary_percent, total = build_summary(items)
                import_record.total_students = total
                import_record.summary_data = {
                    "counts": summary_counts,
                    "percentages": summary_percent,
                    "valid": True,
                    "class_match": True,
                }
                import_record.status = "IMPORTED"
                import_record.save(update_fields=["total_students", "summary_data", "status"])

                if request.user and request.user.is_authenticated:
                    AuditLog.objects.create(
                        user=request.user,
                        action="Import Transcript",
                        entity_name="TranscriptImport",
                        entity_id=import_record.id,
                        before_value="validated",
                        after_value="imported",
                    )

                return Response(
                    {
                        "import_id": import_record.id,
                        "class_name": import_record.class_name,
                        "semester": import_record.semester,
                        "school_year": import_record.school_year,
                        "source_file_name": import_record.original_filename,
                        "total_students": total,
                        "students": items,
                        "summary": summary_counts,
                        "summary_percent": summary_percent,
                        "status": import_record.status,
                    }
                )
        except Exception as exc:
            import_record.status = "FAILED"
            import_record.save(update_fields=["status"])
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
