from .transcript_statistics import classify_gpa
from ..models import Student


def match_student(student_code: str):
    return Student.objects.filter(student_id=student_code).first()


def build_transcript_item(student_code: str, full_name: str, gpa):
    student = match_student(student_code)
    classification = classify_gpa(gpa)
    return {
        "student": student,
        "student_code": student_code,
        "full_name": student.full_name if student else (full_name or ""),
        "gpa": gpa,
        "classification": classification,
        "status": "MATCHED" if student else "NOT_FOUND",
    }

