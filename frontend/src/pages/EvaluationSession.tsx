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
  UploadCloud,
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
import Loading from "./Loading";
import { RadialTimePicker } from "./Activities";

type SchoolClass = { id: number; name: string; faculty: string; cohort: string; student_count?: number };
type Student = { id: number; student_id: string; full_name: string; class_name: string; faculty: string; cohort: string };
type CriteriaSet = { id: number; name: string; semester: string; academic_year: string; is_active: boolean; criteria_count: number; total_max_score: number };
type Criterion = {
  id: number;
  code: string;
  name: string;
  max_score: number;
  is_manual?: boolean;
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

type EvaluationSessionRecord = {
  id: number;
  semester: string;
  year?: string | null;
  status: string;
  started_at: string;
  last_active: string;
  evaluation?: number | null;
  student?: number | null;
  created?: boolean;
};

const steps = [
  { title: "Phạm vi sinh viên", short: "Phạm vi", icon: Users },
  { title: "Chọn bộ tiêu chí", short: "Tiêu chí", icon: BookOpenCheck },
  { title: "Kiểm tra điểm danh", short: "Điểm danh", icon: ClipboardCheck },
  { title: "Hoạt động tham gia", short: "Hoạt động", icon: Database },
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
  const base = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = 2023; y <= base; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years;
};

const classifyScore = (score: number) => {
  if (score >= 90) return "Xuất sắc";
  if (score >= 80) return "Giỏi";
  if (score >= 65) return "Khá";
  if (score >= 50) return "Trung bình";
  if (score >= 35) return "Yếu";
  return "Kém";
};

const classifyAcademicGpa = (gpa: number | null): string => {
  if (gpa === null) return "Chưa có dữ liệu";
  if (gpa >= 3.6) return "Xuất sắc";
  if (gpa >= 3.2) return "Giỏi";
  if (gpa >= 2.5) return "Khá";
  if (gpa >= 2.0) return "Trung bình";
  if (gpa >= 1.0) return "Yếu";
  return "Kém";
};

const academicPoints = (gpa: number | null) => {
  if (gpa === null) return 0;
  if (gpa >= 3.6) return 10;
  if (gpa >= 3.2) return 8;
  if (gpa >= 2.5) return 6;
  if (gpa >= 2.0) return 4;
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
  const yearsList = getAcademicYears();
  const [year, setYear] = useState(yearsList[yearsList.length - 1] || "");
  const [criteriaSetId, setCriteriaSetId] = useState("");
  const [selfAssessmentStartDate, setSelfAssessmentStartDate] = useState("");
  const [selfAssessmentStartTime, setSelfAssessmentStartTime] = useState("08:00");
  const [selfAssessmentEndDate, setSelfAssessmentEndDate] = useState("");
  const [selfAssessmentEndTime, setSelfAssessmentEndTime] = useState("17:00");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'selfStart' | 'selfEnd'>('selfStart');
  const [query, setQuery] = useState("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [importedAttendance, setImportedAttendance] = useState<Record<string, { attended: number; absent: number }>>({});
  const [evaluationSession, setEvaluationSession] = useState<EvaluationSessionRecord | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

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
        const preferred = setData.find((item: CriteriaSet) => item.is_active)
          || matchingSet
          || setData[0];
        if (preferred) {
          setCriteriaSetId(String(preferred.id));
        }
        if (preferred && preferred.is_active && preferred.semester && preferred.academic_year) {
          setSemester(preferred.semester);
          setYear(preferred.academic_year);
        } else if (latestImportedPeriod) {
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
    if (loading || !semester || !year) return;

    const startWorkspaceSession = async () => {
      try {
        setSessionLoading(true);
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}/evaluations/session/start/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            semester,
            year,
          }),
        });
        if (response.ok) {
          const sessionData = await response.json();
          setEvaluationSession(sessionData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setSessionLoading(false);
      }
    };

    startWorkspaceSession();
  }, [loading, semester, year, criteriaSetId]);

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
  const sessionLastActiveLabel = evaluationSession?.last_active
    ? new Date(evaluationSession.last_active).toLocaleString("vi-VN")
    : "";

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
      const newImportedAttendance: Record<string, { attended: number; absent: number }> = {};
      details.flatMap((item: any) => item.items || item.students || []).forEach((item: any) => {
        if (item.student_code) {
          const gpaVal = Number(item.gpa);
          map.set(item.student_code, {
            student_code: item.student_code,
            gpa: gpaVal,
            classification: classifyAcademicGpa(gpaVal),
          });
          const absentCount = item.absent_sessions || 0;
          newImportedAttendance[item.student_code] = {
            attended: Math.max(0, 10 - absentCount),
            absent: absentCount,
          };
        }
      });
      setTranscripts([...map.values()]);
      setImportedAttendance(newImportedAttendance);
      setTranscriptNotice("");
    } catch (error) {
      setTranscripts([]);
      setTranscriptNotice(error instanceof Error ? error.message : "Không kiểm tra được dữ liệu xếp loại học lực");
      toast.error(error instanceof Error ? error.message : "Không kiểm tra được dữ liệu xếp loại học lực");
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleImportAttendance = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const newImported: Record<string, { attended: number; absent: number }> = {};
      lines.forEach((line) => {
        const parts = line.split(",");
        if (parts.length >= 2) {
          const studentId = parts[0].trim();
          const attended = parseInt(parts[1].trim()) || 0;
          const absent = parseInt(parts[2]?.trim()) || 0;
          if (studentId) {
            newImported[studentId] = { attended, absent };
          }
        }
      });
      setImportedAttendance(newImported);
      toast.success(`Đã import dữ liệu điểm danh cho ${Object.keys(newImported).length} sinh viên`);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (step === 3 || step === 0) loadTranscriptData();
  }, [step, semester, year]);

  useEffect(() => {
    if (!evaluationSession?.id) return;
    const timer = window.setInterval(async () => {
      try {
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${API_URL}/evaluations/session/${evaluationSession.id}/heartbeat/`, {
          method: "PATCH",
          headers,
        });
        if (response.ok) {
          const nextSession = await response.json();
          setEvaluationSession(nextSession);
        }
      } catch (error) {
        console.error(error);
      }
    }, 60000);

    return () => window.clearInterval(timer);
  }, [evaluationSession?.id]);

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
        if (academicCriterion && !academicCriterion.is_manual) {
          rawCriterionScores[academicCriterion.id] = academicPoints(record?.gpa ?? null);
        }
        const custom = importedAttendance[student.student_id];
        if (custom) {
          // Find class attendance or chuyên cần criterion
          const attendanceCriterion = criteria.find(c => {
            const name = normalizeSearch(c.name);
            return name.includes("di hoc") || name.includes("chuyen can") || name.includes("y thuc hoc tap");
          });
          if (attendanceCriterion) {
            // Assume 1 point deduction per absent session
            const score = Math.max(0, attendanceCriterion.max_score - custom.absent);
            rawCriterionScores[attendanceCriterion.id] = score;
          }
        }

        // Always check database activities for activity points
        let attendanceCount = 0;
        activities.forEach((activity) => {
          const attended = (activity.participants || []).some(
            (participant) => participant.student_id === student.student_id && participant.status === "attended",
          );
          const activityCriterion = criteria.find((criterion) => criterion.id === activity.criterion);
          if (attended && rawCriterionScores[activity.criterion] !== undefined && !activityCriterion?.is_manual) {
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
    if (step === 0) {
      if (!scopedStudents.length) {
        toast.error("Phạm vi hiện chưa có sinh viên");
        return false;
      }
      if (matchedTranscriptCount < scopedStudents.length) {
        toast.error("Chưa đủ dữ liệu học lực của sinh viên. Vui lòng import bảng điểm trước.");
        return false;
      }
      if (Object.keys(importedAttendance).length === 0) {
        toast.error("Chưa có dữ liệu điểm danh lớp học. Vui lòng import dữ liệu điểm danh trước.");
        return false;
      }
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
    const selfAssessmentStart = selfAssessmentStartDate ? `${selfAssessmentStartDate}T${selfAssessmentStartTime || "00:00"}` : "";
    const selfAssessmentDeadline = selfAssessmentEndDate ? `${selfAssessmentEndDate}T${selfAssessmentEndTime || "23:59"}` : "";
    try {
      setSaving(true);
      setSavedCount(0);

      // 1. Prepare all student payloads
      const payloads = scores.map((row) => {
        const detailScores: Record<string, number> = {};
        criteria.forEach((criterion) => {
          const isAcademic = normalizeSearch(criterion.name).includes("hoc luc") || normalizeSearch(criterion.name).includes("hoc tap");
          if (isAcademic) {
            const subItems = (criterion.groups || []).flatMap((group) => group.subItems || []);
            const matchedSubItem = subItems.find(sub => {
              const subName = normalizeSearch(sub.name);
              const classif = normalizeSearch(row.academicClassification);
              return subName.includes(classif) || classif.includes(subName);
            }) || subItems[0];
            if (matchedSubItem) {
              detailScores[String(matchedSubItem.id)] = row.criterionScores[criterion.id] || 0;
            }
          } else {
            const firstSubItem = (criterion.groups || []).flatMap((group) => group.subItems || [])[0];
            if (firstSubItem) detailScores[String(firstSubItem.id)] = row.criterionScores[criterion.id] || 0;
          }
        });

        return {
          studentId: row.student_id,
          semester,
          year,
          criteriaSet: criteriaSetId,
          academicGpa: row.gpa,
          academicClassification: row.academicClassification === "Chưa có dữ liệu" ? "" : row.academicClassification,
          rawScore: row.rawTotal,
          scores: detailScores,
          status: "published",
          note: "",
        };
      });

      // Save configuration for self assessment period
      if (selfAssessmentStart) {
        await fetch(`${API_URL}/configs/set-value/`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ key: "self_assessment_start", value: selfAssessmentStart, description: "Thời gian bắt đầu tự đánh giá" }),
        });
      }
      if (selfAssessmentDeadline) {
        await fetch(`${API_URL}/configs/set-value/`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ key: "self_assessment_deadline", value: selfAssessmentDeadline, description: "Hạn chót tự đánh giá và khiếu nại" }),
        });
      }

      // 2. Post to bulk-init endpoint
      const initResponse = await fetch(`${API_URL}/evaluations/bulk-init/`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payloads),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData?.detail || "Không thể khởi động tiến trình tạo phiếu hàng loạt.");
      }

      const jobData = await initResponse.json();
      const jobId = jobData.jobId;

      // 3. Poll status
      const pollInterval = 1000;
      let fakeProgress = 0;
      const fakeInterval = window.setInterval(() => {
        if (fakeProgress < payloads.length - 1) {
          fakeProgress += 1;
          setSavedCount(fakeProgress);
        }
      }, 150);

      return new Promise<void>((resolve, reject) => {
        const cleanUp = () => {
          window.clearInterval(fakeInterval);
        };
        const checkStatus = async () => {
          try {
            const statusResponse = await fetch(`${API_URL}/evaluations/bulk-job/${jobId}/`, {
              headers: headers(),
            });

            if (!statusResponse.ok) {
              cleanUp();
              reject(new Error("Lỗi khi kiểm tra tiến trình tạo phiếu."));
              return;
            }

            const currentJob = await statusResponse.json();
            if (currentJob.progress && currentJob.progress > fakeProgress) {
              fakeProgress = currentJob.progress;
              setSavedCount(fakeProgress);
            }

            if (currentJob.status === "SUCCESS") {
              cleanUp();
              setSavedCount(scores.length);
              toast.success(`Đã lưu phiên và tạo ${currentJob.total} phiếu đánh giá nháp thành công!`);
              setSaving(false);
              resolve();
            } else if (currentJob.status === "FAILED") {
              cleanUp();
              reject(new Error(currentJob.errorMessage || "Tiến trình tạo phiếu thất bại trên server."));
            } else {
              // Still running or pending, check again
              setTimeout(checkStatus, pollInterval);
            }
          } catch (err) {
            cleanUp();
            reject(err);
          }
        };
        setTimeout(checkStatus, pollInterval);
      });

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu phiên không thành công");
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
                  {(() => {
                    const now = new Date();
                    const currentYear = now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                    const currentYearStr = `${currentYear}-${currentYear + 1}`;
                    if (year !== currentYearStr) {
                      return (
                        <>
                          <SelectItem value="HK1">Học kỳ 1</SelectItem>
                          <SelectItem value="HK2">Học kỳ 2</SelectItem>
                          <SelectItem value="HK3">Học kỳ 3</SelectItem>
                        </>
                      );
                    }
                    const month = now.getMonth() + 1;
                    if (month >= 8 && month <= 12) {
                      return <SelectItem value="HK1">Học kỳ 1</SelectItem>;
                    } else if (month >= 1 && month <= 3) {
                      return (
                        <>
                          <SelectItem value="HK1">Học kỳ 1</SelectItem>
                          <SelectItem value="HK2">Học kỳ 2</SelectItem>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <SelectItem value="HK1">Học kỳ 1</SelectItem>
                          <SelectItem value="HK2">Học kỳ 2</SelectItem>
                          <SelectItem value="HK3">Học kỳ 3</SelectItem>
                        </>
                      );
                    }
                  })()}
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
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Sinh viên trong phạm vi</p>
              <p className="mt-1 text-3xl font-bold text-primary">{scopedStudents.length}</p>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Dữ liệu học lực:</span>
                <Badge variant={matchedTranscriptCount === scopedStudents.length && scopedStudents.length > 0 ? "success" : "warning"}>
                  {matchedTranscriptCount} / {scopedStudents.length} SV
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Dữ liệu điểm danh lớp học:</span>
                <Badge variant={Object.keys(importedAttendance).length > 0 ? "success" : "warning"}>
                  {Object.keys(importedAttendance).length > 0 ? `Đã có (${Object.keys(importedAttendance).length} SV)` : "Chưa có"}
                </Badge>
              </div>
            </div>
            {(scopedStudents.length === 0 || matchedTranscriptCount < scopedStudents.length || Object.keys(importedAttendance).length === 0) && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs rounded-lg p-3 space-y-2">
                <p className="font-semibold">⚠️ Thiếu dữ liệu tạo phiên:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {scopedStudents.length === 0 && (
                    <li>Chưa có sinh viên trong phạm vi đã chọn.</li>
                  )}
                  {scopedStudents.length > 0 && matchedTranscriptCount < scopedStudents.length && (
                    <li>Thiếu dữ liệu học lực (mới có {matchedTranscriptCount}/{scopedStudents.length} SV).</li>
                  )}
                  {Object.keys(importedAttendance).length === 0 && (
                    <li>Thiếu dữ liệu điểm danh lớp học.</li>
                  )}
                </ul>
                <p>Bạn cần import thêm dữ liệu để có thể chuyển sang bước tiếp theo.</p>
                <div className="flex gap-2 pt-1">
                  <a href="/academic-transcript-import" target="_blank" className="underline font-bold text-primary hover:text-primary-glow">Import học lực</a>
                  <span>·</span>
                  <a href="/academic-transcript-import?tab=attendance" target="_blank" className="underline font-bold text-primary hover:text-primary-glow">Import điểm danh</a>
                </div>
              </div>
            )}
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
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Dữ liệu điểm danh lớp học</CardTitle>
          <CardDescription>Bảng thống kê số buổi đi học (số buổi có mặt) và số buổi vắng học của sinh viên trong kỳ học.</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-success/15 text-success hover:bg-success/15">
            {Object.keys(importedAttendance).length > 0 ? "Đã nhập file" : "Chờ nhập dữ liệu"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[340px] overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="text-center">Số buổi đi học</TableHead>
                <TableHead className="text-center">Số buổi vắng học</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedStudents.map((student) => {
                const custom = importedAttendance[student.student_id];
                const attended = custom ? custom.attended : 0;
                const absent = custom ? custom.absent : 0;
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">{student.student_id}</TableCell>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell className="text-center font-bold text-success">{attended}</TableCell>
                    <TableCell className="text-center font-bold text-destructive">{absent}</TableCell>
                  </TableRow>
                );
              })}
              {!scopedStudents.length && <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Chưa có sinh viên để đối chiếu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderStudentActivities = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Danh sách hoạt động tham gia của sinh viên</CardTitle>
        <CardDescription>Các hoạt động mà sinh viên đã tham gia trong học kỳ.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[440px] overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Các hoạt động đã tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedStudents.map((student) => {
                const attendedActivities = activities.filter(a =>
                  (a.participants || []).some(p => p.student_id === student.student_id && p.status === "attended")
                );
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono">{student.student_id}</TableCell>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>
                      {attendedActivities.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                          {attendedActivities.map((act) => (
                            <Badge key={act.id} variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-200/50">
                              {act.title}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa tham gia hoạt động ngoại khóa nào</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!scopedStudents.length && <TableRow><TableCell colSpan={4} className="h-28 text-center text-muted-foreground">Chưa có sinh viên để đối chiếu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

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
                    {criterion.is_manual && <span className="block text-[10px] font-normal text-amber-600">SV tự đánh giá</span>}
                  </TableHead>
                ))}
                <TableHead className="min-w-24 text-center">Tổng điểm</TableHead>
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
                        disabled={criterion.is_manual}
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
        <CardTitle className="text-2xl">Sẵn sàng công bố & lưu phiên</CardTitle>
        <CardDescription>Hệ thống sẽ khởi tạo và công bố phiếu điểm cho toàn bộ sinh viên trong phạm vi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryLine label="Kỳ đánh giá" value={`${semester} · ${year}`} />
          <SummaryLine label="Bộ tiêu chí" value={selectedSet?.name || "-"} />
          <SummaryLine label="Số sinh viên" value={`${scores.length} sinh viên`} />
          <SummaryLine label="Trạng thái sau lưu" value="Đã công bố" />
        </div>

        <div className="grid gap-4 border p-4 rounded-xl bg-muted/20">
          <p className="font-semibold text-sm text-primary flex items-center gap-1.5">⏰ Hạn tự đánh giá & khiếu nại của sinh viên</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bắt đầu từ</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={selfAssessmentStartDate}
                  onChange={(e) => setSelfAssessmentStartDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="h-9 text-xs"
                />
                <Input
                  type="text"
                  value={selfAssessmentStartTime}
                  readOnly
                  onClick={() => { setTimePickerTarget('selfStart'); setIsTimePickerOpen(true); }}
                  className="cursor-pointer font-mono h-9 text-xs text-center"
                  placeholder="Chọn giờ"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hạn chót (kết thúc)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={selfAssessmentEndDate}
                  onChange={(e) => setSelfAssessmentEndDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="h-9 text-xs"
                />
                <Input
                  type="text"
                  value={selfAssessmentEndTime}
                  readOnly
                  onClick={() => { setTimePickerTarget('selfEnd'); setIsTimePickerOpen(true); }}
                  className="cursor-pointer font-mono h-9 text-xs text-center"
                  placeholder="Chọn giờ"
                />
              </div>
            </div>
          </div>
        </div>

        {saving && <div className="space-y-2"><div className="flex justify-between text-sm"><span>Đang công bố phiếu đánh giá...</span><strong>{savedCount}/{scores.length}</strong></div><Progress value={(savedCount / scores.length) * 100} /></div>}
        {!saving && savedCount === scores.length && scores.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-success/20 bg-success/10 p-4 text-success sm:flex-row sm:items-center">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="flex-1 font-medium">Phiên rèn luyện và thời hạn đã được công bố thành công.</span>
          </div>
        )}
        <Button className="h-12 w-full bg-gradient-primary text-base animate-pulse" onClick={saveSession} disabled={saving || !scores.length || savedCount === scores.length}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {savedCount === scores.length && scores.length ? "Đã công bố & lưu phiên" : "Công bố & Lưu phiên đánh giá"}
        </Button>
      </CardContent>
    </Card>
  );

  const contents = [renderScope, renderCriteria, renderAttendance, renderStudentActivities, renderCalculation, renderReview, renderSave];

  if (loading) return <Loading message="Đang tải dữ liệu phiên đánh giá..." />;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>Điểm rèn luyện</span><ChevronRight className="h-4 w-4" /><span>Tạo phiên mới</span></div>
        <h1 className="mt-2 text-3xl font-bold">Tạo phiên điểm rèn luyện</h1>
        <p className="mt-1 text-muted-foreground">Thiết lập phạm vi, kiểm tra dữ liệu và khởi tạo điểm theo từng bước.</p>
      </div>

      {evaluationSession && (
        <Card className="border border-primary/15 bg-primary/5">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Phiên workspace</p>
              <p className="text-xs text-muted-foreground">
                {evaluationSession.semester}
                {evaluationSession.year ? ` · ${evaluationSession.year}` : ""}
              </p>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              <p>Trạng thái: {evaluationSession.status}</p>
              <p>Lần hoạt động cuối: {sessionLastActiveLabel || "đang cập nhật..."}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
            disabled={
              (step === 4 && calculating) ||
              (step === 3 && transcriptLoading) ||
              (step === 0 && (
                !scopedStudents.length ||
                matchedTranscriptCount < scopedStudents.length ||
                Object.keys(importedAttendance).length === 0
              ))
            }
          >
            {step === 3 && transcriptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tiếp tục<ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <RadialTimePicker
        open={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        value={timePickerTarget === 'selfStart' ? selfAssessmentStartTime : selfAssessmentEndTime}
        onChange={(val) => {
          if (timePickerTarget === 'selfStart') {
            setSelfAssessmentStartTime(val);
          } else {
            setSelfAssessmentEndTime(val);
          }
        }}
        title={timePickerTarget === 'selfStart' ? "Chọn giờ bắt đầu tự đánh giá" : "Chọn giờ kết thúc tự đánh giá"}
      />
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
  const style = value === "Xuất sắc" || value === "Giỏi"
    ? "border-success/20 bg-success/10 text-success"
    : value === "Khá" || value === "Trung bình"
      ? "border-primary/20 bg-primary/10 text-primary"
      : "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return <Badge variant="outline" className={style}>{value}</Badge>;
}
