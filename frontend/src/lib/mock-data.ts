export type Role = "admin" | "advisor" | "student";

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: Role;
  email: string;
  studentId?: string;
  avatar?: string;
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
}

export interface Criterion {
  id: string;
  code: string;
  name: string;
  maxScore: number;
  description: string;
  subCriteria?: { id: string; name: string; maxScore: number }[];
}

export type EvaluationStatus = "draft" | "pending" | "approved" | "rejected";

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
}

export const mockUsers: User[] = [
  { id: "u1", username: "admin", password: "admin123", fullName: "Nguyễn Quản Trị", role: "admin", email: "admin@university.edu.vn" },
  { id: "u2", username: "advisor", password: "advisor123", fullName: "TS. Trần Văn Cố Vấn", role: "advisor", email: "advisor@university.edu.vn" },
  { id: "u3", username: "student", password: "student123", fullName: "Lê Minh Sinh Viên", role: "student", email: "sv001@university.edu.vn", studentId: "SV001" },
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
    name: "Ý thức học tập",
    maxScore: 20,
    description: "Đánh giá ý thức và kết quả học tập của sinh viên",
    subCriteria: [
      { id: "c1-1", name: "Kết quả học tập trong học kỳ", maxScore: 14 },
      { id: "c1-2", name: "Tham gia NCKH, hội thảo", maxScore: 6 },
    ],
  },
  {
    id: "c2", code: "II",
    name: "Ý thức chấp hành nội quy",
    maxScore: 25,
    description: "Chấp hành nội quy nhà trường, pháp luật",
    subCriteria: [
      { id: "c2-1", name: "Chấp hành nội quy nhà trường", maxScore: 15 },
      { id: "c2-2", name: "Chấp hành pháp luật của Nhà nước", maxScore: 10 },
    ],
  },
  {
    id: "c3", code: "III",
    name: "Hoạt động chính trị - xã hội",
    maxScore: 20,
    description: "Tham gia các hoạt động đoàn thể, tình nguyện",
    subCriteria: [
      { id: "c3-1", name: "Hoạt động Đoàn - Hội", maxScore: 10 },
      { id: "c3-2", name: "Hoạt động tình nguyện, cộng đồng", maxScore: 10 },
    ],
  },
  {
    id: "c4", code: "IV",
    name: "Quan hệ công dân, cộng đồng",
    maxScore: 25,
    description: "Quan hệ với bạn bè, thầy cô, cộng đồng",
    subCriteria: [
      { id: "c4-1", name: "Có tinh thần đoàn kết, giúp đỡ", maxScore: 15 },
      { id: "c4-2", name: "Tham gia hoạt động cộng đồng", maxScore: 10 },
    ],
  },
  {
    id: "c5", code: "V",
    name: "Phụ trách lớp, đoàn thể",
    maxScore: 10,
    description: "Vai trò cán bộ lớp, Đoàn, Hội",
    subCriteria: [
      { id: "c5-1", name: "Cán bộ lớp / Đoàn / Hội", maxScore: 10 },
    ],
  },
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
