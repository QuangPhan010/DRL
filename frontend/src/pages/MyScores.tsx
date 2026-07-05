import { useState, useEffect } from "react";
import { Award, CheckCircle2, Clock, XCircle, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

export default function MyScores() {
  const { user } = useAuth();
  const [evals, setEvals] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [selfNote, setSelfNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        }
      }
    } catch (err) {
      console.error(err);
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
    if (s === "approved") return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" />Đã duyệt</Badge>;
    if (s === "pending" || s === "class_pending" || s === "advisor_pending") return <Badge className="bg-warning/15 text-warning border-warning/30 gap-1"><Clock className="h-3 w-3" />Chờ duyệt</Badge>;
    if (s === "draft") return <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><Clock className="h-3 w-3" />Chờ tự đánh giá</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><XCircle className="h-3 w-3" />Từ chối</Badge>;
  };

  useEffect(() => {
    if (!editableEval) return;
    const nextScores: Record<string, number> = {};
    (editableEval.details || []).forEach((detail: any) => {
      nextScores[String(detail.sub_item_id)] = Number(detail.score || 0);
    });
    setSelfScores(nextScores);
    setSelfNote(editableEval.note || "");
  }, [editableEval?.id]);

  const changeSelfScore = (subItemId: number, score: number) => {
    setSelfScores(current => ({
      ...current,
      [String(subItemId)]: Number.isFinite(score) ? score : 0,
    }));
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
        body: JSON.stringify({ scores: selfScores, note: selfNote }),
      });
      if (!res.ok) throw new Error("Không thể nộp phiếu tự đánh giá");
      toast.success("Đã nộp phiếu tự đánh giá lên cán bộ lớp");
      fetchMyScores();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể nộp phiếu tự đánh giá");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải điểm rèn luyện...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Award className="h-7 w-7 text-primary" />Điểm rèn luyện của tôi
        </h1>
        <p className="text-muted-foreground mt-1">Xem chi tiết điểm rèn luyện qua các học kỳ.</p>
      </div>

      {/* Hero card */}
      {latest ? (
        <Card className="border-0 shadow-elegant bg-gradient-hero text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <CardContent className="p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-white/80 text-sm">Học kỳ hiện tại • {latest.semester} {latest.year}</p>
                <p className="font-display text-7xl font-bold mt-2">{latest.total_score}<span className="text-2xl text-white/70">/{maximumScore(latest)}</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/25 text-sm">{latest.classification}</Badge>
                  <Badge className={missingPoints(latest) > 0
                    ? "bg-red-500/80 text-white border-0"
                    : "bg-emerald-500/80 text-white border-0"
                  }>
                    {missingPoints(latest) > 0
                      ? `Thiếu ${missingPoints(latest)} điểm`
                      : `Đã đủ ${maximumScore(latest)} điểm`}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Điểm TB</p>
                  <p className="font-display text-3xl font-bold mt-1">{avg}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Số học kỳ</p>
                  <p className="font-display text-3xl font-bold mt-1">{evals.length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Học kỳ đủ điểm</p>
                  <p className="font-display text-3xl font-bold mt-1">{completedSemesters}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Tổng điểm còn thiếu</p>
                  <p className="font-display text-3xl font-bold mt-1">{totalMissingPoints}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md p-8 text-center text-muted-foreground">
          Bạn chưa nộp phiếu tự đánh giá rèn luyện nào.
        </Card>
      )}

      {evals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Lịch sử điểm</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} domain={[0, chartMaximum]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 6, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {latest && (
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="font-display">Chi tiết tiêu chí HK gần nhất</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {criteria.filter(c => c.criteria_set === latest.criteria_set).map(c => {
                  const sc = latest.scores?.[c.id] || latest.scores?.[`c${c.id}`] || 0;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium"><span className="text-primary">{c.code}.</span> {c.name}</span>
                        <span className="font-bold">{sc}/{c.max_score}</span>
                      </div>
                      <Progress value={(sc / c.max_score) * 100} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {evals.length > 0 && (
        <>
        {editableEval && manualCriteria.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display">Tự đánh giá tiêu chí thủ công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border bg-primary/5 p-4 text-sm">
                Phiếu {editableEval.semester} {editableEval.year} đã được CTSV mở. Bạn tự chấm các tiêu chí chưa thể tính tự động, sau đó gửi cho cán bộ lớp rà soát.
              </div>
              {manualCriteria.map(c => (
                <div key={c.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold"><span className="text-primary">{c.code}.</span> {c.name}</p>
                      <p className="text-xs text-muted-foreground">Tối đa {c.max_score} điểm</p>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Sinh viên tự đánh giá</Badge>
                  </div>
                  {(c.groups || []).map((group: any) => (
                    <div key={group.id} className="space-y-2">
                      <p className="text-xs font-bold uppercase text-muted-foreground">{group.name}</p>
                      {(group.subItems || []).map((item: any) => (
                        <div key={item.id} className="grid gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-[1fr_110px] sm:items-center">
                          <div>
                            <p className="text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">Điểm gợi ý/tối đa: {item.max_score}</p>
                          </div>
                          <Input
                            type="number"
                            className="h-9 text-center font-semibold"
                            value={selfScores[String(item.id)] ?? 0}
                            onChange={event => changeSelfScore(Number(item.id), Number(event.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Ghi chú minh chứng/giải trình</Label>
                <Textarea value={selfNote} onChange={event => setSelfNote(event.target.value)} placeholder="Nhập ghi chú cho cán bộ lớp, cố vấn hoặc CTSV..." />
              </div>
              <Button className="w-full bg-gradient-primary" onClick={submitSelfAssessment} disabled={submitting}>
                {submitting ? "Đang nộp..." : "Nộp phiếu tự đánh giá"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display">Lịch sử các học kỳ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {evals.slice().reverse().map(e => (
              <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-gradient-card hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-semibold">{e.semester} năm {e.year}</p>
                    {statusBadge(e.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Nộp ngày {e.submitted_at?.substring(0, 10)}</p>
                </div>
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tiến độ học kỳ</span>
                    <span className="font-semibold">{e.total_score}/{maximumScore(e)}</span>
                  </div>
                  <Progress
                    value={Math.min(100, Number(e.total_score || 0) / maximumScore(e) * 100)}
                    className="h-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {missingPoints(e) > 0 ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                        <AlertCircle className="h-3 w-3" /> Thiếu {missingPoints(e)} điểm
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Đã đủ {maximumScore(e)} điểm
                      </Badge>
                    )}
                    {excessPoints(e) > 0 && (
                      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 gap-1">
                        <Sparkles className="h-3 w-3" /> Dư {excessPoints(e)} điểm
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">{e.total_score}<span className="text-sm text-muted-foreground">/100</span></p>
                    <Badge variant="outline" className={classificationColor(e.classification)}>{e.classification}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}
