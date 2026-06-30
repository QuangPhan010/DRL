from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view, change_password_view, ClassInfoViewSet, StudentViewSet, 
    CriteriaSetViewSet, CriterionViewSet, EvaluationViewSet, ActivityViewSet, UserViewSet,
    OrganizationViewSet, UserOrganizationViewSet, ClassPositionViewSet, StudentClassPositionViewSet,
    FraudDetectionViewSet, AuditLogViewSet, ChangeRequestViewSet,
    ExternalActivityViewSet, EvidenceFileViewSet, EvidenceReviewViewSet, FraudFlagViewSet
)

router = DefaultRouter()
router.register(r'classes', ClassInfoViewSet, basename='class')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'criteria-sets', CriteriaSetViewSet, basename='criteria-set')
router.register(r'criteria', CriterionViewSet, basename='criterion')
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'users', UserViewSet, basename='user')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'user-organizations', UserOrganizationViewSet, basename='user-organization')
router.register(r'class-positions', ClassPositionViewSet, basename='class-position')
router.register(r'student-class-positions', StudentClassPositionViewSet, basename='student-class-position')
router.register(r'fraud-detections', FraudDetectionViewSet, basename='fraud-detection')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'change-requests', ChangeRequestViewSet, basename='change-request')
router.register(r'external-activities', ExternalActivityViewSet, basename='external-activity')
router.register(r'evidence-files', EvidenceFileViewSet, basename='evidence-file')
router.register(r'evidence-reviews', EvidenceReviewViewSet, basename='evidence-review')
router.register(r'fraud-flags', FraudFlagViewSet, basename='fraud-flag')

urlpatterns = [
    path('login/', login_view, name='login'),
    path('change-password/', change_password_view, name='change-password'),
    path('', include(router.urls)),
]


