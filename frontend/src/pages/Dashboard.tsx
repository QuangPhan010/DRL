import { useState, useEffect, useRef } from "react";
import {
  Users,
  ClipboardCheck,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Activity,
  FileText,
  Bookmark,
  MapPin,
  Flame,
  Star,
  AlertCircle,
  BookOpen,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, Line
} from "recharts";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { classificationColor } from "@/lib/mock-data";
import Loading from "./Loading";
import ErrorPage from "./ErrorPage";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(25 95% 53%)",
  "hsl(0 84% 60%)"
];

export default function Dashboard() {
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const getCurrentSemester = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 8 && month <= 12) {
      return "HK1";
    } else if (month >= 1 && month <= 4) {
      return "HK2";
    } else {
      return "HK3";
    }
  };

  const { user } = useAuth();
  const navigate = useNavigate();
  const [evals, setEvals] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeSemester, setActiveSemester] = useState(getCurrentSemester());
  const [activeYear, setActiveYear] = useState(getCurrentAcademicYear());

  // Self assessment states (copied from MyScores.tsx)
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [selfNote, setSelfNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isInitialLoad = useRef(true);

  // DraftStateManager Refs & States
  const pendingChangesRef = useRef<Record<string, number>>({});
  const dirtyFieldsRef = useRef<Set<string>>(new Set());
  const pendingNoteRef = useRef<string | null>(null);
  const originalNoteRef = useRef<string>("");
  const saveQueueRef = useRef<{ scores: Record<string, number>; note: string | null } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Optimistic Locking States & Refs
  const clientVersionRef = useRef<number>(1);
  const [serverVersion, setServerVersion] = useState<number>(1);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  const latest = evals[evals.length - 1];
  const editableEval = [...evals].reverse().find(e => e.status === "published" || e.status === "rejected");
  const manualCriteria = editableEval
    ? criteria.filter(c => c.criteria_set === editableEval.criteria_set && c.is_manual)
    : [];

  const maximumScore = (evaluation: any) => {
    const value = Number(evaluation?.maximum_score || 100);
    return value > 0 ? value : 100;
  };
  const missingPoints = (evaluation: any) => Number(
    evaluation?.points_missing
      ?? Math.max(0, maximumScore(evaluation) - Number(evaluation?.total_score || 0))
  );

  // Monitor network status
  useEffect(() => {
    if (user?.role !== "student") return;
    const handleOnline = () => {
      setIsOnline(true);
      if (saveQueueRef.current) {
        const { scores, note } = saveQueueRef.current;
        const savedDirtyFields = new Set(Object.keys(scores));
        const savedPendingChanges = { ...scores };
        triggerSave(scores, note, savedDirtyFields, savedPendingChanges, note);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, editableEval]);

  const triggerSave = async (
    scores: Record<string, number>,
    note: string | null,
    savedDirtyFields: Set<string>,
    savedPendingChanges: Record<string, number>,
    savedPendingNote: string | null,
    retries = 3,
    delay = 1000
  ) => {
    if (!editableEval) return;

    if (editableEval.status !== "draft" && editableEval.status !== "rejected") {
      return;
    }

    if (!navigator.onLine) {
      saveQueueRef.current = { scores, note };
      savedDirtyFields.forEach(key => {
        dirtyFieldsRef.current.add(key);
        pendingChangesRef.current[key] = savedPendingChanges[key];
      });
      if (savedPendingNote !== null) {
        pendingNoteRef.current = savedPendingNote;
      }
      setSaveStatus("offline");
      return;
    }

    setSaveStatus("saving");
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload: any = { scores, clientVersion: clientVersionRef.current };
      if (note !== null) {
        payload.note = note;
      }

      const res = await fetch(`${API_URL}/evaluations/${editableEval.id}/save-draft/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setSaveStatus("error");
        const data = await res.json().catch(() => ({}));
        if (data.reason === "VERSION_CONFLICT") {
          setServerVersion(data.serverVersion);
          setConflictMessage(data.message || "Dữ liệu đã được chỉnh sửa từ một phiên khác.");
          setConflictOpen(true);
        }
        return;
      }

      if (res.status === 403) {
        setSaveStatus("error");
        toast.error("Không có quyền lưu nháp (Phiên đánh giá không hợp lệ hoặc hết hạn).");
        return;
      }

      if (res.status === 404) {
        setSaveStatus("error");
        toast.error("Không tìm thấy phiếu đánh giá.");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "API error");
      }

      const wasInQueue = saveQueueRef.current !== null;
      saveQueueRef.current = null;
      setSaveStatus("saved");
      setLastSavedAt(new Date().toLocaleTimeString());
      if (wasInQueue) {
        toast.success("Đã đồng bộ thành công dữ liệu lưu nháp!");
      }
      
      const data = await res.json();
      if (data.success) {
        if (note !== null) {
          originalNoteRef.current = note;
        }
        
        const newVer = Number(data.serverVersion || clientVersionRef.current + 1);
        clientVersionRef.current = newVer;
        setServerVersion(newVer);

        setEvals(current => current.map(e => {
          if (e.id === editableEval.id) {
            return {
              ...e,
              total_score: data.total_score,
              classification: data.classification,
              note: note !== null ? note : e.note,
              version: newVer
            };
          }
          return e;
        }));
      }
    } catch (error) {
      if (retries > 0 && navigator.onLine) {
        setTimeout(() => {
          triggerSave(scores, note, savedDirtyFields, savedPendingChanges, savedPendingNote, retries - 1, delay * 1.5);
        }, delay);
      } else {
        setSaveStatus("error");
        savedDirtyFields.forEach(key => {
          dirtyFieldsRef.current.add(key);
          pendingChangesRef.current[key] = savedPendingChanges[key];
        });
        if (savedPendingNote !== null) {
          pendingNoteRef.current = savedPendingNote;
        }
        saveQueueRef.current = { scores, note };
        toast.error(error instanceof Error ? error.message : "Lỗi tự động lưu nháp. Hệ thống sẽ thử lại.");
      }
    }
  };

  useEffect(() => {
    if (!editableEval) return;
    const nextScores: Record<string, number> = {};
    (editableEval.details || []).forEach((detail: any) => {
      nextScores[String(detail.sub_item_id)] = Number(detail.score || 0);
    });
    isInitialLoad.current = true;
    setSelfScores(nextScores);
    setSelfNote(editableEval.note || "");
    originalNoteRef.current = editableEval.note || "";
    setSaveStatus("idle");
    setLastSavedAt(null);

    // Set optimistic lock version
    const version = Number(editableEval.version || 1);
    clientVersionRef.current = version;
    setServerVersion(version);
    
    // Reset DraftStateManager
    pendingChangesRef.current = {};
    dirtyFieldsRef.current.clear();
    pendingNoteRef.current = null;
    saveQueueRef.current = null;
  }, [editableEval?.id]);

  useEffect(() => {
    if (user?.role !== "student") return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (selfNote !== originalNoteRef.current) {
      pendingNoteRef.current = selfNote;
    } else {
      pendingNoteRef.current = null;
    }

    if (dirtyFieldsRef.current.size === 0 && pendingNoteRef.current === null) {
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const dirtyScores: Record<string, number> = {};
      dirtyFieldsRef.current.forEach(key => {
        dirtyScores[key] = pendingChangesRef.current[key];
      });

      const noteToSave = pendingNoteRef.current;
      const savedDirtyFields = new Set(dirtyFieldsRef.current);
      const savedPendingChanges = { ...pendingChangesRef.current };
      const savedPendingNote = pendingNoteRef.current;

      dirtyFieldsRef.current.clear();
      pendingNoteRef.current = null;

      triggerSave(dirtyScores, noteToSave, savedDirtyFields, savedPendingChanges, savedPendingNote);
    }, 3000);

    return () => clearTimeout(timer);
  }, [selfScores, selfNote, user]);

  const changeSelfScore = (subItemId: number, score: number) => {
    const val = Number.isFinite(score) ? score : 0;
    setSelfScores(current => ({
      ...current,
      [String(subItemId)]: val,
    }));
    pendingChangesRef.current[String(subItemId)] = val;
    dirtyFieldsRef.current.add(String(subItemId));
  };

  const submitSelfAssessment = async () => {
    if (!editableEval) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/evaluations/${editableEval.id}/submit-self-assessment/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          scores: selfScores, 
          note: selfNote, 
          clientVersion: clientVersionRef.current 
        }),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data.reason === "VERSION_CONFLICT") {
          setServerVersion(data.serverVersion);
          setConflictMessage(data.message || "Dữ liệu đã được chỉnh sửa từ một phiên khác.");
          setConflictOpen(true);
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể nộp phiếu tự đánh giá");
      }

      toast.success("Đã nộp phiếu tự đánh giá lên cán bộ lớp");
      
      const data = await res.json();
      const newVer = Number(data.serverVersion || clientVersionRef.current + 1);
      clientVersionRef.current = newVer;
      setServerVersion(newVer);

      fetchDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể nộp phiếu tự đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressColorClass = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.8) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  useEffect(() => {
    const fetchActivePeriod = async () => {
      try {
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_URL}/criteria-sets/`, { headers });
        if (res.ok) {
          const data = await res.json();
          const active = data.find((item: any) => item.is_active);
          if (active) {
            setActiveSemester(active.semester);
            setActiveYear(active.academic_year);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActivePeriod();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (user?.role === "student") {
        // 1. Fetch student's own evaluations
        const evalRes = await fetch(`${API_URL}/evaluations/?studentId=${user.studentId}`, { headers });
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          const semesterOrder: Record<string, number> = { HK1: 1, HK2: 2, HK3: 3 };
          const sorted = (evalData || []).sort((a: any, b: any) => {
            const yearDifference = (a.year || "").localeCompare(b.year || "");
            if (yearDifference !== 0) return yearDifference;
            return (semesterOrder[a.semester] || 99) - (semesterOrder[b.semester] || 99);
          });
          setEvals(sorted);
          if (sorted.length > 0 && selectedEvalId === null) {
            setSelectedEvalId(sorted[sorted.length - 1].id);
          }
        }

        // 2. Fetch criteria list
        const criteriaRes = await fetch(`${API_URL}/criteria/?all=true`, { headers });
        if (criteriaRes.ok) {
          const criteriaData = await criteriaRes.json();
          setCriteria(criteriaData);
        }

        // 3. Fetch activities
        const actRes = await fetch(`${API_URL}/activities/`, { headers });
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData);
        }
      } else {
        // Admin / Staff data
        const studentsRes = await fetch(`${API_URL}/students/`, { headers });
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudentsCount(studentsData.length);
        }

        const evalRes = await fetch(`${API_URL}/evaluations/`, { headers });
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          setEvals(evalData);
        }
      }
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Lỗi khi tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <Loading message="Đang tải thông tin tổng quan..." />;
  }

  if (error) {
    return (
      <ErrorPage
        code="500"
        title="Lỗi tải trang tổng quan"
        message="Hệ thống không thể kết nối tới máy chủ hoặc dữ liệu tải bị lỗi. Vui lòng nhấn nút tải lại để thử lại."
        onRetry={fetchDashboardData}
      />
    );
  }

  const statusBadge = (s: string) => {
    if (s === "approved") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Đã duyệt
        </Badge>
      );
    }
    if (["pending", "class_pending", "advisor_pending"].includes(s)) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <Clock className="h-3 w-3 text-amber-500" /> Chờ duyệt
        </Badge>
      );
    }
    if (s === "draft") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <Clock className="h-3 w-3 text-blue-500" /> Tự đánh giá
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1 text-[10px] font-semibold py-0.5">
        <XCircle className="h-3 w-3 text-rose-500" /> Từ chối
      </Badge>
    );
  };

  // ==========================================
  // STUDENT DASHBOARD RENDER
  // ==========================================
  if (user?.role === "student") {
    const latestEval = evals[evals.length - 1];
    const approvedEvals = evals.filter(e => e.status === "approved");
    const avgScore = approvedEvals.length > 0
      ? Math.round(approvedEvals.reduce((s, e) => s + e.total_score, 0) / approvedEvals.length)
      : 0;

    const registeredActCount = activities.filter(act =>
      act.participants?.some((p: any) => p.student_id === user.studentId || p.studentId === user.studentId)
    ).length;

    const excessPoints = (evaluation: any) => Number(evaluation?.points_excess || 0);

    const studentStats = [
      {
        label: "Điểm HK mới nhất",
        value: latestEval ? `${latestEval.total_score}đ` : "0đ",
        icon: Award,
        trend: latestEval ? latestEval.semester : "Chưa có",
        color: "bg-primary/10 text-primary border-primary/20",
        trendColor: "bg-primary/5 text-primary"
      },
      {
        label: "Xếp loại rèn luyện",
        value: latestEval?.classification || "Chưa xếp",
        icon: Sparkles,
        trend: "Kết quả",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        trendColor: "bg-emerald-500/5 text-emerald-600"
      },
      {
        label: "Điểm học tập (GPA)",
        value: latestEval?.academic_gpa ? Number(latestEval.academic_gpa).toFixed(2) : "0.00",
        icon: Bookmark,
        trend: latestEval?.academic_classification || "Chưa có",
        color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        trendColor: "bg-cyan-500/5 text-cyan-600"
      },
      {
        label: "Điểm TB rèn luyện",
        value: `${avgScore}đ`,
        icon: Flame,
        trend: `${evals.length} học kỳ`,
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        trendColor: "bg-amber-500/5 text-amber-600"
      },
    ];

    const upcomingActivities = activities
      .filter(act => act.status === "upcoming")
      .slice(0, 3);

    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Welcome & General Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Xin chào, {user?.fullName ? user.fullName.split(" ").slice(-1)[0] : "Bạn"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Chào mừng quay trở lại. Hãy theo dõi điểm số rèn luyện và tiến trình tiêu chí của bạn dưới đây.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-muted/40 border-border/50 text-xs font-semibold text-foreground/80 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Học kỳ hiện tại: {activeSemester} {activeYear}
          </Badge>
        </div>

        {/* Student Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {studentStats.map(s => (
            <Card key={s.label} className="border border-border/50 bg-card hover:bg-muted/5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl flex flex-col justify-between p-5 group">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge className={`border-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.trendColor}`}>
                  {s.trend}
                </Badge>
              </div>
              <div className="mt-5">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {s.value}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Student Dashboard Content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Progress, Assessment & History */}
          <div className="lg:col-span-8 space-y-8">
            {/* Self Assessment Form */}
            {evals.length > 0 && editableEval && manualCriteria.length > 0 && (
              <Card className="border border-amber-500/20 bg-amber-500/[0.02] shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="font-display text-xl font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> Tự đánh giá tiêu chí thủ công
                    </h2>
                    <p className="text-white/80 text-sm">
                      Phiếu của học kỳ <strong className="underline">{editableEval.semester} {editableEval.year}</strong> đang mở. Hãy tự đánh giá điểm và gửi.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {saveStatus === "saving" && (
                      <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-0 py-1 px-3 gap-1">
                        <Clock className="h-3.5 w-3.5 animate-spin" /> Đang tự động lưu...
                      </Badge>
                    )}
                    {saveStatus === "saved" && (
                      <Badge className="bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 border-0 py-1 px-3 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã tự động lưu nháp {lastSavedAt ? `lúc ${lastSavedAt}` : ""}
                      </Badge>
                    )}
                    {saveStatus === "offline" && (
                      <Badge className="bg-gray-500/20 text-gray-200 hover:bg-gray-500/30 border-0 py-1 px-3 gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Ngoại tuyến (Chờ lưu)
                      </Badge>
                    )}
                    {saveStatus === "error" && (
                      <Badge className="bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 border-0 py-1 px-3 gap-1">
                        <XCircle className="h-3.5 w-3.5" /> Lỗi tự động lưu, sẽ thử lại
                      </Badge>
                    )}
                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 py-1 px-3">
                      Trạng thái: {editableEval.status === "published" ? "Tự đánh giá" : editableEval.status === "draft" ? "Nháp" : "Bị từ chối"}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-6 space-y-6">
                  <div className="rounded-xl border border-amber-200 bg-amber-500/5 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Lưu ý cho Sinh viên:</p>
                      <p className="mt-1 text-xs opacity-90 leading-relaxed">
                        Vui lòng chỉ nhập điểm tại các tiêu chí yêu cầu tự đánh giá bằng tay dưới đây. Các tiêu chí tích hợp tự động sẽ được hệ thống tính toán sau khi phiếu được kiểm tra.
                      </p>
                    </div>
                  </div>

                  {manualCriteria.map(c => (
                    <div key={c.id} className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 hover:border-amber-500/30 transition-all">
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b">
                        <div>
                          <h4 className="font-bold text-foreground flex items-center gap-2">
                            <span className="text-primary font-mono">{c.code}.</span> {c.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Điểm tối đa có thể đạt: <span className="font-semibold text-primary">{c.max_score} điểm</span></p>
                        </div>
                        <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-amber-700 dark:text-amber-300">Sinh viên tự chấm</Badge>
                      </div>

                      {(c.groups || []).map((group: any) => (
                        <div key={group.id} className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mt-2">{group.name}</p>
                          <div className="grid gap-3">
                            {(group.subItems || []).map((item: any) => (
                              <div key={item.id} className="grid gap-3 rounded-xl bg-muted/40 p-4 border border-border/30 sm:grid-cols-[1fr_120px] sm:items-center hover:bg-muted/60 transition-colors">
                                <div>
                                  <p className="text-sm font-semibold text-foreground/90">{item.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Điểm giới hạn/tối đa: <span className="font-medium text-foreground">{item.max_score}</span></p>
                                </div>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    className="h-10 text-center font-bold bg-background pr-6 border-border/60 focus:border-amber-500"
                                    value={selfScores[String(item.id)] ?? 0}
                                    onChange={event => changeSelfScore(Number(item.id), Number(event.target.value))}
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">đ</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Minh chứng / Ghi chú giải trình
                    </Label>
                    <Textarea 
                      value={selfNote} 
                      onChange={event => setSelfNote(event.target.value)} 
                      placeholder="Nhập link minh chứng Google Drive hoặc ghi chú cho Cán bộ lớp, Cố vấn..." 
                      className="min-h-[100px] border-border/60 focus-visible:ring-amber-500 rounded-xl"
                    />
                  </div>
                  
                  <Button 
                    className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2" 
                    onClick={submitSelfAssessment} 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" /> Đang nộp phiếu tự đánh giá...
                      </>
                    ) : (
                      <>
                        Nộp phiếu tự đánh giá
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Criteria Breakdown card with dropdown */}
            {(() => {
              const selectedEval = evals.find(e => e.id === selectedEvalId) || latest;
              const evalCriteria = selectedEval ? criteria.filter(c => c.criteria_set === selectedEval.criteria_set) : [];
              
              return (
                <Card className="border border-border/50 shadow-sm rounded-2xl flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4 border-b">
                    <div className="space-y-1">
                      <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-accent" /> Chi tiết tiêu chí
                      </CardTitle>
                      <CardDescription>Chi tiết điểm số rèn luyện theo các nhóm chính</CardDescription>
                    </div>
                    <Select
                      value={String(selectedEval?.id || "")}
                      onValueChange={(val) => setSelectedEvalId(Number(val))}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/50 hover:bg-muted border-0 focus:ring-0">
                        <SelectValue placeholder="Chọn học kỳ" />
                      </SelectTrigger>
                      <SelectContent>
                        {evals.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)} className="text-xs">
                            {e.semester} · {e.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5 overflow-y-auto max-h-[350px]">
                    {selectedEval ? (
                      evalCriteria.length > 0 ? (
                        evalCriteria.map(c => {
                          const sc = selectedEval.scores?.[c.id] || selectedEval.scores?.[`c${c.id}`] || 0;
                          const percentage = Math.min(100, (sc / c.max_score) * 100);
                          return (
                            <div key={c.id} className="space-y-1.5 group">
                              <div className="flex justify-between text-xs sm:text-sm gap-2">
                                <span className="font-semibold text-foreground/80 line-clamp-1 group-hover:text-primary transition-colors">
                                  <span className="text-primary font-mono mr-1">{c.code}.</span> {c.name}
                                </span>
                                <span className="font-bold shrink-0">{sc} / <span className="text-muted-foreground font-normal">{c.max_score}đ</span></span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColorClass(sc, c.max_score)}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 space-y-2">
                          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                          <p className="text-xs text-muted-foreground">Không tìm thấy tiêu chí của học kỳ này.</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12 space-y-2">
                        <Info className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                        <p className="text-xs text-muted-foreground">Vui lòng chọn học kỳ để xem chi tiết.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Semester History Table */}
            {evals.length > 0 && (
              <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Lịch sử điểm qua các học kỳ
                  </CardTitle>
                  <CardDescription>Tất cả kết quả rèn luyện được ghi nhận trong thời gian học tập</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-4">
                  <div className="space-y-4 px-4 sm:px-0 pb-4">
                    {evals.slice().reverse().map(e => (
                      <div 
                        key={e.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-border/50 bg-card hover:bg-muted/10 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                      >
                        {/* Left block: Year & Semester info */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                              {e.semester} <span className="text-muted-foreground font-normal">năm {e.year}</span>
                            </h4>
                            {statusBadge(e.status)}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Nộp ngày: {e.submitted_at ? e.submitted_at.substring(0, 10) : "Chưa cập nhật"}
                          </p>
                        </div>

                        {/* Middle block: Progress indicators */}
                        <div className="w-full md:w-72 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Tỷ lệ tích lũy</span>
                            <span>{e.total_score} <span className="text-muted-foreground font-normal">/ {maximumScore(e)}</span></span>
                          </div>
                          <Progress
                            value={Math.min(100, (Number(e.total_score || 0) / maximumScore(e)) * 100)}
                            className="h-2 rounded-full"
                          />
                          <div className="flex flex-wrap gap-2 pt-1">
                            {missingPoints(e) > 0 ? (
                              <Badge variant="outline" className="bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10 gap-1 text-[10px] font-semibold py-0.5 px-2">
                                <AlertCircle className="h-3 w-3" /> Thiếu {missingPoints(e)} điểm
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 gap-1 text-[10px] font-semibold py-0.5 px-2">
                                <CheckCircle2 className="h-3 w-3" /> Đạt yêu cầu
                              </Badge>
                            )}
                            {excessPoints(e) > 0 && (
                              <Badge variant="outline" className="bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/10 gap-1 text-[10px] font-semibold py-0.5 px-2">
                                <Sparkles className="h-3 w-3" /> Dư {excessPoints(e)} điểm
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Right block: Final grade score */}
                        <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                          <div className="text-left md:text-right">
                            <p className="font-display text-3xl font-extrabold text-foreground tracking-tight">
                              {e.total_score}
                              <span className="text-xs text-muted-foreground font-normal ml-0.5">/{maximumScore(e)}</span>
                            </p>
                            <Badge variant="outline" className={`mt-1 font-semibold text-xs ${classificationColor(e.classification)}`}>
                              {e.classification}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Upcoming Activities */}
          <div className="lg:col-span-4 space-y-8">
            {/* Upcoming Activities list */}
            <Card className="border border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" /> Hoạt động sắp diễn ra
                </CardTitle>
                <CardDescription>Đăng ký tham gia để tích lũy thêm điểm rèn luyện</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingActivities.map(act => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors flex flex-col justify-between gap-2.5 group cursor-pointer"
                    onClick={() => navigate(`/activities/${act.id}`)}
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {act.title}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t pt-2 border-border/40">
                      <span className="text-[10px] text-primary font-bold">+{act.score}đ rèn luyện</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2 hover:bg-primary/10 hover:text-primary gap-1">
                        Chi tiết <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingActivities.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Không có hoạt động sắp diễn ra nào mới.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Version Conflict Dialog */}
        <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-500">
                <AlertCircle className="h-5 w-5 animate-pulse" /> Xung đột phiên bản dữ liệu
              </DialogTitle>
              <DialogDescription>
                {conflictMessage} Phiên bản trên máy chủ hiện tại là <strong>v{serverVersion}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-sm text-muted-foreground space-y-2">
              <p>
                Dữ liệu của bạn chưa được lưu để tránh ghi đè lên các thay đổi mới nhất từ phiên làm việc khác. Bạn có thể chọn:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Sao chép dữ liệu</strong>: Lưu lại các điểm số và ghi chú đã nhập vào clipboard.</li>
                <li><strong>Tải lại dữ liệu</strong>: Cập nhật dữ liệu mới nhất từ máy chủ (điểm cũ sẽ bị mất).</li>
              </ul>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  const dataToCopy = `Điểm tự chấm:\n${JSON.stringify(selfScores, null, 2)}\nGhi chú:\n${selfNote}`;
                  navigator.clipboard.writeText(dataToCopy);
                  toast.success("Đã sao chép dữ liệu chỉnh sửa vào clipboard!");
                }}
              >
                Sao chép dữ liệu
              </Button>
              <Button 
                className="bg-primary hover:bg-primary-glow"
                onClick={() => {
                  fetchDashboardData();
                  setConflictOpen(false);
                }}
              >
                Tải lại dữ liệu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ==========================================
  // STAFF / ADMIN / MONITOR DASHBOARD RENDER
  // ==========================================
  const completed = evals.filter(e => e.status === "approved").length;
  const pending = evals.filter(e => e.status === "pending" || e.status === "class_pending" || e.status === "advisor_pending").length;
  const avgScore = completed > 0
    ? Math.round(evals.filter(e => e.status === "approved").reduce((s, e) => s + e.total_score, 0) / completed)
    : 0;

  const stats = [
    {
      label: "Tổng số sinh viên",
      value: studentsCount,
      icon: Users,
      trend: "Sinh viên",
      color: "bg-primary/10 text-primary border-primary/20",
      trendColor: "bg-primary/5 text-primary"
    },
    {
      label: "Phiếu đã duyệt",
      value: completed,
      icon: ClipboardCheck,
      trend: "Hoàn tất",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      trendColor: "bg-emerald-500/5 text-emerald-600"
    },
    {
      label: "Điểm trung bình",
      value: avgScore,
      icon: Award,
      trend: "Toàn trường",
      color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      trendColor: "bg-cyan-500/5 text-cyan-600"
    },
    {
      label: "Đang chờ duyệt",
      value: pending,
      icon: Clock,
      trend: "Yêu cầu mới",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      trendColor: "bg-amber-500/5 text-amber-600 animate-pulse"
    },
  ];

  // Process classification distributions
  const classifications = ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"];
  const distributionData = classifications.map(cls => {
    const val = evals.filter(e => e.classification === cls).length;
    return { name: cls, value: val };
  }).filter(item => item.value > 0);

  // Fallback if no classification data yet
  const displayDistribution = distributionData.length > 0 ? distributionData : [
    { name: "Khá", value: 1 },
    { name: "Giỏi", value: 2 }
  ];

  const recent = evals.slice(-5).reverse();

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Welcome & Time Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Xin chào, {user?.fullName ? user.fullName.split(" ").slice(-1)[0] : "Bạn"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Chào mừng quay trở lại. Dưới đây là hoạt động tổng quát của hệ thống đánh giá điểm rèn luyện.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-muted/40 border-border/50 text-xs font-semibold text-foreground/80 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Học kỳ hiện tại: {activeSemester} {activeYear}
        </Badge>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map(s => (
          <Card key={s.label} className="border border-border/50 bg-card hover:bg-muted/5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl flex flex-col justify-between p-5 group">
            <div className="flex items-start justify-between">
              <div className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <Badge className={`border-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.trendColor}`}>
                {s.trend}
              </Badge>
            </div>
            <div className="mt-5">
              <h3 className="font-display text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {s.value.toLocaleString()}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Bar Chart card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-8 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Phân bố kết quả điểm rèn luyện
            </CardTitle>
            <CardDescription>Số lượng sinh viên tương ứng theo từng bậc xếp loại rèn luyện</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.8)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-sm)"
                  }}
                />
                <Bar dataKey="value" name="Số lượng SV" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {displayDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Tỷ lệ xếp loại (%)
            </CardTitle>
            <CardDescription>Phần trăm đóng góp các nhóm xếp loại rèn luyện</CardDescription>
          </CardHeader>
          <CardContent className="h-72 p-6 flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {displayDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.8)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-sm)"
                  }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations Section */}
      <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Phiếu đánh giá mới gửi gần đây
          </CardTitle>
          <CardDescription>Các phiếu rèn luyện sinh viên vừa nộp yêu cầu duyệt hoặc xử lý</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="space-y-3 px-4 sm:px-0">
            {recent.map(e => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/10 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {e.student_name ? e.student_name.split(" ").slice(-1)[0][0] : "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                      {e.student_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MSSV: {e.student_id} · {e.semester} {e.year}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-display font-extrabold text-lg text-foreground tracking-tight">
                      {e.total_score}
                      <span className="text-xs text-muted-foreground font-normal ml-0.5">đ</span>
                    </p>
                    <div className="mt-1 flex justify-end">
                      {statusBadge(e.status)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1 hidden sm:block" />
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Chưa có phiếu đánh giá nào được gửi lên hệ thống.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
