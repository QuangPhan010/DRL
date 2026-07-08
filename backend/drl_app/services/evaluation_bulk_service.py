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
