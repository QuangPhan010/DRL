import { useState } from "react";
import { ClipboardCheck, Users, Eye, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { mockStudents, mockEvaluations, mockCriteria, Evaluation, classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

export default function ClassReview() {
  const [evals, setEvals] = useState<Evaluation[]>(
    mockEvaluations.filter(e => {
      const student = mockStudents.find(s => s.studentId === e.studentId);
      return student?.className === "CNTT-K20A" && e.semester === "HK1" && e.year === "2024-2025";
    })
  );

  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const confirmedCount = evals.filter(e => e.classConfirmed || e.status === "approved").length;
  const pendingCount = evals.filter(e => !e.classConfirmed && e.status !== "approved").length;
  const totalCount = evals.length;

  const handleConfirmSingle = (id: string) => {
    setEvals(evals.map(e => e.id === id ? { ...e, classConfirmed: true, status: "advisor_pending" as const } : e));
    setIsDetailOpen(false);
    toast.success("Đã xác nhận kết quả bước đầu của sinh viên!");
  };

  const handleClassSubmit = () => {
    setEvals(evals.map(e => ({ ...e, classConfirmed: true, status: "advisor_pending" as const })));
    toast.success("Đã nộp toàn bộ danh sách điểm rèn luyện của lớp lên Cố vấn học tập!");
  };

  const getStatusBadge = (e: Evaluation) => {
    if (e.classConfirmed) {
      return <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">Đã xác nhận lớp</Badge>;
    }
    if (e.status === "pending") {
      return <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0">Chờ cán sự rà soát</Badge>;
    }
    if (e.status === "rejected") {
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0">Bị từ chối</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0">Nháp</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7 text-primary" />Rà soát điểm rèn luyện lớp
          </h1>
          <p className="text-muted-foreground mt-1">Dành cho Ban cán sự lớp: Rà soát điểm và xác nhận bước đầu cuối học kỳ.</p>
        </div>

        {pendingCount > 0 ? (
          <Button onClick={handleClassSubmit} className="bg-gradient-primary gap-2">
            <Send className="h-4 w-4" />Nộp toàn bộ lên Cố vấn ({pendingCount})
          </Button>
        ) : (
          <Badge className="bg-success/10 text-success p-2.5 border border-success/30 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />Đã hoàn thành rà soát lớp
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Tổng số sinh viên lớp</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success to-emerald-400 flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold">{confirmedCount}</p>
              <p className="text-sm text-muted-foreground">Đã xác nhận</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning to-orange-400 flex items-center justify-center shadow-md">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Chờ rà soát</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-lg">Danh sách rèn luyện lớp CNTT-K20A</CardTitle>
          <CardDescription>Học kỳ 1 năm học 2024-2025</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Sinh viên</TableHead>
                <TableHead>Mã SV</TableHead>
                <TableHead>Điểm tự chấm</TableHead>
                <TableHead>Xếp loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evals.map(e => {
                const s = mockStudents.find(student => student.studentId === e.studentId);
                return (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="font-medium">{s?.fullName}</p>
                      <p className="text-xs text-muted-foreground">{s?.email}</p>
                    </TableCell>
                    <TableCell>{e.studentId}</TableCell>
                    <TableCell className="font-display font-bold">{e.totalScore}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={classificationColor(e.classification)}>
                        {e.classification}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(e)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelectedEval(e); setIsDetailOpen(true); }}>
                        <Eye className="h-4 w-4" /> Rà soát
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Review Details */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Rà soát chi tiết điểm rèn luyện</DialogTitle>
          </DialogHeader>
          {selectedEval && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-card border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base">{mockStudents.find(s => s.studentId === selectedEval.studentId)?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEval.studentId} • Lớp CNTT-K20A</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold">{selectedEval.totalScore}</p>
                  <Badge variant="outline" className={classificationColor(selectedEval.classification)}>{selectedEval.classification}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-sm border-b pb-2">Chi tiết điểm các tiêu chí chính</p>
                {mockCriteria.map(c => {
                  const sc = selectedEval.scores[c.id] || 0;
                  return (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span><span className="text-primary font-bold">{c.code}.</span> {c.name}</span>
                        <span className="font-semibold">{sc}/{c.maxScore}</span>
                      </div>
                      <Progress value={(sc / c.maxScore) * 100} />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewNote">Ý kiến của Ban cán sự lớp (nếu có)</Label>
                <Textarea id="reviewNote" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Nhập nhận xét hoặc lưu ý..." />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Quay lại</Button>
                {!selectedEval.classConfirmed && (
                  <Button className="bg-success hover:bg-success/90 gap-1" onClick={() => handleConfirmSingle(selectedEval.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Xác nhận rà soát
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
