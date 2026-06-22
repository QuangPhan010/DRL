from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view, change_password_view, ClassInfoViewSet, StudentViewSet, 
    CriterionViewSet, EvaluationViewSet, ActivityViewSet, UserViewSet
)

router = DefaultRouter()
router.register(r'classes', ClassInfoViewSet, basename='class')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'criteria', CriterionViewSet, basename='criterion')
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', login_view, name='login'),
    path('change-password/', change_password_view, name='change-password'),
    path('', include(router.urls)),
]
