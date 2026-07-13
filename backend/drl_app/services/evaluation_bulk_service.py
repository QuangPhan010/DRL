from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from ..models import SubItem, EvaluationDetail
from .evaluation_session_service import EvaluationSession

def save_evaluation_draft_bulk(*, evaluation, scores_data, note=None, user=None, client_version=None, request=None, recalculate_fn=None, rebalance_fn=None):
    """
    Perform a batch validation, collect dirty fields, and execute bulk DB operations
    for saving student evaluation draft scores/notes with Workflow Guard validation.
    """
    # 1. Workflow Guard validation
    from .workflow_guard import validate_evaluation_write_access
    validate_evaluation_write_access(
        evaluation=evaluation,
        user=user,
        client_version=client_version,
        request=request
    )

    # 2. Batch Validation - Active Evaluation Session
    session_exists = EvaluationSession.objects.filter(
        evaluation=evaluation, status='active'
    ).exists() or EvaluationSession.objects.filter(
        student=evaluation.student, semester=evaluation.semester, year=evaluation.year, status='active'
    ).exists()
    
    if not session_exists:
        raise ValidationError('Phiếu đánh giá không có phiên hoạt động hợp lệ.')

    # 3. Batch Validation - Criteria & Scores Limit
    manual_subitems = SubItem.objects.filter(
        group__criterion__criteria_set=evaluation.criteria_set,
        group__criterion__is_manual=True,
    )
    manual_subitem_dict = {sub.id: sub for sub in manual_subitems}

    # Validate all incoming scores first
    valid_scores_to_process = {}
    for sub_item_id, score_val in scores_data.items():
        try:
            sub_item_id_int = int(sub_item_id)
        except (ValueError, TypeError):
            raise ValidationError(f"Mã tiêu chí {sub_item_id} không hợp lệ.")

        if sub_item_id_int not in manual_subitem_dict:
            continue

        sub_item = manual_subitem_dict[sub_item_id_int]
        try:
            score = int(float(score_val or 0))
        except (ValueError, TypeError):
            raise ValidationError(f"Điểm số cho tiêu chí {sub_item.name[:20]}... không đúng định dạng số.")

        # Check score limit: max_score can be negative (penalty)
        if sub_item.max_score >= 0:
            if score < 0 or score > sub_item.max_score:
                raise ValidationError(f"Điểm số của '{sub_item.name[:30]}' phải từ 0 đến {sub_item.max_score}.")
        else:
            if score > 0 or score < sub_item.max_score:
                raise ValidationError(f"Điểm số của '{sub_item.name[:30]}' phải từ {sub_item.max_score} đến 0.")

        valid_scores_to_process[sub_item_id_int] = (sub_item, score)

    # 4. Atomic Transaction and Bulk Execution
    autosave_count = 0
    with transaction.atomic():
        has_changes = False
        if valid_scores_to_process:
            # Fetch existing details for these subitems
            existing_details = EvaluationDetail.objects.filter(
                evaluation=evaluation,
                sub_item_id__in=valid_scores_to_process.keys()
            )
            existing_details_dict = {det.sub_item_id: det for det in existing_details}

            bulk_creates = []
            bulk_updates = []

            for sub_item_id, (sub_item, score) in valid_scores_to_process.items():
                if sub_item_id in existing_details_dict:
                    detail = existing_details_dict[sub_item_id]
                    if detail.score != score:
                        detail.score = score
                        bulk_updates.append(detail)
                        autosave_count += 1
                        has_changes = True
                else:
                    detail = EvaluationDetail(
                        evaluation=evaluation,
                        sub_item=sub_item,
                        score=score
                    )
                    bulk_creates.append(detail)
                    autosave_count += 1
                    has_changes = True

            if bulk_creates:
                EvaluationDetail.objects.bulk_create(bulk_creates)
            if bulk_updates:
                EvaluationDetail.objects.bulk_update(bulk_updates, fields=['score'])

        # Save evaluation note if modified
        if note is not None and evaluation.note != note:
            evaluation.note = note
            evaluation.save(update_fields=['note'])
            autosave_count += 1
            has_changes = True

        # Increment version if there are database changes
        if has_changes:
            evaluation.version += 1
            evaluation.save(update_fields=['version'])

        # Recalculate score and rebalance student training score
        if recalculate_fn:
            recalculate_fn(evaluation)
        if rebalance_fn:
            rebalance_fn(evaluation.student)
        evaluation.refresh_from_db()

    return {
        'success': True,
        'saved_at': timezone.now().isoformat(),
        'autosave_count': autosave_count,
        'total_score': evaluation.total_score,
        'classification': evaluation.classification,
        'serverVersion': evaluation.version
    }


