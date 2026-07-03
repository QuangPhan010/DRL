import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeSearch } from "@/lib/search";

type SchoolClass = { id: number; name: string; faculty: string; cohort: string; student_count?: number };
type Student = { id: number; student_id: string; full_name: string; class_name: string; faculty: string; cohort: string };
type CriteriaSet = { id: number; name: string; semester: string; academic_year: string; is_active: boolean; criteria_count: number; total_max_score: number };
type Criterion = {
  id: number;
  code: string;
  name: string;
  max_score: number;
  groups: { id: number; subItems: { id: number; name: string; max_score: number }[] }[];
};
type TranscriptItem = { student_code: string; gpa: number; classification: string };
type Activity = {
  id: number;
  title: string;
  points: number;
  criterion: number;
  participants?: { student_id: string; status: string; checked_in_time?: string; checked_out_time?: string }[];
};
type ScoreRow = Student & {
  gpa: number | null;
  academicClassification: string;
  attendanceCount: number;
  criterionScores: Record<number, number>;
  rawCriterionScores: Record<number, number>;
  rawTotal: number;
  surplus: number;
  total: number;
  classification: string;
};

const steps = [
  { title: "Phạm vi sinh viên", short: "Phạm vi", icon: Users },
  { title: "Chọn bộ tiêu chí", short: "Tiêu chí", icon: BookOpenCheck },
  { title: "Kiểm tra điểm danh", short: "Điểm danh", icon: ClipboardCheck },
  { title: "Kiểm tra học lực", short: "Học lực", icon: Database },
  { title: "Tính điểm tự động", short: "Tính điểm", icon: Sparkles },
  { title: "Review kết quả", short: "Review", icon: CheckCircle2 },
  { title: "Lưu phiên", short: "Lưu", icon: Save },
];

const headers = () => {
  const token = localStorage.getItem("drl_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getAcademicYears = () => {
  const now = new Date();
  const base = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => `${base - 1 + index}-${base + index}`);
};

const classifyScore = (score: number) => {
  if (score >= 90) return "Xuất sắc";
  if (score >= 80) return "Tốt";
  if (score >= 65) return "Khá";
  if (score >= 50) return "Trung bình";
  if (score >= 35) return "Yếu";
  return "Kém";
};

