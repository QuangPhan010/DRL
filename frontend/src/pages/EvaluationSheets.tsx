import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Eye, Loader2, RefreshCw, Search, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

type Evaluation = {
  id: number;
  student_id: string;
  student_name: string;
  class_name: string;
  semester: string;
  year: string;
  academic_gpa: number | string | null;
  academic_classification: string | null;
  raw_score: number;
  base_score: number;
  carry_in: number;
  carry_out: number;
  surplus_balance: number;
  total_score: number;
  classification: string;
  status: string;
  submitted_at: string;
  criteria_set: number;
  scores: Record<string, number>;
  note?: string;
};

type Criterion = {
  id: number;
  criteria_set: number;
  code: string;
  name: string;
  max_score: number;
};

const statusLabels: Record<string, string> = {
  draft: "Phiếu nháp",
  class_pending: "Chờ cán sự rà soát",
  advisor_pending: "Chờ cố vấn duyệt",
  pending: "Chờ duyệt cấp trường",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const statusClasses: Record<string, string> = {
  draft: "border-slate-300 bg-slate-100 text-slate-700",
  class_pending: "border-amber-300 bg-amber-50 text-amber-700",
  advisor_pending: "border-blue-300 bg-blue-50 text-blue-700",
  pending: "border-violet-300 bg-violet-50 text-violet-700",
  approved: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
};

const getHeaders = () => {
  const token = localStorage.getItem("drl_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function EvaluationSheets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Evaluation | null>(null);
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState(searchParams.get("semester") || "all");
  const [year, setYear] = useState(searchParams.get("year") || "all");
  const [className, setClassName] = useState("all");
  const [status, setStatus] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [evaluationResponse, criteriaResponse] = await Promise.all([
        fetch(`${API_URL}/evaluations/`, { headers: getHeaders() }),
        fetch(`${API_URL}/criteria/?all=true`, { headers: getHeaders() }),
      ]);
      if (!evaluationResponse.ok || !criteriaResponse.ok) throw new Error();
      const [evaluationData, criteriaData] = await Promise.all([evaluationResponse.json(), criteriaResponse.json()]);
      setEvaluations(evaluationData);
      setCriteria(criteriaData);
    } catch {
      toast.error("Không tải được danh sách phiếu đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (semester !== "all") params.semester = semester;
    if (year !== "all") params.year = year;
    setSearchParams(params, { replace: true });
  }, [semester, year, setSearchParams]);

  const semesters = useMemo(() => Array.from(new Set(evaluations.map((item) => item.semester))).sort(), [evaluations]);
  const years = useMemo(() => Array.from(new Set(evaluations.map((item) => item.year))).sort().reverse(), [evaluations]);
  const classes = useMemo(() => Array.from(new Set(evaluations.map((item) => item.class_name).filter(Boolean))).sort(), [evaluations]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return evaluations
      .filter((item) => semester === "all" || item.semester === semester)
      .filter((item) => year === "all" || item.year === year)
      .filter((item) => className === "all" || item.class_name === className)
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => !normalized || `${item.student_id} ${item.student_name} ${item.class_name}`.toLocaleLowerCase("vi").includes(normalized))
      .sort((a, b) => a.class_name.localeCompare(b.class_name, "vi") || a.student_name.localeCompare(b.student_name, "vi"));
  }, [evaluations, semester, year, className, status, query]);

  const draftCount = filtered.filter((item) => item.status === "draft").length;
  const approvedCount = filtered.filter((item) => item.status === "approved").length;
  const viewingCriteria = viewing ? criteria.filter((item) => item.criteria_set === viewing.criteria_set) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold"><ClipboardList className="h-7 w-7 text-primary" />Phiếu đánh giá rèn luyện</h1>
          <p className="mt-1 text-muted-foreground">Xem lại toàn bộ phiếu đã tạo theo học kỳ, lớp và trạng thái xử lý.</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Làm mới</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Phiếu đang hiển thị" value={filtered.length} icon={<Users className="h-5 w-5" />} />
        <SummaryCard label="Phiếu nháp" value={draftCount} />
        <SummaryCard label="Đã duyệt" value={approvedCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc danh sách</CardTitle>
          <CardDescription>Phiếu mới tạo được lưu ở trạng thái “Phiếu nháp”.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Tìm sinh viên..." />
          </div>
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger><SelectValue placeholder="Học kỳ" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả học kỳ</SelectItem>{semesters.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger><SelectValue placeholder="Năm học" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả năm học</SelectItem>{years.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={className} onValueChange={setClassName}>
            <SelectTrigger><SelectValue placeholder="Lớp" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{classes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1250px]">
                <TableHeader><TableRow><TableHead>Sinh viên</TableHead><TableHead>Lớp</TableHead><TableHead>Kỳ đánh giá</TableHead><TableHead>GPA</TableHead><TableHead>Xếp loại học lực</TableHead><TableHead>Điểm gốc</TableHead><TableHead>Nhận bù</TableHead><TableHead>Điểm RL</TableHead><TableHead>Xếp loại rèn luyện</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><p className="font-medium">{item.student_name}</p><p className="text-xs text-muted-foreground">{item.student_id}</p></TableCell>
                      <TableCell>{item.class_name}</TableCell>
                      <TableCell>{item.semester} · {item.year}</TableCell>
                      <TableCell className="font-semibold">{item.academic_gpa ?? "-"}</TableCell>
                      <TableCell><Badge variant="outline">{item.academic_classification || "Chưa có dữ liệu"}</Badge></TableCell>
                      <TableCell>{item.base_score}</TableCell>
                      <TableCell>{item.carry_in > 0 ? <Badge className="bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/10">+{item.carry_in}</Badge> : "-"}</TableCell>
                      <TableCell className="text-lg font-bold">{item.total_score}</TableCell>
                      <TableCell><Badge variant="outline" className={classificationColor(item.classification)}>{item.classification}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={statusClasses[item.status]}>{statusLabels[item.status] || item.status}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setViewing(item)}><Eye className="mr-1 h-4 w-4" />Xem phiếu</Button></TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && <TableRow><TableCell colSpan={11} className="h-32 text-center text-muted-foreground">Không tìm thấy phiếu đánh giá phù hợp.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu đánh giá</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                <div className="flex-1"><p className="text-lg font-semibold">{viewing.student_name}</p><p className="text-sm text-muted-foreground">{viewing.student_id} · {viewing.class_name}</p><p className="mt-1 text-sm">{viewing.semester} · {viewing.year}</p></div>
                <div className="text-left sm:text-right"><p className="text-4xl font-bold">{viewing.total_score}</p><Badge variant="outline" className={classificationColor(viewing.classification)}>{viewing.classification}</Badge></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">GPA học kỳ (hệ 4)</p><p className="mt-1 text-2xl font-bold">{viewing.academic_gpa ?? "-"}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Xếp loại học lực</p><p className="mt-1 font-semibold">{viewing.academic_classification || "Chưa có dữ liệu"}</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <ScoreLedger label="Điểm phát sinh" value={viewing.raw_score} />
                <ScoreLedger label="Điểm gốc tính kỳ" value={viewing.base_score} />
                <ScoreLedger label="Nhận bù từ kỳ khác" value={viewing.carry_in} prefix />
                <ScoreLedger label="Số dư còn chuyển tiếp" value={viewing.surplus_balance} prefix />
              </div>
              {viewing.carry_out > 0 && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-800">Đã dùng <strong>{viewing.carry_out} điểm dư</strong> của học kỳ này để bù cho học kỳ thiếu điểm.</div>}
              <div className="space-y-4">
                {viewingCriteria.map((criterion) => {
                  const score = viewing.scores[String(criterion.id)] || 0;
                  return <div key={criterion.id}><div className="mb-1.5 flex justify-between gap-4 text-sm"><span><strong className="text-primary">{criterion.code}.</strong> {criterion.name}</span><strong>{score}/{criterion.max_score}</strong></div><Progress value={criterion.max_score ? (score / criterion.max_score) * 100 : 0} /></div>;
                })}
              </div>
              {viewing.note && <div className="rounded-lg bg-muted/40 p-3 text-sm"><strong>Ghi chú:</strong> {viewing.note}</div>}
              <div className="flex justify-between border-t pt-4 text-sm"><span className="text-muted-foreground">Trạng thái</span><Badge variant="outline" className={statusClasses[viewing.status]}>{statusLabels[viewing.status] || viewing.status}</Badge></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return <Card><CardContent className="flex items-center gap-3 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon || <ClipboardList className="h-5 w-5" />}</div><div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function ScoreLedger({ label, value, prefix = false }: { label: string; value: number; prefix?: boolean }) {
  return <div className="rounded-xl border p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{prefix && value > 0 ? "+" : ""}{value}</p></div>;
}