import threading
from django import db
from ..models import EvaluationJob, Evaluation, Student, CriteriaSet, SubItem, EvaluationDetail
from ..views import sync_evaluation_with_transcript, recalculate_evaluation_score, rebalance_training_score

def async_bulk_init_evaluations(job_id, payload_data):
    """
    Background worker to create/update evaluations for students in chunks.
    """
    db.close_old_connections()
    try:
        job = EvaluationJob.objects.get(id=job_id)
        job.status = 'RUNNING'
        job.save()

        total = len(payload_data)
        completed = 0
        batch_size = 50 # Small batches to avoid SQLite locks

        # Group data into batches
        batches = [payload_data[i:i + batch_size] for i in range(0, total, batch_size)]

        for batch in batches:
            with transaction.atomic():
                for row in batch:
                    student_id = row.get('studentId') or row.get('student_id')
                    try:
                        student = Student.objects.get(student_id=student_id)
                    except Student.DoesNotExist:
                        continue
                    semester = row.get('semester')
                    year = row.get('year')
                    scores_data = row.get('scores', {})
                    note = row.get('note', '')
                    academic_gpa = row.get('academicGpa') or row.get('academic_gpa')
                    academic_classification = row.get('academicClassification') or row.get('academic_classification', '')
                    requested_raw_score = row.get('rawScore') or row.get('raw_score')
                    requested_set_id = row.get('criteriaSet') or row.get('criteria_set')

                    if requested_set_id:
                        try:
                            criteria_set = CriteriaSet.objects.get(pk=requested_set_id)
                        except CriteriaSet.DoesNotExist:
                            continue
                    else:
                        criteria_set = (
                            CriteriaSet.objects.filter(semester=semester, academic_year=year, is_active=True).first()
                            or CriteriaSet.objects.filter(is_active=True).first()
                        )

                    if not criteria_set:
                        continue

                    # Create or update evaluation
                    evaluation, created = Evaluation.objects.update_or_create(
                        student=student, semester=semester, year=year,
                        defaults={
                            'note': note,
                            'academic_gpa': academic_gpa if academic_gpa not in ('', None) else None,
                            'academic_classification': academic_classification or '',
                            'status': 'draft',
                            'class_confirmed': False,
                            'criteria_set': criteria_set,
                        }
                    )

                    # Clear old details
                    evaluation.details.all().delete()

                    # Write new details and calculate total score
                    detail_objects = []
                    for sub_item_id, score_val in scores_data.items():
                        try:
                            sub_item = SubItem.objects.get(
                                id=int(sub_item_id),
                                group__criterion__criteria_set=criteria_set
                            )
                            detail_objects.append(
                                EvaluationDetail(
                                    evaluation=evaluation,
                                    sub_item=sub_item,
                                    score=score_val
                                )
                            )
                        except (SubItem.DoesNotExist, ValueError):
                            pass
                    
                    if detail_objects:
                        EvaluationDetail.objects.bulk_create(detail_objects)

                    sync_evaluation_with_transcript(evaluation)
                    recalculate_evaluation_score(evaluation)
                    if requested_raw_score not in (None, ''):
                        requested_total = int(float(requested_raw_score))
                        if requested_total > evaluation.raw_score:
                            evaluation.raw_score = requested_total
                            evaluation.save(update_fields=('raw_score',))
                    rebalance_training_score(student)
                    completed += 1

            # Save progress in database
            job.progress = completed
            job.save()

        job.status = 'SUCCESS'
        job.save()

    except Exception as e:
        try:
            job = EvaluationJob.objects.get(id=job_id)
            job.status = 'FAILED'
            job.error_message = str(e)
            job.save()
        except Exception:
            pass
    finally:
        db.close_old_connections()


def launch_bulk_init_job(payload_data):
    """
    Creates a new EvaluationJob and starts a background thread.
    """
    job = EvaluationJob.objects.create(
        status='PENDING',
        progress=0,
        total=len(payload_data)
    )
    threading.Thread(target=async_bulk_init_evaluations, args=(job.id, payload_data), daemon=True).start()
    return job
