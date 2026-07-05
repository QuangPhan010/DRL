import { useState, useEffect } from "react";
import { ClipboardCheck, Users, Eye, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

export default function ClassReview() {
  const { user } = useAuth();
  const [evals, setEvals] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("CNTT-K20A");

  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchClassAndEvals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Fetch criteria to display details
      const criteriaRes = await fetch(`${API_URL}/criteria/?all=true`, { headers });
      if (criteriaRes.ok) {
        const criteriaData = await criteriaRes.json();
        setCriteria(criteriaData);
      }

      // 2. Fetch monitor profile to detect class
      let detectedClass = "CNTT-K20A";
      if (user?.studentId) {
        const studentRes = await fetch(`${API_URL}/students/?studentId=${user.studentId}`, { headers });
        if (studentRes.ok) {
          const students = await studentRes.json();
          if (students && students.length > 0) {
            detectedClass = students[0].class_name || "CNTT-K20A";
            setClassName(detectedClass);
          }
        }
      }

      // 3. Fetch evaluations for class
      const evalRes = await fetch(`${API_URL}/evaluations/?className=${encodeURIComponent(detectedClass)}`, { headers });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvals(evalData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải dữ liệu rà soát lớp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassAndEvals();
  }, [user]);

  const confirmedCount = evals.filter(e => e.class_confirmed || e.status === "approved" || e.status === "advisor_pending").length;
  const pendingCount = evals.filter(e => !e.class_confirmed && e.status === "class_pending").length;
  const totalCount = evals.length;

  const handleConfirmSingle = async (id: number) => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/evaluations/${id}/review/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reviewNote })
      });

      if (res.ok) {
        toast.success("Đã xác nhận kết quả bước đầu của sinh viên!");
        fetchClassAndEvals();
        setIsDetailOpen(false);
        setReviewNote("");
      } else {
        toast.error("Không thể xác nhận kết quả");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleClassSubmit = async () => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const pending = evals.filter(e => !e.class_confirmed && e.status === "class_pending");
      if (pending.length === 0) return;

      toast.loading("Đang nộp toàn bộ...");
      
      await Promise.all(pending.map(e => 
        fetch(`${API_URL}/evaluations/${e.id}/review/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ reviewNote: "Ban cán sự lớp duyệt hàng loạt" })
        })
      ));

      toast.dismiss();
      toast.success("Đã nộp toàn bộ danh sách điểm rèn luyện của lớp lên Cố vấn học tập!");
      fetchClassAndEvals();
    } catch (err) {
      toast.dismiss();
      toast.error("Lỗi nộp hàng loạt");
    }
  };

  const getStatusBadge = (e: any) => {
    if (e.class_confirmed || e.status === "advisor_pending") {
      return <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">Đã xác nhận lớp</Badge>;
    }
    if (e.status === "class_pending" || e.status === "pending") {
      return <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0">Chờ cán sự rà soát</Badge>;
    }
    if (e.status === "approved") {
      return <Badge className="bg-green-600 text-white border-0">Đã duyệt hoàn tất</Badge>;
    }
    if (e.status === "rejected") {
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0">Bị từ chối</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0">Nháp</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải dữ liệu rà soát lớp...</p>
      </div>
    );
  }

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
          <CardTitle className="font-display text-lg">Danh sách rèn luyện lớp {className}</CardTitle>
          <CardDescription>Các phiếu đang chờ cán bộ lớp rà soát sau khi sinh viên tự đánh giá.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[750px]">
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
                return (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell>
                      <p className="font-medium">{e.student_name}</p>
                      <p className="text-xs text-muted-foreground">{e.student_id.toLowerCase()}@student.itc.edu.vn</p>
                    </TableCell>
                    <TableCell>{e.student_id}</TableCell>
                    <TableCell className="font-display font-bold">{e.total_score}</TableCell>
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
              {evals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Không có phiếu đánh giá rèn luyện nào cho lớp {className} trong học kỳ này.
                  </TableCell>
                </TableRow>
              )}
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
                  <p className="font-semibold text-base">{selectedEval.student_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedEval.student_id} • Lớp {className}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold">{selectedEval.total_score}</p>
                  <Badge variant="outline" className={classificationColor(selectedEval.classification)}>{selectedEval.classification}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-sm border-b pb-2">Chi tiết điểm các tiêu chí chính</p>
                {criteria.filter(c => c.criteria_set === selectedEval.criteria_set).map(c => {
                  const sc = selectedEval.scores[c.id] || 0;
                  return (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span><span className="text-primary font-bold">{c.code}.</span> {c.name}</span>
                        <span className="font-semibold">{sc}/{c.max_score}</span>
                      </div>
                      <Progress value={(sc / c.max_score) * 100} />
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
                {!selectedEval.class_confirmed && selectedEval.status === "class_pending" && (
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
