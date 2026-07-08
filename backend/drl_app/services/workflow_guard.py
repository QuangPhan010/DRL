import logging
from django.core.exceptions import ValidationError
from django.utils import timezone
from ..models import AuditLog

logger = logging.getLogger('drl_app')

class VersionConflictException(Exception):
    def __init__(self, message, server_version):
        super().__init__(message)
        self.server_version = server_version

class WorkflowLockedException(Exception):
    pass

class IllegalUpdateException(Exception):
    pass


def log_audit(*, user, action, entity_name='Evaluation', entity_id=None, before_value='', after_value='', request=None):
    """
    Utility function to create an AuditLog entry.
    """
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        entity_name=entity_name,
        entity_id=entity_id,
        before_value=str(before_value),
        after_value=str(after_value),
        ip_address=ip_address
    )


def validate_evaluation_write_access(*, evaluation, user, client_version=None, request=None):
    """
    Performs security, status, and optimistic lock checks before any write operation on an Evaluation.
    If the user is an Admin, they can override status locks, which triggers an Admin Override Audit Log.
    """
    # 1. Admin Override check
    is_admin = user and user.is_authenticated and user.role == 'admin'

    # 2. Permission and Ownership checks
    if user and user.is_authenticated:
        student = getattr(user, 'student_profile', None)
        if student and student.pk != evaluation.student_id:
            log_audit(
                user=user,
                action='Illegal Update Attempt',
                entity_id=evaluation.id,
                before_value=evaluation.status,
                after_value='unauthorized_student_access',
                request=request
            )
            logger.error(f"Illegal update attempt on Evaluation {evaluation.id} by User {user.username}.")
            raise IllegalUpdateException('Bạn chỉ được sửa phiếu đánh giá của chính mình.')
    else:
        logger.warning("Unauthenticated access write attempt.")
        raise IllegalUpdateException('Vui lòng đăng nhập để thực hiện thao tác.')

    # 3. Optimistic Lock Check
    if client_version is not None:
        try:
            client_ver_int = int(client_version)
        except (ValueError, TypeError):
            raise ValidationError('Mã phiên bản (version) không hợp lệ.')

        if client_ver_int != evaluation.version:
            log_audit(
                user=user,
                action='Version Conflict',
                entity_id=evaluation.id,
                before_value=f"server_version={evaluation.version}",
                after_value=f"client_version={client_ver_int}",
                request=request
            )
            logger.warning(f"Version conflict detected on Evaluation {evaluation.id}. Server: {evaluation.version}, Client: {client_ver_int}.")
            raise VersionConflictException(
                message='Evaluation đã được chỉnh sửa từ một phiên khác.',
                server_version=evaluation.version
            )

    # 4. Workflow Lock Check (Status validation)
    is_student = user.role == 'student' or getattr(user, 'student_profile', None) is not None
    
    if is_student and not is_admin:
        if evaluation.status not in ('draft', 'rejected'):
            log_audit(
                user=user,
                action='Workflow Locked',
                entity_id=evaluation.id,
                before_value=evaluation.status,
                after_value='illegal_student_edit_attempt',
                request=request
            )
            logger.warning(f"Workflow lock violation attempt on Evaluation {evaluation.id} by student {user.username}. Status: {evaluation.status}.")
            raise WorkflowLockedException(
                f"Phiếu tự đánh giá đã bị khóa (Trạng thái hiện tại: {evaluation.get_status_display()}). Không thể chỉnh sửa."
            )

    if evaluation.status == 'approved' and not is_admin:
        log_audit(
            user=user,
            action='Workflow Locked',
            entity_id=evaluation.id,
            before_value='approved',
            after_value='unauthorized_edit_attempt',
            request=request
        )
        logger.warning(f"Workflow lock violation attempt on approved Evaluation {evaluation.id} by {user.username}.")
        raise WorkflowLockedException('Phiếu đánh giá đã được phê duyệt hoàn tất và không thể chỉnh sửa.')

    # 5. Log Admin Override
    if is_admin and evaluation.status not in ('draft', 'rejected'):
        log_audit(
            user=user,
            action='Admin Override',
            entity_id=evaluation.id,
            before_value=evaluation.status,
            after_value='admin_bypass_workflow_lock',
            request=request
        )
        logger.info(f"Admin override on Evaluation {evaluation.id} by Admin {user.username}.")
