import { useState, useEffect, useRef } from "react";
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  FileText, 
  ChevronRight,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";
import Loading from "./Loading";
import ErrorPage from "./ErrorPage";

export default function MyScores() {
  const { user } = useAuth();
  const [evals, setEvals] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [selfNote, setSelfNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);

  const fetchMyScores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Fetch criteria
      const criteriaRes = await fetch(`${API_URL}/criteria/?all=true`, { headers });
      if (criteriaRes.ok) {
        const criteriaData = await criteriaRes.json();
        setCriteria(criteriaData);
      }

      // 2. Fetch my evaluations
      if (user?.studentId) {
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
          if (sorted.length > 0) {
            setSelectedEvalId(sorted[sorted.length - 1].id);
          }
        }
      }
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Lỗi khi tải điểm rèn luyện");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyScores();
  }, [user]);

  const latest = evals[evals.length - 1];
  const editableEval = [...evals].reverse().find(e => e.status === "draft" || e.status === "rejected");
  const manualCriteria = editableEval
    ? criteria.filter(c => c.criteria_set === editableEval.criteria_set && c.is_manual)
    : [];
  const approvedEvals = evals.filter(e => e.status === "approved");
  const avg = approvedEvals.length > 0 
    ? Math.round(approvedEvals.reduce((s, e) => s + Number(e.total_score || 0), 0) / approvedEvals.length)
    : 0;
  const maximumScore = (evaluation: any) => {
    const value = Number(evaluation?.maximum_score || 100);
    return value > 0 ? value : 100;
  };
  const missingPoints = (evaluation: any) => Number(
    evaluation?.points_missing
      ?? Math.max(0, maximumScore(evaluation) - Number(evaluation?.total_score || 0))
  );
  const excessPoints = (evaluation: any) => Number(evaluation?.points_excess || 0);
  const completedSemesters = evals.filter(e => missingPoints(e) === 0).length;
  const totalMissingPoints = evals.reduce((sum, e) => sum + missingPoints(e), 0);

  const chartData = evals.map(e => ({ 
    name: `${e.semester} ${e.year.substring(2, 4)}`, 
    score: Number(e.total_score || 0),
    maximum: maximumScore(e),
  }));
  const chartMaximum = Math.max(100, ...chartData.map(item => item.maximum));

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20 gap-1.5 py-1 px-2.5 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Đã duyệt</Badge>;
    if (s === "pending" || s === "class_pending" || s === "advisor_pending") return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20 gap-1.5 py-1 px-2.5 font-medium"><Clock className="h-3.5 w-3.5" />Chờ duyệt</Badge>;
    if (s === "draft") return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 border-blue-500/20 gap-1.5 py-1 px-2.5 font-medium"><Clock className="h-3.5 w-3.5" />Tự đánh giá</Badge>;
    return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 border-rose-500/20 gap-1.5 py-1 px-2.5 font-medium"><XCircle className="h-3.5 w-3.5" />Từ chối</Badge>;
  };

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

  // Monitor network status
  useEffect(() => {
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
  }, []);

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
  }, [selfScores, selfNote]);

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

      fetchMyScores();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể nộp phiếu tự đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for progress color coding
  const getProgressColorClass = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio >= 0.8) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (loading) {
    return <Loading message="Đang tải thông tin điểm rèn luyện..." />;
  }

  if (error) {
    return (
      <ErrorPage 
        code="500" 
        title="Lỗi tải điểm rèn luyện" 
        message="Hệ thống không thể tải dữ liệu điểm rèn luyện của bạn. Vui lòng nhấn nút tải lại để thử lại." 
        onRetry={fetchMyScores} 
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header section with modern design */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Award className="h-8 w-8 text-primary" /> Điểm rèn luyện của tôi
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Bảng điều khiển học tập, theo dõi điểm rèn luyện và tiến trình phát triển cá nhân.
          </p>
        </div>
        {editableEval && (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Có đợt tự đánh giá mới đang mở!
          </Badge>
        )}
      </div>

      {/* Stats Dashboard */}
      {latest ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Hero Card */}
          <Card className="lg:col-span-1 border-0 shadow-elegant bg-gradient-hero text-white overflow-hidden relative flex flex-col justify-between min-h-[220px] rounded-2xl group transition-all duration-300 hover:scale-[1.01] hover:shadow-glow">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,1)_0%,rgba(0,0,0,0)_60%)]" />
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-8 translate-y-8 transition-transform group-hover:scale-110 duration-500">
              <Award className="w-48 h-48 text-white" />
            </div>
            <CardHeader className="p-6 pb-2 relative z-10">
              <CardDescription className="text-white/80 font-medium flex items-center gap-2 text-xs uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Học kỳ hiện tại • {latest.semester} {latest.year}
              </CardDescription>
              <CardTitle className="font-display text-6xl font-black mt-3 tracking-tight flex items-baseline gap-1">
                {latest.total_score}
                <span className="text-xl font-normal text-white/70">/{maximumScore(latest)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 relative z-10">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/35 text-xs px-2.5 py-1 font-semibold rounded-md">
                  {latest.classification}
                </Badge>
                <Badge className={`${
                  missingPoints(latest) > 0
                    ? "bg-rose-500/80 text-white hover:bg-rose-500/90"
                    : "bg-emerald-500/80 text-white hover:bg-emerald-500/90"
                } border-0 text-xs px-2.5 py-1 font-semibold rounded-md`}>
                  {missingPoints(latest) > 0
                    ? `Thiếu ${missingPoints(latest)} điểm`
                    : `Đã đủ ${maximumScore(latest)} điểm`}
                </Badge>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (Number(latest.total_score || 0) / maximumScore(latest)) * 100)}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <Card className="border border-border/50 bg-card hover:bg-muted/10 transition-colors shadow-sm rounded-2xl flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Điểm TB học tập</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold tracking-tight">{avg}</h3>
                <p className="text-xs text-muted-foreground mt-1">Tính trên các học kỳ đã phê duyệt</p>
              </div>
            </Card>

            <Card className="border border-border/50 bg-card hover:bg-muted/10 transition-colors shadow-sm rounded-2xl flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Số học kỳ đã tham gia</span>
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold tracking-tight">{evals.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">Tất cả các học kỳ đã ghi nhận</p>
              </div>
            </Card>

            <Card className="border border-border/50 bg-card hover:bg-muted/10 transition-colors shadow-sm rounded-2xl flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Đã đạt chuẩn (đủ điểm)</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold tracking-tight text-emerald-500">{completedSemesters}</h3>
                <p className="text-xs text-muted-foreground mt-1">Đạt điểm chuẩn tối đa học kỳ</p>
              </div>
            </Card>

            <Card className="border border-border/50 bg-card hover:bg-muted/10 transition-colors shadow-sm rounded-2xl flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Điểm rèn luyện còn thiếu</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold tracking-tight text-rose-500">{totalMissingPoints}</h3>
                <p className="text-xs text-muted-foreground mt-1">Cần tích lũy thêm qua các hoạt động</p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border border-dashed border-border/80 bg-muted/20 p-12 text-center rounded-2xl">
          <div className="inline-flex p-3 rounded-full bg-muted mb-4">
            <Award className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground">Không có dữ liệu điểm</h3>
          <p className="text-sm text-muted-foreground mt-1">Bạn chưa nộp hoặc chưa có phiếu đánh giá rèn luyện nào.</p>
        </Card>
      )}

      {/* Analytical Section */}
      {evals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History Chart */}
          <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-7 flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Tiến trình điểm rèn luyện
              </CardTitle>
              <CardDescription>Biểu đồ thể hiện sự thay đổi điểm số rèn luyện của bạn qua từng kỳ học</CardDescription>
            </CardHeader>
            <CardContent className="h-72 pb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                    domain={[0, chartMaximum]} 
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border) / 0.8)", 
                      borderRadius: 12,
                      boxShadow: "var(--shadow-sm)"
                    }}
                    labelStyle={{ fontWeight: "bold", fontSize: 12 }}
                    itemStyle={{ color: "hsl(var(--primary))", fontSize: 12 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    name="Điểm"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#scoreColor)" 
                    dot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Criteria Breakdown */}
          {(() => {
            const selectedEval = evals.find(e => e.id === selectedEvalId) || latest;
            const evalCriteria = selectedEval ? criteria.filter(c => c.criteria_set === selectedEval.criteria_set) : [];
            
            return (
              <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-5 flex flex-col justify-between">
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
                <CardContent className="p-6 space-y-5 overflow-y-auto max-h-[280px]">
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
                              <span className="font-bold shrink-0">{sc} / <span className="text-muted-foreground font-normal">{c.max_score}</span></span>
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
        </div>
      )}

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
                Trạng thái: {editableEval.status === "draft" ? "Nháp" : "Bị từ chối"}
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
            <div className="space-y-4 px-4 sm:px-0">
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
                    <ChevronRight className="h-5 w-5 text-muted-foreground/60 transition-transform group-hover:translate-x-1 hidden md:block" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                fetchMyScores();
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
