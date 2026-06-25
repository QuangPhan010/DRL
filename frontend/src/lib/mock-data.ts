export type Role = "admin" | "advisor" | "student" | "organizer" | "class_monitor" | "student_affairs" | "academic_affairs";

export interface UserOrganization {
  id: string;
  organization: string;
  organization_name: string;
  organization_type: string;
  position: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: Role;
  roles: Role[];
  email: string;
  studentId?: string;
  avatar?: string;
  organizations?: UserOrganization[];
}


export interface ClassPosition {
  id: string;
  name: string;
}

export interface StudentClassPosition {
  id: string;
  class_info: string;
  position: string;
  position_name: string;
  assigned_by?: string;
  assigned_by_name?: string;
  assigned_date: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  className: string;
  faculty: string;
  cohort: string;
  gender: "Nam" | "Nữ";
  phone: string;
  password?: string;
  positions?: StudentClassPosition[];
}


export interface ClassInfo {
  id: string;
  name: string;
  faculty: string;
  advisorId?: string; // ID of the academic advisor (advisor User)
  cohort: string;
}


export interface SubItem {
  id: string;
  name: string;
  maxScore: number;
}

export interface GroupCriterion {
  id: string;
  name: string;
  subItems: SubItem[];
}

export interface Criterion {
  id: string;
  code: string;
  name: string;
  maxScore: number;
  description: string;
  groups?: GroupCriterion[];
}

export type EvaluationStatus = "draft" | "class_pending" | "advisor_pending" | "pending" | "approved" | "rejected";

export interface Evaluation {
  id: string;
  studentId: string;
  semester: string;
  year: string;
  scores: Record<string, number>;
  note?: string;
  totalScore: number;
  classification: string;
  status: EvaluationStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
  academicScoreSynced?: boolean; // synced from academic affairs
  classConfirmed?: boolean; // confirmed by class monitor
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  points: number;
  criterionId: string;
  date: string;
  organizer: string;
  status: "upcoming" | "completed";
  participants: { studentId: string; fullName: string; className: string; status: "registered" | "attended" | "evidence_submitted"; evidenceUrl?: string }[];
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
}

export interface ActivityCheckIn {
  id: string;
  activity: string;
  student: string;
  student_name?: string;
  check_in_time: string;
  latitude: number;
  longitude: number;
  selfie_file_id?: string;
  device_id: string;
  ip_address: string;
}

export interface ActivityCheckOut {
  id: string;
  activity: string;
  student: string;
  student_name?: string;
  check_out_time: string;
  latitude: number;
  longitude: number;
  selfie_file_id?: string;
  device_id: string;
  ip_address: string;
}

export interface ActivityAttendance {
  id: string;
  activity: string;
  student: string;
  student_name?: string;
  student_id_str?: string;
  class_name?: string;
  duration_minutes: number;
  completion_percent: number;
  is_completed: boolean;
}

export interface FraudDetection {
  id: string;
  student?: string;
  student_name?: string;
  student_id_str?: string;
  activity?: string;
  activity_title?: string;
  rule_code: string;
  severity: "High" | "Medium" | "Critical";
  description: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user?: string;
  user_name?: string;
  action: string;
  entity_name: string;
  entity_id?: number;
  before_value?: string;
  after_value?: string;
  ip_address?: string;
  device_id?: string;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  request_type: string;
  reason: string;
  requested_by: string;
  requested_by_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}


