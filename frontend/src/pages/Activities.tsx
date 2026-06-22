import { useState } from "react";
import { CalendarDays, Plus, Users, Award, CheckCircle2, Clock, Upload, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mockActivities, mockCriteria, Activity, mockStudents } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Activities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Form states for creating activity
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("5");
  const [criterionId, setCriterionId] = useState("c3");
  const [date, setDate] = useState("2026-06-30");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      title,
      description,
      points: Number(points),
      criterionId,
      date,
      organizer: user?.fullName || "Đơn vị Tổ chức",
      status: "upcoming",
      participants: []
    };
    setActivities([newAct, ...activities]);
    setIsCreateOpen(false);
    toast.success("Đã tạo hoạt động mới thành công!");
    // Reset form
    setTitle(""); setDescription(""); setPoints("5"); setCriterionId("c3");
  };

  const registerActivity = (id: string) => {
    setActivities(activities.map(act => {
      if (act.id === id) {
        // Avoid duplicate
        if (act.participants.some(p => p.studentId === user?.studentId)) return act;
        return {
          ...act,
          participants: [
            ...act.participants,
            { studentId: user?.studentId || "SV001", fullName: user?.fullName || "Lê Minh Sinh Viên", className: "CNTT-K20A", status: "registered" }
          ]
        };
      }
      return act;
    }));
    toast.success("Đăng ký tham gia hoạt động thành công!");
  };

  const submitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    setActivities(activities.map(act => {
      if (act.id === selectedActivity.id) {
        const updatedParticipants = act.participants.map(p => {
          if (p.studentId === user?.studentId) {
            return { ...p, status: "evidence_submitted" as const, evidenceUrl };
          }
          return p;
        });
        // Check if student was not already a participant (adhoc registration + submit)
        const exists = act.participants.some(p => p.studentId === user?.studentId);
        if (!exists) {
          updatedParticipants.push({
            studentId: user?.studentId || "SV001",
            fullName: user?.fullName || "Lê Minh Sinh Viên",
            className: "CNTT-K20A",
            status: "evidence_submitted",
            evidenceUrl
          });
        }
        return { ...act, participants: updatedParticipants };
      }
      return act;
    }));
    setIsEvidenceOpen(false);
    setEvidenceUrl("");
    toast.success("Đã nộp minh chứng thành công! Đang chờ duyệt cộng điểm.");
  };

  const confirmAttended = (activityId: string, studentId: string) => {
    setActivities(activities.map(act => {
      if (act.id === activityId) {
        return {
          ...act,
          participants: act.participants.map(p => p.studentId === studentId ? { ...p, status: "attended" as const } : p)
        };
      }
      return act;
    }));
    toast.success("Đã xác nhận hoàn thành hoạt động cho sinh viên!");
  };

  const approvePoints = (activityId: string) => {
    setActivities(activities.map(act => {
      if (act.id === activityId) {
        return { ...act, status: "completed" as const };
      }
      return act;
    }));
    toast.success("Đã duyệt đề xuất cộng điểm rèn luyện cho toàn bộ danh sách!");
    setIsParticipantsOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-primary" />Quản lý Hoạt động Ngoại khóa
          </h1>
          <p className="text-muted-foreground mt-1">Đăng ký tham gia, nộp minh chứng hoặc đề xuất cộng điểm rèn luyện.</p>
        </div>

        {(user?.role === "organizer" || user?.role === "admin") && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-primary gap-2">
            <Plus className="h-4 w-4" />Tạo hoạt động
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map(act => {
          const isRegistered = act.participants.some(p => p.studentId === user?.studentId);
          const studentStatus = act.participants.find(p => p.studentId === user?.studentId)?.status;
          const criterion = mockCriteria.find(c => c.id === act.criterionId);

          return (
            <Card key={act.id} className="border-0 shadow-md bg-gradient-card flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">{criterion?.name || "Tiêu chí"}</Badge>
                  <Badge variant={act.status === "completed" ? "secondary" : "default"} className={act.status === "completed" ? "bg-success/15 text-success hover:bg-success/20 border-0" : "bg-warning/15 text-warning hover:bg-warning/20 border-0 text-black dark:text-white"}>
                    {act.status === "completed" ? "Đã hoàn thành" : "Sắp diễn ra"}
                  </Badge>
                </div>
                <CardTitle className="font-display text-lg font-bold mt-3 leading-snug line-clamp-2">{act.title}</CardTitle>
                <CardDescription className="line-clamp-3 text-sm mt-1">{act.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex justify-between items-center text-xs border-t pt-3">
                  <div>
                    <span className="text-muted-foreground block">Ngày diễn ra</span>
                    <span className="font-medium">{act.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground block">Điểm đề xuất</span>
                    <span className="font-bold text-primary text-sm">+{act.points} điểm</span>
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{act.participants.length} người đăng ký</span>
                  </div>

                  {user?.role === "student" && (
                    <div className="flex gap-2">
                      {!isRegistered && act.status === "upcoming" && (
                        <Button size="sm" onClick={() => registerActivity(act.id)}>Đăng ký</Button>
                      )}
                      {isRegistered && studentStatus === "registered" && (
                        <Badge variant="outline" className="bg-primary/5 text-primary">Đã đăng ký</Badge>
                      )}
                      {studentStatus === "attended" && (
                        <Badge variant="outline" className="bg-success/5 text-success">Đã tham gia</Badge>
                      )}
                      {studentStatus === "evidence_submitted" && (
                        <Badge variant="outline" className="bg-warning/5 text-warning">Đã nộp minh chứng</Badge>
                      )}
                      {act.status === "completed" && studentStatus !== "attended" && studentStatus !== "evidence_submitted" && (
                        <Button size="sm" variant="outline" className="gap-1 border-primary/30 text-primary" onClick={() => { setSelectedActivity(act); setIsEvidenceOpen(true); }}>
                          <Upload className="h-3 w-3" /> Nộp minh chứng
                        </Button>
                      )}
                    </div>
                  )}

                  {(user?.role === "organizer" || user?.role === "admin" || user?.role === "advisor") && (
                    <Button size="sm" variant="outline" className="gap-1 border-primary/20" onClick={() => { setSelectedActivity(act); setIsParticipantsOpen(true); }}>
                      Danh sách ({act.participants.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog: Create Activity */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Tạo hoạt động rèn luyện</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tên hoạt động</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ví dụ: Hội thao khoa CNTT..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả hoạt động</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Mô tả nội dung, thời gian và địa điểm..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="points">Điểm rèn luyện</Label>
                <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} required min="1" max="25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criterion">Tiêu chí áp dụng</Label>
                <Select value={criterionId} onValueChange={setCriterionId}>
                  <SelectTrigger id="criterion"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockCriteria.map(c => <SelectItem key={c.id} value={c.id}>{c.code}. {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Ngày tổ chức</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Tạo mới</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Submit Evidence */}
      <Dialog open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Nộp minh chứng hoạt động</DialogTitle></DialogHeader>
          <form onSubmit={submitEvidence} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 text-sm">
              <p className="font-semibold text-primary">{selectedActivity?.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Điểm cộng dự kiến: +{selectedActivity?.points} điểm</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evidenceUrl">Đường dẫn minh chứng (URL chứng chỉ, hình ảnh)</Label>
              <Input id="evidenceUrl" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} required placeholder="https://drive.google.com/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEvidenceOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Nộp minh chứng</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Participants List */}
      <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Danh sách tham gia hoạt động</DialogTitle>
            <CardDescription>{selectedActivity?.title} ({selectedActivity?.date})</CardDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl">
                <div>
                  <p className="text-sm font-semibold">Tình trạng: {selectedActivity.status === "completed" ? "Đã hoàn thành" : "Sắp diễn ra"}</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.participants.length} sinh viên tham gia</p>
                </div>
                {selectedActivity.status === "upcoming" && (user?.role === "organizer" || user?.role === "admin") && (
                  <Button size="sm" onClick={() => approvePoints(selectedActivity.id)} className="bg-success hover:bg-success/90 gap-1">
                    <Check className="h-4 w-4" /> Hoàn thành & Đề xuất điểm
                  </Button>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã SV</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Lớp</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedActivity.participants.map(p => (
                    <TableRow key={p.studentId}>
                      <TableCell className="font-medium">{p.studentId}</TableCell>
                      <TableCell>{p.fullName}</TableCell>
                      <TableCell>{p.className}</TableCell>
                      <TableCell>
                        {p.status === "registered" && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đã đăng ký</Badge>}
                        {p.status === "attended" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã tham gia</Badge>}
                        {p.status === "evidence_submitted" && (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Minh chứng đã nộp</Badge>
                            {p.evidenceUrl && <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline truncate max-w-[120px]">Xem file</a>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "evidence_submitted" && (user?.role === "organizer" || user?.role === "admin") && (
                          <Button size="xs" onClick={() => confirmAttended(selectedActivity.id, p.studentId)} className="bg-success text-white hover:bg-success/90 text-xs px-2 py-1 h-7">
                            Xác nhận điểm
                          </Button>
                        )}
                        {p.status === "registered" && (user?.role === "organizer" || user?.role === "admin") && (
                          <Button size="xs" onClick={() => confirmAttended(selectedActivity.id, p.studentId)} className="bg-primary text-white hover:bg-primary/90 text-xs px-2 py-1 h-7">
                            Điểm danh
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedActivity.participants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Chưa có sinh viên nào đăng ký tham gia.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
