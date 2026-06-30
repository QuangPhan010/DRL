from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from drl_app.models import (
    CriteriaSet,
    Criterion,
    Evaluation,
    GroupCriterion,
    Student,
    SubItem,
    User,
)


class CriteriaSetApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            password='secret',
            role='admin',
        )
        self.client.force_authenticate(self.admin)
        self.first_set = CriteriaSet.objects.create(
            name='Bộ HK1',
            semester='HK1',
            academic_year='2026-2027',
            is_active=True,
        )
        criterion = Criterion.objects.create(
            criteria_set=self.first_set,
            code='I',
            name='Học tập',
            max_score=20,
        )
        group = GroupCriterion.objects.create(criterion=criterion, name='Kết quả')
        SubItem.objects.create(group=group, name='Hoàn thành tốt', max_score=10)

    def test_clone_and_activate_criteria_set(self):
        response = self.client.post(reverse('criteria-set-list'), {
            'name': 'Bộ HK2',
            'semester': 'HK2',
            'academic_year': '2026-2027',
            'clone_from': self.first_set.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cloned_set = CriteriaSet.objects.get(pk=response.data['id'])
        self.assertEqual(cloned_set.criteria.count(), 1)
        self.assertEqual(
            cloned_set.criteria.first().groups.first().sub_items.count(),
            1,
        )

        activate_response = self.client.post(
            reverse('criteria-set-activate', args=(cloned_set.id,))
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.first_set.refresh_from_db()
        cloned_set.refresh_from_db()
        self.assertFalse(self.first_set.is_active)
        self.assertTrue(cloned_set.is_active)

    def test_default_criteria_list_only_returns_active_set(self):
        other_set = CriteriaSet.objects.create(name='Bộ nháp')
        Criterion.objects.create(
            criteria_set=other_set,
            code='I',
            name='Tiêu chí nháp',
            max_score=20,
        )

        response = self.client.get(reverse('criterion-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['criteria_set'], self.first_set.id)

    def test_evaluation_keeps_the_selected_set(self):
        student = Student.objects.create(
            student_id='SV001',
            full_name='Sinh viên',
            email='sv001@example.com',
            faculty='CNTT',
            cohort='2026',
        )
        sub_item = SubItem.objects.get(
            group__criterion__criteria_set=self.first_set
        )

        response = self.client.post(reverse('evaluation-list'), {
            'studentId': student.student_id,
            'semester': 'HK1',
            'year': '2026-2027',
            'scores': {str(sub_item.id): 10},
            'status': 'draft',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        evaluation = Evaluation.objects.get(student=student)
        self.assertEqual(evaluation.criteria_set, self.first_set)
        self.assertEqual(evaluation.total_score, 10)