export const mockUsers: User[] = [
  { id: "u1", username: "admin", password: "admin123", fullName: "Nguyễn Quản Trị", role: "admin", roles: ["admin"], email: "admin@university.edu.vn" },
  { 
    id: "u2", 
    username: "advisor", 
    password: "advisor123", 
    fullName: "TS. Trần Văn Cố Vấn", 
    role: "advisor", 
    roles: ["advisor", "organizer"], 
    email: "advisor@university.edu.vn",
    organizations: [
      { id: "o3", organization: "2", organization_name: "Khoa CNTT", organization_type: "Khoa", position: "Phụ trách" }
    ]
  },
  { 
    id: "u3", 
    username: "student", 
    password: "student123", 
    fullName: "Lê Minh Sinh Viên", 
    role: "student", 
    roles: ["student", "organizer"], 
    email: "sv001@university.edu.vn", 
    studentId: "SV001",
    organizations: [
      { id: "o1", organization: "1", organization_name: "CLB Tin học", organization_type: "CLB", position: "Chủ nhiệm" }
    ]
  },
  { id: "u4", username: "organizer", password: "organizer123", fullName: "Đoàn Thanh Niên", role: "organizer", roles: ["organizer"], email: "doanthanhnien@university.edu.vn" },
  { 
    id: "u5", 
    username: "monitor", 
    password: "monitor123", 
    fullName: "Nguyễn Văn Lớp Trưởng", 
    role: "class_monitor", 
    roles: ["class_monitor", "student", "organizer"], 
    email: "sv002@university.edu.vn", 
    studentId: "SV002",
    organizations: [
      { id: "o2", organization: "1", organization_name: "CLB Tin học", organization_type: "CLB", position: "Phó chủ nhiệm" }
    ]
  },
  { id: "u6", username: "affairs", password: "affairs123", fullName: "Phòng Công tác Sinh viên", role: "student_affairs", roles: ["student_affairs"], email: "ctsv@university.edu.vn" },
  { id: "u7", username: "academic", password: "academic123", fullName: "Phòng Đào tạo", role: "academic_affairs", roles: ["academic_affairs"], email: "daotao@university.edu.vn" },
  { id: "u8", username: "advisor2", password: "advisor123", fullName: "ThS. Nguyễn Thị Cố Vấn", role: "advisor", roles: ["advisor"], email: "advisor2@university.edu.vn" },
  { id: "u9", username: "advisor3", password: "advisor123", fullName: "ThS. Phạm Hoàng Nam", role: "advisor", roles: ["advisor"], email: "advisor3@university.edu.vn" },
];

export const mockClasses: ClassInfo[] = [
  { id: "c-1", name: "CNTT-K20A", faculty: "Công nghệ Thông tin", advisorId: "u2", cohort: "K20" },
  { id: "c-2", name: "CNTT-K20B", faculty: "Công nghệ Thông tin", advisorId: "u8", cohort: "K20" },
  { id: "c-3", name: "KT-K20A", faculty: "Kinh tế", advisorId: "u9", cohort: "K20" },
  { id: "c-4", name: "CK-K20A", faculty: "Cơ khí", cohort: "K20" },
  { id: "c-5", name: "DT-K20A", faculty: "Điện - Điện tử", cohort: "K20" },
  { id: "c-6", name: "NN-K20A", faculty: "Ngoại ngữ", cohort: "K20" },
];


export const mockActivities: Activity[] = [
  {
    id: "act-1",
    title: "Chiến dịch Mùa hè xanh 2026",
    description: "Hoạt động tình nguyện hè hỗ trợ cộng đồng, xây dựng nông thôn mới.",
    points: 10,
    criterionId: "c3",
    date: "2026-07-15",
    organizer: "Đoàn Thanh Niên",
    status: "upcoming",
    participants: [
      { studentId: "SV001", fullName: "Lê Minh Sinh Viên", className: "CNTT-K20A", status: "registered" }
    ]
  },
  {
    id: "act-2",
    title: "Hội thảo Nghiên cứu khoa học sinh viên",
    description: "Báo cáo các đề tài nghiên cứu khoa học cấp khoa/trường.",
    points: 6,
    criterionId: "c1",
    date: "2026-05-10",
    organizer: "Phòng Khoa học Công nghệ",
    status: "completed",
    participants: [
      { studentId: "SV001", fullName: "Lê Minh Sinh Viên", className: "CNTT-K20A", status: "attended" },
      { studentId: "SV002", fullName: "Nguyễn Văn Lớp Trưởng", className: "CNTT-K20A", status: "evidence_submitted", evidenceUrl: "https://example.com/certificate.pdf" }
    ]
  }
];


const faculties = ["Công nghệ Thông tin", "Kinh tế", "Cơ khí", "Điện - Điện tử", "Ngoại ngữ"];
const classes = ["CNTT-K20A", "CNTT-K20B", "KT-K20A", "CK-K20A", "DT-K20A", "NN-K20A"];
const firstNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const midNames = ["Văn", "Thị", "Minh", "Hữu", "Quốc", "Hoài", "Thanh"];
const lastNames = ["An", "Bình", "Cường", "Dũng", "Em", "Phong", "Giang", "Hà", "Khoa", "Linh", "Mai", "Nam", "Oanh", "Phúc"];

