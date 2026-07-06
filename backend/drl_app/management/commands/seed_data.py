import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from drl_app.models import ClassInfo, Student, CriteriaSet, Criterion, GroupCriterion, SubItem, Evaluation, EvaluationDetail, Activity, ActivityParticipant, Organization, UserOrganization

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial data for DRL project'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        UserOrganization.objects.all().delete()
        Organization.objects.all().delete()
        ActivityParticipant.objects.all().delete()
        Activity.objects.all().delete()
        EvaluationDetail.objects.all().delete()
        Evaluation.objects.all().delete()
        SubItem.objects.all().delete()
        GroupCriterion.objects.all().delete()
        Criterion.objects.all().delete()
        CriteriaSet.objects.all().delete()
        Student.objects.all().delete()
        ClassInfo.objects.all().delete()
        User.objects.all().delete()


        self.stdout.write('Creating users...')
        users_data = [
            { 'username': 'admin', 'password': 'admin123', 'full_name': 'Nguyễn Quản Trị', 'role': 'admin', 'email': 'admin@university.edu.vn' },
            { 'username': 'advisor', 'password': 'advisor123', 'full_name': 'TS. Trần Văn Cố Vấn', 'role': 'advisor', 'email': 'advisor@university.edu.vn' },
            { 'username': 'student', 'password': 'student123', 'full_name': 'Lê Minh Sinh Viên', 'role': 'student', 'email': 'sv001@university.edu.vn', 'student_id': 'SV001' },
            { 'username': 'organizer', 'password': 'organizer123', 'full_name': 'Đoàn Thanh Niên', 'role': 'organizer', 'email': 'doanthanhnien@university.edu.vn' },
            { 'username': 'monitor', 'password': 'monitor123', 'full_name': 'Nguyễn Văn Lớp Trưởng', 'role': 'class_monitor', 'email': 'sv002@university.edu.vn', 'student_id': 'SV002' },
            { 'username': 'affairs', 'password': 'affairs123', 'full_name': 'Phòng Công tác Sinh viên', 'role': 'student_affairs', 'email': 'ctsv@university.edu.vn' },
            { 'username': 'academic', 'password': 'academic123', 'full_name': 'Phòng Đào tạo', 'role': 'academic_affairs', 'email': 'daotao@university.edu.vn' },
            { 'username': 'advisor2', 'password': 'advisor123', 'full_name': 'ThS. Nguyễn Thị Cố Vấn', 'role': 'advisor', 'email': 'advisor2@university.edu.vn' },
            { 'username': 'advisor3', 'password': 'advisor123', 'full_name': 'ThS. Phạm Hoàng Nam', 'role': 'advisor', 'email': 'advisor3@university.edu.vn' },
        ]

        db_users = {}
        for u in users_data:
            user = User.objects.create_user(
                username=u['username'],
                email=u['email'],
                password=u['password'],
                role=u['role'],
                full_name=u['full_name'],
                student_id=u.get('student_id'),
                plain_password=u['password']
            )
            db_users[u['username']] = user

        self.stdout.write('Creating organizations and user-organizations...')
        clb = Organization.objects.create(name='CLB Tin học', type='CLB')
        khoa = Organization.objects.create(name='Khoa CNTT', type='Khoa')
        
        UserOrganization.objects.create(user=db_users['student'], organization=clb, position='Chủ nhiệm')
        UserOrganization.objects.create(user=db_users['monitor'], organization=clb, position='Phó chủ nhiệm')
        UserOrganization.objects.create(user=db_users['advisor'], organization=khoa, position='Phụ trách')


        self.stdout.write('Creating classes...')
        classes_data = [
            { 'name': 'CNTT-K20A', 'faculty': 'Công nghệ Thông tin', 'advisor_username': 'advisor', 'cohort': 'K20' },
            { 'name': 'CNTT-K20B', 'faculty': 'Công nghệ Thông tin', 'advisor_username': 'advisor2', 'cohort': 'K20' },
            { 'name': 'KT-K20A', 'faculty': 'Kinh tế', 'advisor_username': 'advisor3', 'cohort': 'K20' },
            { 'name': 'CK-K20A', 'faculty': 'Cơ khí', 'advisor_username': None, 'cohort': 'K20' },
            { 'name': 'DT-K20A', 'faculty': 'Điện - Điện tử', 'advisor_username': None, 'cohort': 'K20' },
            { 'name': 'NN-K20A', 'faculty': 'Ngoại ngữ', 'advisor_username': None, 'cohort': 'K20' },
        ]

        db_classes = {}
        for c in classes_data:
            advisor_user = db_users.get(c['advisor_username']) if c['advisor_username'] else None
            cls = ClassInfo.objects.create(
                name=c['name'],
                faculty=c['faculty'],
                cohort=c['cohort'],
                advisor=advisor_user
            )
            db_classes[c['name']] = cls

        self.stdout.write('Creating students...')
        faculties = ["Công nghệ Thông tin", "Kinh tế", "Cơ khí", "Điện - Điện tử", "Ngoại ngữ"]
        classes_list = ["CNTT-K20A", "CNTT-K20B", "KT-K20A", "CK-K20A", "DT-K20A", "NN-K20A"]
        first_names = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"]
        mid_names = ["Văn", "Thị", "Minh", "Hữu", "Quốc", "Hoài", "Thanh"]
        last_names = ["An", "Bình", "Cường", "Dũng", "Em", "Phong", "Giang", "Hà", "Khoa", "Linh", "Mai", "Nam", "Oanh", "Phúc"]

        db_students = []
        for i in range(48):
            n = i + 1
            fac_idx = i % len(faculties)
            cls_name = classes_list[i % len(classes_list)]
            student_id = f"SV{str(n).zfill(3)}"
            full_name = f"{first_names[i % len(first_names)]} {mid_names[i % len(mid_names)]} {last_names[i % len(last_names)]}"
            email = f"sv{str(n).zfill(3)}@university.edu.vn"

            # Check if user matches
            user_assoc = None
            if student_id == 'SV001':
                user_assoc = db_users['student']
            elif student_id == 'SV002':
                user_assoc = db_users['monitor']

            std = Student.objects.create(
                user=user_assoc,
                student_id=student_id,
                full_name=full_name,
                email=email,
                class_info=db_classes[cls_name],
                faculty=faculties[fac_idx],
                cohort='K20',
                gender='Nữ' if i % 3 == 0 else 'Nam',
                phone=f"09{str(10000000 + n * 1234)[:8]}"
            )
            db_students.append(std)

        self.stdout.write('Creating criteria...')
        criteria_set = CriteriaSet.objects.create(
            name='Bộ tiêu chí HK1 2024-2025',
            description='Bộ tiêu chí mặc định được tạo từ dữ liệu mẫu.',
            semester='HK1',
            academic_year='2024-2025',
            is_active=True,
        )
        criteria_data = [
            {
                'code': 'I',
                'name': 'Trách nhiệm, tinh thần và thái độ trong học tập',
                'max_score': 20,
                'description': 'Đánh giá tinh thần vượt khó, kết quả học tập và trách nhiệm tham gia các cuộc thi học thuật của sinh viên.',
                'groups': [
                    {
                        'name': '1. Tinh thần vượt khó, phấn đấu vươn lên trong học tập',
                        'sub_items': [
                            { 'name': 'a. Có ý thức học tập, tham dự đầy đủ các giờ học', 'max_score': 5 },
                            { 'name': 'b. Đi học muộn 1 lần', 'max_score': -1 },
                            { 'name': 'c. Đi học muộn nhiều lần', 'max_score': -2 },
                            { 'name': 'd. Nghỉ học có phép', 'max_score': -2 },
                            { 'name': 'e. Nghỉ học không phép', 'max_score': -5 },
                            { 'name': 'f. Bỏ giờ học ra ngoài không lý do (Cúp tiết)', 'max_score': -2 }
                        ]
                    },
                    {
                        'name': '2. Kết quả học tập',
                        'sub_items': [
                            { 'name': 'a. Kết quả học tập trung bình Học kỳ đạt loại Xuất sắc', 'max_score': 5 },
                            { 'name': 'b. Kết quả học tập trung bình Học kỳ đạt loại Giỏi', 'max_score': 3 },
                            { 'name': 'c. Kết quả học tập trung bình Học kỳ đạt loại Khá', 'max_score': 2 },
                            { 'name': 'd. Đạt chứng chỉ nghề nghiệp (Tin học, Ngoại ngữ…)', 'max_score': 2 }
                        ]
                    },
                    {
                        'name': '3. Trách nhiệm và tinh thần tham gia các kỳ thi, cuộc thi',
                        'sub_items': [
                            { 'name': 'a. Không vi phạm quy chế kiểm tra, thi cử', 'max_score': 5 },
                            { 'name': 'b. Là thí sinh tham gia các cuộc thi học thuật do Khoa/ Nhà trường phát động', 'max_score': 3 },
                            { 'name': 'c. Đạt thành tích các cuộc thi học thuật ở mục 3b', 'max_score': 4 }
                        ]
                    }
                ]
            },
            {
                'code': 'II',
                'name': 'Trách nhiệm chấp hành pháp luật và nội quy, quy chế',
                'max_score': 25,
                'description': 'Đánh giá việc chấp hành luật pháp, an toàn giao thông và các quy chế học tập, sinh hoạt của nhà trường.',
                'groups': [
                    {
                        'name': '1. Chấp hành các quy định pháp luật và văn bản chỉ đạo',
                        'sub_items': [
                            { 'name': 'a. Không vi phạm pháp luật, chủ trương các cấp', 'max_score': 5 },
                            { 'name': 'b. Không vi phạm nội quy thông báo khác của nhà trường', 'max_score': 5 }
                        ]
                    },
                    {
                        'name': '2. Chấp hành nội quy, quy chế trường lớp',
                        'sub_items': [
                            { 'name': 'a. Tham gia đầy đủ sinh hoạt lớp', 'max_score': 5 },
                            { 'name': 'b. Tham gia đầy đủ sinh hoạt công dân HSSV', 'max_score': 4 },
                            { 'name': 'c. Đóng học phí đúng hạn', 'max_score': 5 },
                            { 'name': 'd. Vi phạm xử lý kỷ luật khiển trách', 'max_score': -5 },
                            { 'name': 'e. Vi phạm xử lý kỷ luật cảnh cáo', 'max_score': -10 }
                        ]
                    }
                ]
            },
            {
                'code': 'III',
                'name': 'Hoạt động chính trị - xã hội, văn hóa, thể thao',
                'max_score': 20,
                'description': 'Tham gia các chiến dịch tình nguyện, câu lạc bộ, hoạt động Đoàn - Hội và tuyên truyền pháp luật.',
                'groups': [
                    {
                        'name': '1. Hoạt động chính trị - xã hội, phong trào Đoàn - Hội',
                        'sub_items': [
                            { 'name': 'a. Có tham gia hoạt động cấp Khoa, cấp Trường', 'max_score': 3 },
                            { 'name': 'b. Có tham gia hoạt động từ cấp Thành phố trở lên', 'max_score': 5 },
                            { 'name': 'c. Tích cực tham gia hoạt động Đoàn - Hội', 'max_score': 3 }
                        ]
                    },
                    {
                        'name': '2. Hoạt động công ích, tình nguyện xã hội',
                        'sub_items': [
                            { 'name': 'a. Tham gia Mùa hè xanh, Tiếp sức mùa thi, Hiến máu nhân đạo...', 'max_score': 5 },
                            { 'name': 'b. Được khen thưởng trong hoạt động tình nguyện', 'max_score': 10 }
                        ]
                    }
                ]
            }
        ]

        db_sub_items = []
        for cr in criteria_data:
            c = Criterion.objects.create(
                criteria_set=criteria_set,
                code=cr['code'],
                name=cr['name'],
                max_score=cr['max_score'],
                description=cr['description']
            )
            for gr in cr['groups']:
                g = GroupCriterion.objects.create(criterion=c, name=gr['name'])
                for sub in gr['sub_items']:
                    s = SubItem.objects.create(group=g, name=sub['name'], max_score=sub['max_score'])
                    db_sub_items.append(s)

        self.stdout.write('Creating evaluations...')
        semesters = ["HK1", "HK2"]
        years = ["2023-2024", "2024-2025"]

        # Add mock evaluations
        for std in db_students:
            for sem in semesters:
                for yr in years:
                    # Deterministic scores using math/seeded logic
                    status_val = 'approved'
                    if sem == 'HK2' and yr == '2024-2025':
                        status_val = 'pending' if int(std.student_id[2:]) % 4 == 0 else 'approved'

                    eval_obj = Evaluation.objects.create(
                        student=std,
                        criteria_set=criteria_set,
                        semester=sem,
                        year=yr,
                        status=status_val,
                        total_score=0,
                        classification='Khá'
                    )

                    # Add detailed sub-scores
                    total_score = 0
                    for crit in Criterion.objects.all():
                        crit_score = 0
                        for group in crit.groups.all():
                            for sub in group.sub_items.all():
                                # Generate deterministic score
                                score_val = 0
                                if sub.max_score > 0:
                                    # Seeded score logic
                                    score_val = max(1, sub.max_score - (int(std.student_id[2:]) % sub.max_score))
                                else:
                                    # Penalties
                                    score_val = 0 # No penalty by default
                                
                                EvaluationDetail.objects.create(
                                    evaluation=eval_obj,
                                    sub_item=sub,
                                    score=score_val
                                )
                                crit_score += score_val
                        total_score += max(0, min(crit.max_score, crit_score))

                    eval_obj.total_score = total_score
                    if total_score >= 90:
                        eval_obj.classification = "Xuất sắc"
                    elif total_score >= 80:
                        eval_obj.classification = "Giỏi"
                    elif total_score >= 65:
                        eval_obj.classification = "Khá"
                    elif total_score >= 50:
                        eval_obj.classification = "Trung bình"
                    elif total_score >= 35:
                        eval_obj.classification = "Yếu"
                    else:
                        eval_obj.classification = "Kém"
                    eval_obj.save()

        self.stdout.write('Creating activities...')
        act1 = Activity.objects.create(
            title="Chiến dịch Mùa hè xanh 2026",
            description="Hoạt động tình nguyện hè hỗ trợ cộng đồng, xây dựng nông thôn mới.",
            points=10,
            criterion=Criterion.objects.get(code='III'),
            date=datetime.date(2026, 7, 15),
            organizer="Đoàn Thanh Niên",
            status="upcoming"
        )
        # Register student SV001
        ActivityParticipant.objects.create(
            activity=act1,
            student=Student.objects.get(student_id='SV001'),
            status='registered'
        )

        act2 = Activity.objects.create(
            title="Hội thảo Nghiên cứu khoa học sinh viên",
            description="Báo cáo các đề tài nghiên cứu khoa học cấp khoa/trường.",
            points=6,
            criterion=Criterion.objects.get(code='I'),
            date=datetime.date(2026, 5, 10),
            organizer="Phòng Khoa học Công nghệ",
            status="completed"
        )
        # Register student SV001, SV002
        ActivityParticipant.objects.create(
            activity=act2,
            student=Student.objects.get(student_id='SV001'),
            status='attended'
        )
        ActivityParticipant.objects.create(
            activity=act2,
            student=Student.objects.get(student_id='SV002'),
            status='evidence_submitted',
            evidence_url="https://example.com/certificate.pdf"
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded all initial mock data!'))