const academicPoints = (gpa: number | null) => {
  if (gpa === null) return 0;
  if (gpa >= 3.6) return 14;
  if (gpa >= 3.2) return 12;
  if (gpa >= 2.5) return 10;
  if (gpa >= 2) return 8;
  if (gpa >= 1) return 5;
  return 0;
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function EvaluationSession() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [transcriptNotice, setTranscriptNotice] = useState("");
  const [scope, setScope] = useState("all");
  const [faculty, setFaculty] = useState("all");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [semester, setSemester] = useState("HK1");
  const [year, setYear] = useState(getAcademicYears()[1]);
  const [criteriaSetId, setCriteriaSetId] = useState("");
  const [query, setQuery] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        setLoading(true);
        const [classRes, studentRes, setRes, activityRes, transcriptRes] = await Promise.all([
          fetch(`${API_URL}/classes/`, { headers: headers() }),
          fetch(`${API_URL}/students/`, { headers: headers() }),
          fetch(`${API_URL}/criteria-sets/`, { headers: headers() }),
          fetch(`${API_URL}/activities/`, { headers: headers() }),
          fetch(`${API_URL}/transcripts/`, { headers: headers() }),
        ]);
        if (!classRes.ok || !studentRes.ok || !setRes.ok) throw new Error("Không thể tải dữ liệu nền");
        const [classData, studentData, setData] = await Promise.all([classRes.json(), studentRes.json(), setRes.json()]);
        const activityData = activityRes.ok ? await activityRes.json() : [];
        const transcriptData = transcriptRes.ok ? await transcriptRes.json() : [];
        setClasses(classData);
        setStudents(studentData);
        setCriteriaSets(setData);
        setActivities(activityData);
        const latestImportedPeriod = (transcriptData || []).find(
          (item: any) => item.status === "IMPORTED" && item.school_year && item.semester,
        );
        const matchingSet = latestImportedPeriod
          ? setData.find((item: CriteriaSet) =>
              item.semester === latestImportedPeriod.semester
              && item.academic_year === latestImportedPeriod.school_year
            )
          : null;
        const preferred = matchingSet
          || setData.find((item: CriteriaSet) => item.is_active)
          || setData[0];
        if (preferred) {
          setCriteriaSetId(String(preferred.id));
        }
        if (latestImportedPeriod) {
          setSemester(latestImportedPeriod.semester);
          setYear(latestImportedPeriod.school_year);
        } else if (preferred) {
          if (preferred.semester) setSemester(preferred.semester);
          if (preferred.academic_year) setYear(preferred.academic_year);
        }
      } catch (error) {
        console.error(error);
        toast.error("Không tải được dữ liệu để tạo phiên đánh giá");
      } finally {
        setLoading(false);
      }
    };
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!criteriaSetId) return;
    // Scores are derived from the selected criteria set. Never keep rows that
    // were calculated with a previous set or previous score limits.
    setScores([]);
    setSavedCount(0);
    fetch(`${API_URL}/criteria/?criteria_set=${criteriaSetId}`, { headers: headers() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setCriteria)
      .catch(() => toast.error("Không tải được cấu trúc bộ tiêu chí"));
  }, [criteriaSetId]);

  useEffect(() => {
    setScores([]);
    setSavedCount(0);
  }, [semester, year]);

  const faculties = useMemo(() => Array.from(new Set(classes.map((item) => item.faculty).filter(Boolean))).sort(), [classes]);
  const visibleClasses = useMemo(
    () => classes.filter((item) => faculty === "all" || item.faculty === faculty),
    [classes, faculty],
  );
  const scopedStudents = useMemo(() => {
    return students.filter((student) => {
      if (scope === "faculty") return faculty !== "all" && student.faculty === faculty;
      if (scope === "class") return selectedClasses.includes(student.class_name);
      return true;
    });
  }, [students, scope, faculty, selectedClasses]);
  const filteredScores = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return scores;
    return scores.filter((item) =>
      `${item.student_id} ${item.full_name} ${item.class_name}`.toLocaleLowerCase("vi").includes(normalized),
    );
  }, [scores, query]);
  const selectedSet = criteriaSets.find((item) => String(item.id) === criteriaSetId);
  const criteriaSetPeriodMismatch = !!selectedSet && (
    (selectedSet.semester && selectedSet.semester !== semester)
    || (selectedSet.academic_year && selectedSet.academic_year !== year)
  );
  const maximumSessionScore = criteria.reduce(
    (sum, criterion) => sum + Math.max(0, criterion.max_score),
    0,
  ) || selectedSet?.total_max_score || 100;
  const matchedAttendance = useMemo(() => {
    const ids = new Set(scopedStudents.map((item) => item.student_id));
    return activities.reduce((total, activity) =>
      total + (activity.participants || []).filter((item) => ids.has(item.student_id) && item.status === "attended").length, 0);
  }, [activities, scopedStudents]);
  const matchedTranscriptCount = useMemo(() => {
    const transcriptIds = new Set(transcripts.map((item) => item.student_code));
    return scopedStudents.filter((item) => transcriptIds.has(item.student_id)).length;
  }, [scopedStudents, transcripts]);
  const averageCalculatedScore = scores.length
    ? Math.round(scores.reduce((sum, item) => sum + item.total, 0) / scores.length)
    : 0;

  const toggleClass = (className: string, checked: boolean) => {
    setSelectedClasses((current) => checked ? [...new Set([...current, className])] : current.filter((item) => item !== className));
  };

  const loadTranscriptData = async () => {
    try {
      setTranscriptLoading(true);
      const listRes = await fetch(`${API_URL}/transcripts/`, { headers: headers() });
      if (!listRes.ok) throw new Error(`Không tải được bảng điểm đã nhập (HTTP ${listRes.status})`);
      const list = await listRes.json();
      const imported = list.filter((item: any) => item.status === "IMPORTED");
      const matching = imported.filter((item: any) =>
        item.school_year === year && item.semester === semester,
      );
      if (!matching.length) {
        const availablePeriods = Array.from(new Set(
          imported
            .filter((item: any) => item.school_year && item.semester)
            .map((item: any) => `${item.semester} · ${item.school_year}`),
        ));
        setTranscripts([]);
        setTranscriptNotice(
          availablePeriods.length
            ? `Không có bảng điểm đã import cho ${semester} · ${year}. Kỳ đang có dữ liệu: ${availablePeriods.join(", ")}.`
            : "Chưa có bảng điểm nào hoàn tất import.",
        );
        return;
      }
      const details = await Promise.all(
        matching.map(async (item: any) => {
          const response = await fetch(`${API_URL}/transcripts/${item.id}/`, { headers: headers() });
          if (!response.ok) throw new Error(`Không tải được chi tiết bảng điểm (HTTP ${response.status})`);
          return response.json();
        }),
      );
      const map = new Map<string, TranscriptItem>();
      details.flatMap((item: any) => item.items || item.students || []).forEach((item: any) => {
        if (item.student_code) map.set(item.student_code, {
          student_code: item.student_code,
          gpa: Number(item.gpa),
          classification: item.classification || "",
        });
      });
      setTranscripts([...map.values()]);
      setTranscriptNotice("");
    } catch (error) {
      setTranscripts([]);
      setTranscriptNotice(error instanceof Error ? error.message : "Không kiểm tra được dữ liệu xếp loại học lực");
      toast.error(error instanceof Error ? error.message : "Không kiểm tra được dữ liệu xếp loại học lực");
    } finally {
      setTranscriptLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3) loadTranscriptData();
  }, [step, semester, year]);

  const calculateScores = () => {
    setCalculating(true);
    window.setTimeout(() => {
      const transcriptMap = new Map(transcripts.map((item) => [item.student_code, item]));
      const academicCriterion = criteria.find((criterion) => {
        const name = normalizeSearch(criterion.name);
        return name.includes("hoc luc") || name.includes("hoc tap") || name.includes("academic");
      }) || criteria[0];
      const rows = scopedStudents.map<ScoreRow>((student) => {
        const criterionScores: Record<number, number> = {};
        const rawCriterionScores: Record<number, number> = {};
        criteria.forEach((criterion) => {
          criterionScores[criterion.id] = 0;
          rawCriterionScores[criterion.id] = 0;
        });
        const record = transcriptMap.get(student.student_id);
        if (academicCriterion) {
          rawCriterionScores[academicCriterion.id] = academicPoints(record?.gpa ?? null);
        }
        let attendanceCount = 0;
        activities.forEach((activity) => {
          const attended = (activity.participants || []).some(
            (participant) => participant.student_id === student.student_id && participant.status === "attended",
          );
          if (attended && rawCriterionScores[activity.criterion] !== undefined) {
            rawCriterionScores[activity.criterion] += activity.points;
            attendanceCount += 1;
          }
        });
        criteria.forEach((criterion) => {
          criterionScores[criterion.id] = Math.max(
            0,
            Math.min(criterion.max_score, rawCriterionScores[criterion.id]),
          );
        });
        const rawTotal = Object.values(rawCriterionScores).reduce((sum, value) => sum + value, 0);
        const total = Object.values(criterionScores).reduce((sum, value) => sum + value, 0);
        return {
          ...student,
          gpa: record?.gpa ?? null,
          academicClassification: record?.classification || "Chưa có dữ liệu",
          attendanceCount,
          criterionScores,
          rawCriterionScores,
          rawTotal,
          surplus: Math.max(0, rawTotal - maximumSessionScore),
          total,
          classification: classifyScore(total),
        };
      });
      setScores(rows);
      setCalculating(false);
      toast.success(`Đã tính điểm tự động cho ${rows.length} sinh viên`);
    }, 650);
  };

  useEffect(() => {
    if (
      step === 4
      && !transcriptLoading
      && !scores.length
      && scopedStudents.length
    ) {
      calculateScores();
    }
  }, [step, transcriptLoading]);

  const changeCriterionScore = (studentId: string, criterionId: number, nextScore: number) => {
    setScores((current) => current.map((row) => {
      if (row.student_id !== studentId) return row;
      // Rows calculated before this field was introduced can still survive
      // during Vite HMR. Fall back to the capped criterion values.
      const rawCriterionScores = {
        ...(row.rawCriterionScores || row.criterionScores || {}),
      };
      const criterionScores = { ...row.criterionScores };
      const criterion = criteria.find((item) => item.id === criterionId);
      if (!criterion) return row;
      rawCriterionScores[criterionId] = Math.max(
        0,
        Number.isFinite(nextScore) ? nextScore : 0,
      );
      criterionScores[criterionId] = Math.max(
        0,
        Math.min(criterion.max_score, rawCriterionScores[criterionId]),
      );
      const actualTotal = Object.values(criterionScores).reduce((sum, value) => sum + value, 0);
      const rawTotal = Object.values(rawCriterionScores).reduce((sum, value) => sum + value, 0);
      return {
        ...row,
        criterionScores,
        rawCriterionScores,
        rawTotal,
        surplus: Math.max(0, rawTotal - maximumSessionScore),
        total: actualTotal,
        classification: classifyScore(actualTotal),
      };
    }));
  };

  const validateStep = () => {
    if (step === 0 && !scopedStudents.length) {
      toast.error("Phạm vi hiện chưa có sinh viên");
      return false;
    }
    if (step === 1 && !criteriaSetId) {
      toast.error("Vui lòng chọn bộ tiêu chí");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step === 3 && transcriptLoading) {
      toast.info("Đang tải dữ liệu học lực, vui lòng đợi trong giây lát.");
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const saveSession = async () => {
    if (!scores.length) return;
    try {
      setSaving(true);
      setSavedCount(0);
      let completed = 0;
      // SQLite only permits one writer at a time. Keep these requests strictly
      // sequential and retry transient server/database lock errors.
      for (const row of scores) {
        const detailScores: Record<string, number> = {};
        criteria.forEach((criterion) => {
          const firstSubItem = (criterion.groups || []).flatMap((group) => group.subItems || [])[0];
          if (firstSubItem) detailScores[String(firstSubItem.id)] = row.criterionScores[criterion.id] || 0;
        });

        const payload = {
          studentId: row.student_id,
          semester,
          year,
          criteriaSet: criteriaSetId,
          academicGpa: row.gpa,
          academicClassification: row.academicClassification === "Chưa có dữ liệu" ? "" : row.academicClassification,
          rawScore: row.rawTotal,
          scores: detailScores,
          status: "draft",
          note: "Khởi tạo tự động từ phiên đánh giá",
        };

        let response: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch(`${API_URL}/evaluations/`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(payload),
          });
          if (response.ok) break;
          if (response.status < 500 || attempt === 2) break;
          await wait(300 * (attempt + 1));
        }

        if (!response?.ok) {
          let backendMessage = "";
          try {
            const errorData = await response?.json();
            backendMessage = errorData?.detail || errorData?.error || "";
          } catch {
            backendMessage = "";
          }
          throw new Error(
            backendMessage
              ? `Không lưu được ${row.student_id}: ${backendMessage}`
              : `Không lưu được ${row.student_id} (HTTP ${response?.status || "mất kết nối"})`,
          );
        }
        completed += 1;
        setSavedCount(completed);
      }
      toast.success(`Đã lưu phiên và tạo ${completed} phiếu đánh giá nháp`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu phiên không thành công");
    } finally {
      setSaving(false);
    }
  };

  const renderScope = () => (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thông tin kỳ đánh giá</CardTitle>
          <CardDescription>Chọn học kỳ, năm học và cách xác định nhóm sinh viên.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Học kỳ</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HK1">Học kỳ 1</SelectItem>
                  <SelectItem value="HK2">Học kỳ 2</SelectItem>
                  <SelectItem value="HK3">Học kỳ hè</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Năm học</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{getAcademicYears().map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phạm vi áp dụng</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toàn trường</SelectItem>
                <SelectItem value="faculty">Theo khoa</SelectItem>
                <SelectItem value="class">Theo lớp học</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope !== "all" && (
            <div className="space-y-2">
              <Label>Khoa</Label>
              <Select value={faculty} onValueChange={(value) => { setFaculty(value); setSelectedClasses([]); }}>
                <SelectTrigger><SelectValue placeholder="Chọn khoa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khoa</SelectItem>
                  {faculties.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Sinh viên trong phạm vi</p>
            <p className="mt-1 text-3xl font-bold text-primary">{scopedStudents.length}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{scope === "class" ? "Chọn lớp áp dụng" : "Xem trước phạm vi"}</CardTitle>
          <CardDescription>{scope === "class" ? "Có thể chọn đồng thời nhiều lớp." : "Các lớp và số lượng sinh viên sẽ được đưa vào phiên."}</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[390px] space-y-2 overflow-y-auto">
          {visibleClasses.map((item) => {
            const count = students.filter((student) => student.class_name === item.name).length;
            return (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                {scope === "class" && (
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(item.name)}
                    onChange={(event) => toggleClass(item.name, event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.faculty} · Khóa {item.cohort}</p>
                </div>
                <Badge variant="secondary">{count} SV</Badge>
              </label>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  const renderCriteria = () => (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-lg">Bộ tiêu chí áp dụng</CardTitle><CardDescription>Bộ tiêu chí được khóa theo phiên sau khi lưu.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Select value={criteriaSetId} onValueChange={setCriteriaSetId}>
            <SelectTrigger><SelectValue placeholder="Chọn bộ tiêu chí" /></SelectTrigger>
            <SelectContent>{criteriaSets.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          {selectedSet && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Học kỳ</span><strong>{selectedSet.semester || "Dùng chung"}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Số tiêu chí</span><strong>{selectedSet.criteria_count}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Điểm tối đa</span><strong>{selectedSet.total_max_score}</strong></div>
              {selectedSet.is_active && <Badge className="bg-success/15 text-success hover:bg-success/15"><Check className="mr-1 h-3 w-3" />Đang áp dụng</Badge>}
            </div>
          )}
          {criteriaSetPeriodMismatch && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-700">
              Bộ tiêu chí đang chọn dành cho {selectedSet?.semester} · {selectedSet?.academic_year},
              khác kỳ đánh giá {semester} · {year}. Điểm vẫn được tính theo bộ này; hãy kiểm tra lại trước khi lưu.
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Cấu trúc tính điểm</CardTitle><CardDescription>{criteria.length} nhóm tiêu chí cấp I.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {criteria.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{item.code}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.groups.length} nhóm tiêu chí con</p></div>
              <Badge variant="outline">Tối đa {item.max_score}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderAttendance = () => (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div><CardTitle className="text-lg">Dữ liệu điểm danh hoạt động</CardTitle><CardDescription>Hệ thống đối chiếu người tham gia đã xác nhận với phạm vi sinh viên.</CardDescription></div>
        <Badge className="bg-success/15 text-success hover:bg-success/15">{matchedAttendance} lượt hợp lệ</Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Hoạt động</TableHead><TableHead>Tiêu chí</TableHead><TableHead>Điểm</TableHead><TableHead>Đã điểm danh</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
          <TableBody>
            {activities.map((activity) => {
              const studentIds = new Set(scopedStudents.map((item) => item.student_id));
              const attended = (activity.participants || []).filter((item) => studentIds.has(item.student_id) && item.status === "attended").length;
              return <TableRow key={activity.id}><TableCell className="font-medium">{activity.title}</TableCell><TableCell>{criteria.find((item) => item.id === activity.criterion)?.code || "-"}</TableCell><TableCell>+{activity.points}</TableCell><TableCell>{attended}</TableCell><TableCell><Badge variant="outline" className={attended ? "border-success/20 bg-success/10 text-success" : ""}>{attended ? "Sẵn sàng" : "Không có dữ liệu"}</Badge></TableCell></TableRow>;
            })}
            {!activities.length && <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Chưa có hoạt động để đối chiếu.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderAcademic = () => {
    const transcriptMap = new Map(transcripts.map((item) => [item.student_code, item]));
    return (
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div><CardTitle className="text-lg">Dữ liệu xếp loại học lực</CardTitle><CardDescription>Đối chiếu bảng điểm đã nhập cho {semester} · {year}.</CardDescription></div>
          <Button variant="outline" size="sm" onClick={loadTranscriptData} disabled={transcriptLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", transcriptLoading && "animate-spin")} />
            {transcriptLoading ? "Đang tải..." : "Kiểm tra lại"}
          </Button>
        </CardHeader>
        <CardContent>
          {transcriptNotice && (
            <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-700">
              {transcriptNotice}
            </div>
          )}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Trong phạm vi" value={scopedStudents.length} />
            <Stat label="Đã có học lực" value={matchedTranscriptCount} tone="success" />
            <Stat label="Thiếu dữ liệu" value={scopedStudents.length - matchedTranscriptCount} tone="warning" />
          </div>
          <div className="max-h-[340px] overflow-y-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow><TableHead>Mã SV</TableHead><TableHead>Họ tên</TableHead><TableHead>Lớp</TableHead><TableHead>GPA</TableHead><TableHead>Xếp loại</TableHead></TableRow></TableHeader>
              <TableBody>{scopedStudents.slice(0, 100).map((student) => {
                const record = transcriptMap.get(student.student_id);
                return <TableRow key={student.id}><TableCell>{student.student_id}</TableCell><TableCell className="font-medium">{student.full_name}</TableCell><TableCell>{student.class_name}</TableCell><TableCell>{record?.gpa ?? "-"}</TableCell><TableCell><Badge variant="outline" className={record ? "border-success/20 bg-success/10 text-success" : "text-muted-foreground"}>{record?.classification || "Chưa có dữ liệu"}</Badge></TableCell></TableRow>;
              })}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCalculation = () => (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><Sparkles className={cn("h-8 w-8", calculating && "animate-pulse")} /></div>
        <h2 className="mt-4 text-2xl font-bold">Tổng hợp điểm tự động</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Điểm học lực và hoạt động đã điểm danh được ánh xạ vào đúng nhóm tiêu chí, đồng thời giới hạn theo điểm tối đa.</p>
        <Button className="mt-5 bg-gradient-primary" onClick={calculateScores} disabled={calculating}>
          {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {scores.length ? "Tính lại điểm" : "Bắt đầu tính điểm"}
        </Button>
      </div>
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sinh viên" value={scores.length || scopedStudents.length} />
        <Stat label="Có điểm học lực" value={scores.filter((item) => item.gpa !== null).length} tone="success" />
        <Stat label="Có điểm hoạt động" value={scores.filter((item) => item.attendanceCount > 0).length} tone="success" />
        <Stat label="Cần review" value={scores.filter((item) => item.gpa === null).length} tone="warning" />
        <Stat label="Điểm trung bình" value={averageCalculatedScore} tone="primary" />
      </CardContent>
    </Card>
  );

  const renderReview = () => (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle className="text-lg">Review kết quả tính điểm</CardTitle><CardDescription>Điều chỉnh trực tiếp từng tiêu chí; tổng điểm và xếp loại được cập nhật tự động.</CardDescription></div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã SV, họ tên, lớp..." /></div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[440px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-48 bg-background">Sinh viên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>GPA</TableHead>
                {criteria.map((criterion) => (
                  <TableHead key={criterion.id} className="min-w-28 text-center">
                    <span className="block font-bold">{criterion.code}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Tối đa {criterion.max_score}</span>
                  </TableHead>
                ))}
                <TableHead className="min-w-24 text-center">Tổng điểm</TableHead>
                <TableHead>Điểm dư</TableHead>
                <TableHead>Xếp loại rèn luyện</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScores.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="sticky left-0 z-10 bg-background">
                    <p className="font-medium">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.student_id}</p>
                  </TableCell>
                  <TableCell>{row.class_name}</TableCell>
                  <TableCell className="font-semibold">{row.gpa ?? "-"}</TableCell>
                  {criteria.map((criterion) => (
                    <TableCell key={criterion.id} className="text-center">
                      <Input
                        type="number"
                        min={0}
                        className="mx-auto h-8 w-20 text-center font-bold"
                        value={row.rawCriterionScores?.[criterion.id] ?? row.criterionScores?.[criterion.id] ?? 0}
                        onChange={(event) => changeCriterionScore(
                          row.student_id,
                          criterion.id,
                          Number(event.target.value),
                        )}
                        aria-label={`${row.student_id} - tiêu chí ${criterion.code}`}
                      />
                      {(row.rawCriterionScores?.[criterion.id] ?? row.criterionScores?.[criterion.id] ?? 0) > criterion.max_score && (
                        <span className="mt-1 block text-[10px] font-medium text-cyan-700">
                          +{(row.rawCriterionScores?.[criterion.id] ?? row.criterionScores?.[criterion.id] ?? 0) - criterion.max_score} vượt trần
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center text-base font-bold text-primary">{row.total}</TableCell>
                  <TableCell>{row.surplus > 0 ? <Badge className="bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/10">+{row.surplus}</Badge> : "-"}</TableCell>
                  <TableCell><ClassificationBadge value={row.classification} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderSave = () => (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success"><Save className="h-7 w-7" /></div>
        <CardTitle className="text-2xl">Sẵn sàng lưu phiên đánh giá</CardTitle>
        <CardDescription>Hệ thống sẽ tạo phiếu điểm nháp cho toàn bộ sinh viên trong phạm vi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryLine label="Kỳ đánh giá" value={`${semester} · ${year}`} />
          <SummaryLine label="Bộ tiêu chí" value={selectedSet?.name || "-"} />
          <SummaryLine label="Số sinh viên" value={`${scores.length} sinh viên`} />
          <SummaryLine label="Trạng thái sau lưu" value="Phiếu nháp" />
        </div>
        {saving && <div className="space-y-2"><div className="flex justify-between text-sm"><span>Đang tạo phiếu đánh giá...</span><strong>{savedCount}/{scores.length}</strong></div><Progress value={(savedCount / scores.length) * 100} /></div>}
        {!saving && savedCount === scores.length && scores.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-success/10 p-4 text-success sm:flex-row sm:items-center">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="flex-1 font-medium">Phiên đã được lưu thành công.</span>
          </div>
        )}
        <Button className="h-12 w-full bg-gradient-primary text-base" onClick={saveSession} disabled={saving || !scores.length || savedCount === scores.length}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {savedCount === scores.length && scores.length ? "Đã lưu phiên" : "Lưu và tạo phiếu đánh giá"}
        </Button>
      </CardContent>
    </Card>
  );

  const contents = [renderScope, renderCriteria, renderAttendance, renderAcademic, renderCalculation, renderReview, renderSave];

  if (loading) return <div className="flex min-h-[450px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Điểm rèn luyện</span><ChevronRight className="h-4 w-4" /><span>Tạo phiên mới</span></div>
        <h1 className="mt-2 text-3xl font-bold">Tạo phiên điểm rèn luyện</h1>
        <p className="mt-1 text-muted-foreground">Thiết lập phạm vi, kiểm tra dữ liệu và khởi tạo điểm theo từng bước.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 sm:p-5">
          <div className="flex overflow-x-auto pb-1">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const completed = index < step;
              const active = index === step;
              return (
                <button key={item.title} onClick={() => index <= step && setStep(index)} className={cn("group flex min-w-[150px] flex-1 items-center", index > step && "cursor-default")}>
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors", completed && "border-primary bg-primary text-primary-foreground", active && "border-primary bg-primary/10 text-primary", index > step && "border-muted bg-muted/40 text-muted-foreground")}>{completed ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}</span>
                  <span className="ml-2 min-w-0 text-left"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Bước {index + 1}</span><span className={cn("block truncate text-xs font-semibold", active && "text-primary")}>{item.short}</span></span>
                  {index < steps.length - 1 && <span className={cn("mx-3 h-0.5 min-w-4 flex-1", index < step ? "bg-primary" : "bg-border")} />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Bước {step + 1} / {steps.length}</p><h2 className="mt-1 text-xl font-bold">{steps[step].title}</h2></div>
        <Badge variant="outline">{scopedStudents.length} sinh viên</Badge>
      </div>

      {contents[step]()}

      <div className="flex justify-between border-t pt-5">
        <Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving}><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
        {step < steps.length - 1 && (
          <Button
            onClick={goNext}
            disabled={(step === 4 && calculating) || (step === 3 && transcriptLoading)}
          >
            {step === 3 && transcriptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tiếp tục<ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "success" | "warning" }) {
  const colors = { primary: "text-primary bg-primary/5", success: "text-success bg-success/5", warning: "text-amber-600 bg-amber-500/5" };
  return <div className={cn("rounded-xl border p-4", colors[tone])}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function ClassificationBadge({ value }: { value: string }) {
  const style = value === "Xuất sắc" || value === "Tốt"
    ? "border-success/20 bg-success/10 text-success"
    : value === "Khá" || value === "Trung bình"
      ? "border-primary/20 bg-primary/10 text-primary"
      : "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return <Badge variant="outline" className={style}>{value}</Badge>;
}