export const mockStudents: Student[] = Array.from({ length: 48 }, (_, i) => {
  const n = i + 1;
  const facIdx = i % faculties.length;
  return {
    id: `s${n}`,
    studentId: `SV${String(n).padStart(3, "0")}`,
    fullName: `${firstNames[i % firstNames.length]} ${midNames[i % midNames.length]} ${lastNames[i % lastNames.length]}`,
    email: `sv${String(n).padStart(3, "0")}@university.edu.vn`,
    className: classes[i % classes.length],
    faculty: faculties[facIdx],
    cohort: "K20",
    gender: i % 3 === 0 ? "Nữ" : "Nam",
    phone: `09${String(10000000 + n * 1234).slice(0, 8)}`,
  };
});

export const mockCriteria: Criterion[] = [
  {
    id: "c1", code: "I",
    name: "Trách nhiệm, tinh thần và thái độ trong học tập",
    maxScore: 20,
    description: "Đánh giá tinh thần vượt khó, kết quả học tập và trách nhiệm tham gia các cuộc thi học thuật của sinh viên.",
    groups: [
      {
        id: "g1-1",
        name: "1. Tinh thần vượt khó, phấn đấu vươn lên trong học tập",
        subItems: [
          { id: "s1-1-a", name: "a. Có ý thức học tập, tham dự đầy đủ các giờ học", maxScore: 5 },
          { id: "s1-1-b", name: "b. Đi học muộn 1 lần", maxScore: -1 },
          { id: "s1-1-c", name: "c. Đi học muộn nhiều lần", maxScore: -2 },
          { id: "s1-1-d", name: "d. Nghỉ học có phép", maxScore: -2 },
          { id: "s1-1-e", name: "e. Nghỉ học không phép", maxScore: -5 },
          { id: "s1-1-f", name: "f. Bỏ giờ học ra ngoài không lý do (Cúp tiết)", maxScore: -2 }
        ]
      },
      {
        id: "g1-2",
        name: "2. Kết quả học tập",
        subItems: [
          { id: "s1-2-a", name: "a. Kết quả học tập trung bình Học kỳ đạt loại Xuất sắc", maxScore: 5 },
          { id: "s1-2-b", name: "b. Kết quả học tập trung bình Học kỳ đạt loại Giỏi", maxScore: 3 },
          { id: "s1-2-c", name: "c. Kết quả học tập trung bình Học kỳ đạt loại Khá", maxScore: 2 },
          { id: "s1-2-d", name: "d. Đạt chứng chỉ nghề nghiệp (Tin học, Ngoại ngữ…)", maxScore: 2 }
        ]
      },
      {
        id: "g1-3",
        name: "3. Trách nhiệm và tinh thần tham gia các kỳ thi, cuộc thi",
        subItems: [
          { id: "s1-3-a", name: "a. Không vi phạm quy chế kiểm tra, thi cử", maxScore: 5 },
          { id: "s1-3-b", name: "b. Là thí sinh tham gia các cuộc thi học thuật do Khoa/ Nhà trường phát động", maxScore: 3 },
          { id: "s1-3-c", name: "c. Đạt thành tích các cuộc thi học thuật ở mục 3b", maxScore: 4 }
        ]
      }
    ]
  },
  {
    id: "c2", code: "II",
    name: "Trách nhiệm chấp hành pháp luật và nội quy, quy chế",
    maxScore: 25,
    description: "Đánh giá việc chấp hành luật pháp, an toàn giao thông và các quy chế học tập, sinh hoạt của nhà trường.",
    groups: [
      {
        id: "g2-1",
        name: "1. Chấp hành các quy định pháp luật và văn bản chỉ đạo",
        subItems: [
          { id: "s2-1-a", name: "a. Không vi phạm pháp luật, chủ trương các cấp", maxScore: 5 },
          { id: "s2-1-b", name: "b. Không vi phạm nội quy thông báo khác của nhà trường", maxScore: 5 }
        ]
      },
      {
        id: "g2-2",
        name: "2. Chấp hành nội quy, quy chế trường lớp",
        subItems: [
          { id: "s2-2-a", name: "a. Tham gia đầy đủ sinh hoạt lớp", maxScore: 5 },
          { id: "s2-2-b", name: "b. Tham gia đầy đủ sinh hoạt công dân HSSV", maxScore: 4 },
          { id: "s2-2-c", name: "c. Đóng học phí đúng hạn", maxScore: 5 },
          { id: "s2-2-d", name: "d. Vi phạm xử lý kỷ luật khiển trách", maxScore: -5 },
          { id: "s2-2-e", name: "e. Vi phạm xử lý kỷ luật cảnh cáo", maxScore: -10 }
        ]
      }
    ]
  },
  {
    id: "c3", code: "III",
    name: "Hoạt động chính trị - xã hội, văn hóa, thể thao",
    maxScore: 20,
    description: "Tham gia các chiến dịch tình nguyện, câu lạc bộ, hoạt động Đoàn - Hội và tuyên truyền pháp luật.",
    groups: [
      {
        id: "g3-1",
        name: "1. Hoạt động chính trị - xã hội, phong trào Đoàn - Hội",
        subItems: [
          { id: "s3-1-a", name: "a. Có tham gia hoạt động cấp Khoa, cấp Trường", maxScore: 3 },
          { id: "s3-1-b", name: "b. Có tham gia hoạt động từ cấp Thành phố trở lên", maxScore: 5 },
          { id: "s3-1-c", name: "c. Tích cực tham gia hoạt động Đoàn - Hội", maxScore: 3 }
        ]
      },
      {
        id: "g3-2",
        name: "2. Hoạt động công ích, tình nguyện xã hội",
        subItems: [
          { id: "s3-2-a", name: "a. Tham gia Mùa hè xanh, Tiếp sức mùa thi, Hiến máu nhân đạo...", maxScore: 5 },
          { id: "s3-2-b", name: "b. Được khen thưởng trong hoạt động tình nguyện", maxScore: 10 }
        ]
      }
    ]
  }
];

