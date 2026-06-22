import { useState } from "react";
import { FileCheck, CheckCircle2, XCircle, Eye, Clock, Lock, FileDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { mockEvaluations, mockStudents, mockCriteria, Evaluation, classificationColor } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Approvals() {
  const { user } = useAuth();
  const [evals, setEvals] = useState(mockEvaluations);
  const [viewing, setViewing] = useState<Evaluation | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [locked, setLocked] = useState(false);

  const isAdvisor = user?.role === "advisor";
  const isAffairs = user?.role === "student_affairs" || user?.role === "admin";

  const pending = evals.filter(e => {
    if (isAdvisor) return e.status === "advisor_pending";
    if (isAffairs) return e.status === "pending";
    return e.status === "pending" || e.status === "advisor_pending";
  });
  const approved = evals.filter(e => e.status === "approved");
  const rejected = evals.filter(e => e.status === "rejected");

  const decide = (id: string, status: "approved" | "rejected" | "pending") => {
    setEvals(evals.map(e => e.id === id ? { ...e, status, reviewNote } : e));
    setViewing(null); setReviewNote("");
    if (status === "pending") {
      toast.success("Đã phê duyệt cấp lớp & gửi lên Phòng Công tác Sinh viên");
    } else if (status === "approved") {
      toast.success("Đã phê duyệt hoàn tất phiếu rèn luyện của sinh viên");
    } else {
      toast.success("Đã từ chối / yêu cầu bổ sung minh chứng");
    }
  };

  const handleLockResults = () => {
    setLocked(true);
    toast.success("Đã khóa kết quả điểm rèn luyện Học kỳ 1 2024-2025!");
  };

  const handleExportReport = () => {
    toast.success("Đã xuất báo cáo chính thức (PDF/Excel) thành công!");
  };

  const renderTable = (items: Evaluation[]) => (
    <Card className="border-0 shadow-md">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Sinh viên</TableHead>
              <TableHead className="hidden md:table-cell">Lớp</TableHead>
              <TableHead>Học kỳ</TableHead>
              <TableHead>Điểm</TableHead>
              <TableHead className="hidden md:table-cell">Xếp loại</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày nộp</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(e => {
              const s = mockStudents.find(x => x.studentId === e.studentId);
              return (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary text-white flex items-center justify-center text-xs font-semibold">
                        {s?.fullName.split(" ").slice(-1)[0][0]}
                      </div>
                      <div>
                        <p className="font-medium">{s?.fullName}</p>
                        <p className="text-xs text-muted-foreground">{e.studentId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary">{s?.className}</Badge></TableCell>
                  <TableCell className="text-sm">{e.semester} {e.year}</TableCell>
                  <TableCell><span className="font-display font-bold">{e.totalScore}</span></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={classificationColor(e.classification)}>{e.classification}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{e.submittedAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setViewing(e); setReviewNote(e.reviewNote ?? ""); }}>
                      <Eye className="h-4 w-4" /> Xem
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Không có phiếu nào</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const stats = [
    { label: "Chờ duyệt", value: pending.length, icon: Clock, color: "from-warning to-orange-400" },
    { label: "Đã duyệt hoàn tất", value: approved.length, icon: CheckCircle2, color: "from-success to-emerald-400" },
    { label: "Đã từ chối / Bổ sung", value: rejected.length, icon: XCircle, color: "from-destructive to-red-400" },
  ];

  const viewingStudent = viewing && mockStudents.find(s => s.studentId === viewing.studentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3"><FileCheck className="h-7 w-7 text-primary" />Xét duyệt phiếu đánh giá</h1>
          <p className="text-muted-foreground mt-1">
            {isAdvisor && "Cố vấn học tập: Kiểm tra, yêu cầu bổ sung hoặc duyệt gửi lên Trường."}
            {isAffairs && "Phòng Công tác sinh viên: Phê duyệt cuối cùng, khóa kết quả và xuất báo cáo."}
            {!isAdvisor && !isAffairs && "Duyệt hoặc từ chối các phiếu đánh giá điểm rèn luyện của sinh viên."}
          </p>
        </div>

        {isAffairs && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-primary/20" onClick={handleExportReport}>
              <FileDown className="h-4 w-4" />Xuất báo cáo chính thức
            </Button>
            <Button disabled={locked} onClick={handleLockResults} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              <Lock className="h-4 w-4" />{locked ? "Đã khóa kết quả" : "Khóa kết quả cuối cùng"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-md bg-gradient-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-display text-3xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-3 w-full md:w-fit">
          <TabsTrigger value="pending">Chờ duyệt ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Đã duyệt ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Từ chối / Bổ sung ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">{renderTable(pending)}</TabsContent>
        <TabsContent value="approved" className="mt-4">{renderTable(approved)}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderTable(rejected)}</TabsContent>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle className="font-display">Chi tiết phiếu đánh giá</DialogTitle></DialogHeader>
          {viewing && viewingStudent && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-card border flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {viewingStudent.fullName.split(" ").slice(-1)[0][0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{viewingStudent.fullName}</p>
                  <p className="text-sm text-muted-foreground">{viewing.studentId} • {viewingStudent.className} • {viewing.semester} {viewing.year}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold">{viewing.totalScore}</p>
                  <Badge variant="outline" className={classificationColor(viewing.classification)}>{viewing.classification}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {mockCriteria.map(c => {
                  const sc = viewing.scores[c.id] || 0;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span><span className="text-primary font-bold">{c.code}.</span> {c.name}</span>
                        <span className="font-semibold">{sc}/{c.maxScore}</span>
                      </div>
                      <Progress value={(sc / c.maxScore) * 100} />
                    </div>
                  );
                })}
              </div>

              {viewing.note && (
                <div className="p-3 rounded-lg bg-muted/40 text-sm"><span className="font-medium">Ghi chú sinh viên: </span>{viewing.note}</div>
              )}

              {viewing.status !== "approved" && viewing.status !== "rejected" && (
                <div className="space-y-2"><Label>Nhận xét / Yêu cầu bổ sung</Label>
                  <Textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Nhập lý do nếu từ chối hoặc cần bổ sung minh chứng..." rows={3} />
                </div>
              )}
            </div>
          )}
          {viewing && viewing.status !== "approved" && viewing.status !== "rejected" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => decide(viewing.id, "rejected")}>
                <XCircle className="h-4 w-4" />Yêu cầu bổ sung
              </Button>

              {isAdvisor && (
                <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => decide(viewing.id, "pending")}>
                  <CheckCircle2 className="h-4 w-4" />Duyệt gửi lên trường
                </Button>
              )}

              {isAffairs && (
                <Button className="gap-2 bg-success hover:bg-success/90" onClick={() => decide(viewing.id, "approved")}>
                  <CheckCircle2 className="h-4 w-4" />Phê duyệt cuối cùng
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