export function classify(total: number): string {
  if (total >= 90) return "Xuất sắc";
  if (total >= 80) return "Tốt";
  if (total >= 65) return "Khá";
  if (total >= 50) return "Trung bình";
  if (total >= 35) return "Yếu";
  return "Kém";
}

export function classificationColor(c: string): string {
  switch (c) {
    case "Xuất sắc": return "bg-gradient-primary text-primary-foreground";
    case "Tốt": return "bg-success/15 text-success border-success/30";
    case "Khá": return "bg-primary/10 text-primary border-primary/20";
    case "Trung bình": return "bg-warning/15 text-warning border-warning/30";
    case "Yếu": return "bg-orange-100 text-orange-700 border-orange-200";
    default: return "bg-destructive/15 text-destructive border-destructive/30";
  }
}

const semesters = ["HK1 2023-2024", "HK2 2023-2024", "HK1 2024-2025"];

function seededScore(seed: number, max: number) {
  const v = Math.abs(Math.sin(seed * 9.13) * 10000) % 1;
  return Math.round(max * (0.55 + v * 0.45));
}

export const mockEvaluations: Evaluation[] = mockStudents.flatMap((s, idx) =>
  semesters.map((sem, si) => {
    const scores: Record<string, number> = {};
    let total = 0;
    mockCriteria.forEach((c, ci) => {
      const sc = seededScore(idx * 10 + ci + si * 3, c.maxScore);
      scores[c.id] = sc;
      total += sc;
    });
    const statuses: EvaluationStatus[] = ["approved", "approved", "pending"];
    const status = si === 2 ? (idx % 4 === 0 ? "pending" : idx % 5 === 0 ? "rejected" : "approved") : statuses[si];
    return {
      id: `e-${s.id}-${si}`,
      studentId: s.studentId,
      semester: sem.split(" ")[0],
      year: sem.split(" ")[1],
      scores,
      totalScore: total,
      classification: classify(total),
      status,
      submittedAt: `2024-${String(((si + 1) * 3) % 12 + 1).padStart(2, "0")}-15`,
      note: si === 0 ? "Sinh viên tích cực tham gia hoạt động" : undefined,
    };
  })
);

export const distributionData = (() => {
  const buckets = { "Xuất sắc": 0, "Tốt": 0, "Khá": 0, "Trung bình": 0, "Yếu": 0, "Kém": 0 };
  mockEvaluations.filter(e => e.status === "approved").forEach(e => {
    buckets[e.classification as keyof typeof buckets]++;
  });
  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
})();

export const trendData = [
  { semester: "HK1 22-23", "Trung bình": 72 },
  { semester: "HK2 22-23", "Trung bình": 75 },
  { semester: "HK1 23-24", "Trung bình": 78 },
  { semester: "HK2 23-24", "Trung bình": 81 },
  { semester: "HK1 24-25", "Trung bình": 79 },
];

export const facultiesList = faculties;
export const classesList = classes;
