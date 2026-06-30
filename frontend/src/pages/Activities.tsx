import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Users, Award, CheckCircle2, Clock, Upload, Check, Trash2, QrCode, MapPin, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mockActivities, mockCriteria, Activity, mockStudents } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExternalActivities from "./ExternalActivities";

export default function Activities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const [activities, setActivities] = useState<Activity[]>([]);

  const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return null;
    const parts = dateStr.split('-');
    const timeParts = timeStr.split(':');
    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      Number(timeParts[0]),
      Number(timeParts[1]),
      timeParts[2] ? Number(timeParts[2]) : 0
    );
  };
  const [criteria, setCriteria] = useState<any[]>(mockCriteria);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const handleOpenCreateChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setTitle("");
      setDescription("");
      setPoints("5");
      setCriterionId("c1");
      setDate("2026-06-30");
      setStartTime("08:00");
      setEndTime("11:00");
      setIsEditing(false);
      setEditActivityId(null);
      setScope("internal");
      setOrganizerName("");
      setLocation("");
      setEndDate("2026-06-30");
      setActivityType("Hoạt động xã hội");
    }
  };
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Time picker states
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');

  // Simulation states
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCheckInSimOpen, setIsCheckInSimOpen] = useState(false);
  const [isCheckOutSimOpen, setIsCheckOutSimOpen] = useState(false);
  const [simLat, setSimLat] = useState("10.850100");
  const [simLon, setSimLon] = useState("106.771200");
  const [simSelfie, setSimSelfie] = useState("selfie_sim.png");
  const [simDeviceId, setSimDeviceId] = useState("phone_device_sim");

  const openCheckInSim = (act: Activity) => {
    setSelectedActivity(act);
    setSimLat(act.latitude ? act.latitude.toString() : "10.850100");
    setSimLon(act.longitude ? act.longitude.toString() : "106.771200");
    setSimSelfie("selfie_sv_in.png");
    setSimDeviceId("device_" + (user?.studentId || "SV001"));
    setIsCheckInSimOpen(true);
  };

  const openCheckOutSim = (act: Activity) => {
    setSelectedActivity(act);
    setSimLat(act.latitude ? act.latitude.toString() : "10.850100");
    setSimLon(act.longitude ? act.longitude.toString() : "106.771200");
    setSimSelfie("selfie_sv_out.png");
    setSimDeviceId("device_" + (user?.studentId || "SV001"));
    setIsCheckOutSimOpen(true);
  };

  const getRealLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ Geolocation định vị.");
      return;
    }
    toast.info("Đang yêu cầu truy cập vị trí thiết bị...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSimLat(position.coords.latitude.toFixed(6));
        setSimLon(position.coords.longitude.toFixed(6));
        toast.success("Lấy tọa độ thực tế thành công!");
      },
      (error) => {
        console.error("Lỗi lấy GPS:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Bạn đã từ chối quyền định vị GPS.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Vị trí không khả dụng.");
            break;
          case error.TIMEOUT:
            toast.error("Hết hạn thời gian tìm vị trí.");
            break;
          default:
            toast.error("Lỗi xác định vị trí thực tế.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getCheckoutStatus = (act: Activity) => {
    if (!act.check_in_time) return { enabled: false, text: "Chưa Check-in", remaining: null };
    const duration = act.duration_minutes || 180;
    const checkIn = new Date(act.check_in_time);
    const now = new Date();
    const elapsedMins = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));
    const remainingMins = duration - elapsedMins;

    if (remainingMins <= 10) {
      return { enabled: true, text: `Check-out GPS (${remainingMins > 0 ? remainingMins : 0}p)`, remaining: remainingMins };
    }
    return {
      enabled: false,
      text: `Check-out khóa (còn ${remainingMins}p)`,
      remaining: remainingMins
    };
  };

  // Form states for creating activity
  const [scope, setScope] = useState<"internal" | "external">("internal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("5");
  const [criterionId, setCriterionId] = useState("c1");
  const [date, setDate] = useState("2026-06-30");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [isEditing, setIsEditing] = useState(false);
  const [editActivityId, setEditActivityId] = useState<string | null>(null);

  // Off-campus fields
  const [organizerName, setOrganizerName] = useState("");
  const [location, setLocation] = useState("");
  const [endDate, setEndDate] = useState("2026-06-30");
  const [activityType, setActivityType] = useState("Hoạt động xã hội");

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/activities/`);
      if (res.ok) {
        const data = await res.json();
        setActivities((data || []).map((act: any) => ({
          id: act.id.toString(),
          title: act.title,
          description: act.description,
          points: Number(act.points),
          criterionId: act.criterion ? `c${act.criterion}` : "c3",
          date: act.date,
          organizer: act.organizer,
          status: act.status,
          latitude: act.latitude ? Number(act.latitude) : undefined,
          longitude: act.longitude ? Number(act.longitude) : undefined,
          radius_meters: act.radius_meters ? Number(act.radius_meters) : undefined,
          duration_minutes: act.duration_minutes ? Number(act.duration_minutes) : undefined,
          check_in_time: act.check_in_time,
          start_time: act.start_time,
          end_time: act.end_time,
          participants: (act.participants || []).map((p: any) => ({
            studentId: p.student_id || p.student.toString(),
            fullName: p.student_name,
            className: p.class_name,
            status: p.status,
            evidenceUrl: p.evidence_url
          }))
        })));
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error(err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Fetch criteria if any
    const fetchCriteria = async () => {
      try {
        const res = await fetch(`${API_URL}/criteria/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const mapped = data.map((c: any) => ({
              id: `c${c.id}`,
              code: c.code,
              name: c.name,
              maxScore: Number(c.max_score),
              description: c.description
            }));
            setCriteria(mapped);
            if (mapped.length > 0) {
              setCriterionId(mapped[0].id);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCriteria();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 180;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        let diffMins = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMins < 0) diffMins += 24 * 60;
        return diffMins;
      };

      let res;
      if (scope === "internal") {
        const url = isEditing
          ? `${API_URL}/activities/${editActivityId}/`
          : `${API_URL}/activities/`;
        const method = isEditing ? "PUT" : "POST";
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            points: Number(points),
            criterion: Number(criterionId.replace(/\D/g, "")) || 3,
            date,
            organizer: user?.fullName || "Đơn vị Tổ chức",
            status: "upcoming",
            latitude: 10.850100,
            longitude: 106.771200,
            radius_meters: 100,
            duration_minutes: calculateDuration(startTime, endTime),
            start_time: startTime ? `${startTime}:00` : null,
            end_time: endTime ? `${endTime}:00` : null
          })
        });
      } else {
        const url = isEditing
          ? `${API_URL}/external-activities/${editActivityId}/`
          : `${API_URL}/external-activities/`;
        const method = isEditing ? "PUT" : "POST";
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify({
            activity_name: title,
            organizer_name: organizerName,
            start_date: date,
            end_date: endDate,
            location,
            activity_type: activityType,
            proposed_score: Number(points),
            description,
            status: "draft"
          })
        });
      }

      if (res.ok) {
        toast.success(isEditing ? "Đã cập nhật hoạt động thành công!" : "Đã tạo hoạt động thành công!");
        fetchActivities();
        window.dispatchEvent(new Event("refresh-external-activities"));
        setIsCreateOpen(false);
        setTitle("");
        setDescription("");
        setPoints("5");
        setCriterionId("c1");
        setStartTime("08:00");
        setEndTime("11:00");
        setIsEditing(false);
        setEditActivityId(null);
        setScope("internal");
        setOrganizerName("");
        setLocation("");
        setEndDate("2026-06-30");
        setActivityType("Hoạt động xã hội");
      } else {
        const errData = await res.json();
        console.error("Lỗi từ backend:", errData);
        toast.error("Không thể lưu hoạt động: " + JSON.stringify(errData));
      }
    } catch (err) {
      console.error("Lỗi kết nối:", err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const openEditActivity = (act: Activity) => {
    setTitle(act.title);
    setDescription(act.description || "");
    setPoints(act.points.toString());
    setCriterionId(act.criterionId);
    setDate(act.date);
    setStartTime(act.start_time ? act.start_time.substring(0, 5) : "08:00");
    setEndTime(act.end_time ? act.end_time.substring(0, 5) : "11:00");
    setIsEditing(true);
    setEditActivityId(act.id);
    setIsCreateOpen(true);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hoạt động này?")) return;
    try {
      const res = await fetch(`${API_URL}/activities/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa hoạt động thành công!");
        fetchActivities();
      } else {
        toast.error("Không thể xóa hoạt động");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const registerActivity = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/activities/${id}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId || "SV001"
        })
      });
      if (res.ok) {
        toast.success("Đăng ký tham gia hoạt động thành công!");
        fetchActivities();
      } else {
        toast.error("Không thể đăng ký tham gia");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const submitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    try {
      const res = await fetch(`${API_URL}/activities/${selectedActivity.id}/submit-evidence/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user?.studentId || "SV001",
          evidenceUrl: evidenceUrl
        })
      });
      if (res.ok) {
        toast.success("Đã nộp minh chứng thành công! Đang chờ duyệt cộng điểm.");
        fetchActivities();
        setIsEvidenceOpen(false);
        setEvidenceUrl("");
      } else {
        toast.error("Không thể nộp minh chứng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const confirmAttended = async (activityId: string, studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/activities/${activityId}/confirm-attended/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        toast.success("Đã xác nhận hoàn thành hoạt động cho sinh viên!");
        fetchActivities();
        // Keep updated local state for open dialog
        const updated = await res.json();
        setSelectedActivity({
          id: updated.id.toString(),
          title: updated.title,
          description: updated.description,
          points: Number(updated.points),
          criterionId: updated.criterion ? `c${updated.criterion}` : "c3",
          date: updated.date,
          organizer: updated.organizer,
          status: updated.status,
          latitude: updated.latitude ? Number(updated.latitude) : undefined,
          longitude: updated.longitude ? Number(updated.longitude) : undefined,
          radius_meters: updated.radius_meters ? Number(updated.radius_meters) : undefined,
          duration_minutes: updated.duration_minutes ? Number(updated.duration_minutes) : undefined,
          check_in_time: updated.check_in_time,
          start_time: updated.start_time,
          end_time: updated.end_time,
          participants: (updated.participants || []).map((p: any) => ({
            studentId: p.student_id || p.student.toString(),
            fullName: p.student_name,
            className: p.class_name,
            status: p.status,
            evidenceUrl: p.evidence_url
          }))
        });
      } else {
        toast.error("Không thể xác nhận điểm danh");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const approvePoints = async (activityId: string) => {
    try {
      const res = await fetch(`${API_URL}/activities/${activityId}/approve-points/`, {
        method: "POST"
      });
      if (res.ok) {
        toast.success("Đã duyệt đề xuất cộng điểm rèn luyện cho toàn bộ danh sách!");
        fetchActivities();
        setIsParticipantsOpen(false);
      } else {
        toast.error("Không thể duyệt hoạt động");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleCheckInSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/activities/${selectedActivity.id}/check-in/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId: user?.studentId || "SV001",
          latitude: parseFloat(simLat),
          longitude: parseFloat(simLon),
          selfieFileId: simSelfie,
          deviceId: simDeviceId,
          ipAddress: "127.0.0.1"
        })
      });
      const responseText = await res.text();
      if (res.ok) {
        const data = JSON.parse(responseText);
        toast.success(`Check-in thành công! Sai số GPS: ${data.distance_meters.toFixed(1)}m.`);
        fetchActivities();
        setIsCheckInSimOpen(false);
      } else {
        console.error("Lỗi 400/500 Check-in từ backend:", responseText);
        toast.error(`Lỗi check-in: ${responseText.substring(0, 100)}`);
      }
    } catch (err: any) {
      console.error("Lỗi kết nối Check-in:", err);
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const handleCheckOutSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/activities/${selectedActivity.id}/check-out/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId: user?.studentId || "SV001",
          latitude: parseFloat(simLat),
          longitude: parseFloat(simLon),
          selfieFileId: simSelfie,
          deviceId: simDeviceId,
          ipAddress: "127.0.0.1"
        })
      });
      const responseText = await res.text();
      if (res.ok) {
        const data = JSON.parse(responseText);
        const distText = data.distance_meters !== undefined ? ` Sai số GPS: ${Number(data.distance_meters).toFixed(1)}m.` : "";
        toast.success(`Check-out thành công!${distText}`);
        fetchActivities();
        setIsCheckOutSimOpen(false);
      } else {
        console.error("Lỗi 400/500 Check-out từ backend:", responseText);
        toast.error(`Lỗi check-out: ${responseText.substring(0, 100)}`);
      }
    } catch (err: any) {
      console.error("Lỗi kết nối Check-out:", err);
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    }
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

        {!userRoles.includes("student") && (
          <Button
            onClick={() => {
              setIsEditing(false);
              setEditActivityId(null);
              setTitle("");
              setDescription("");
              setPoints("5");
              setCriterionId("c1");
              setDate("2026-06-30");
              setStartTime("08:00");
              setEndTime("11:00");
              setIsCreateOpen(true);
            }}
            className="bg-gradient-primary gap-2"
          >
            <Plus className="h-4 w-4" />Tạo hoạt động
          </Button>
        )}
      </div>

      <Tabs defaultValue="internal" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="internal">Hoạt động trong trường</TabsTrigger>
          <TabsTrigger value="external">Hoạt động ngoài trường</TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(act => {
              const isRegistered = act.participants.some(p => p.studentId === user?.studentId);
              const studentStatus = act.participants.find(p => p.studentId === user?.studentId)?.status;
              const criterion = criteria.find(c => c.id === act.criterionId);

              const start = parseDateTime(act.date, act.start_time);
              const end = parseDateTime(act.date, act.end_time);
              const now = new Date();
              const isOngoing = act.status !== "completed" && start && end && now >= start && now <= end;
              const isEnded = act.status !== "completed" && end && now > end;

              return (
                <Card key={act.id} className="border-0 shadow-md bg-gradient-card flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20">{criterion?.name || "Tiêu chí"}</Badge>
                      {act.status === "completed" ? (
                        <Badge variant="secondary" className="bg-success/15 text-success hover:bg-success/20 border-0">
                          Đã hoàn thành
                        </Badge>
                      ) : isOngoing ? (
                        <Badge variant="default" className="bg-orange-500/15 text-orange-500 hover:bg-orange-500/20 border-0">
                          Đang diễn ra
                        </Badge>
                      ) : isEnded ? (
                        <Badge variant="default" className="bg-red-500/15 text-red-500 hover:bg-red-500/20 border-0">
                          Đã kết thúc
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-warning/15 text-warning hover:bg-warning/20 border-0 text-black dark:text-white">
                          Sắp diễn ra
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="font-display text-lg font-bold mt-3 leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors flex items-center justify-between gap-1.5" onClick={() => navigate(`/activities/${act.id}`)}>
                      <span>{act.title}</span>
                      <Eye className="h-4 w-4 opacity-50 shrink-0 hover:opacity-100" />
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-sm mt-1">{act.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex justify-between items-center text-xs border-t pt-3">
                      <div>
                        <span className="text-muted-foreground block">Thời gian diễn ra</span>
                        <span className="font-medium">
                          {act.date} {act.start_time && `(${act.start_time.substring(0, 5)} - ${act.end_time?.substring(0, 5)})`}
                        </span>
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

                      {userRoles.includes("student") && (
                        <div className="flex flex-wrap gap-2">
                          {!isRegistered && act.status === "upcoming" && (
                            <Button size="sm" onClick={() => registerActivity(act.id)}>Đăng ký</Button>
                          )}
                          {/* Check-in/out buttons hidden here - handled inside detail page */}
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

                      {!userRoles.includes("student") && (
                        <div className="flex flex-wrap gap-2 w-full justify-between items-center mt-2">
                          <div className="flex gap-1.5">
                            <Button size="xs" variant="outline" className="gap-1 border-primary/20 text-primary h-8 px-2" onClick={() => { setSelectedActivity(act); setIsQrOpen(true); }}>
                              <QrCode className="h-3.5 w-3.5" /> Mã QR
                            </Button>
                            <Button size="xs" variant="outline" className="gap-1 border-primary/20 h-8 px-2" onClick={() => { setSelectedActivity(act); setIsParticipantsOpen(true); }}>
                              Danh sách ({act.participants.length})
                            </Button>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="xs" className="h-8 px-2 text-amber-600 border border-amber-300 bg-transparent hover:bg-amber-50 hover:text-amber-700 transition-colors" onClick={() => openEditActivity(act)}>
                              Sửa
                            </Button>
                            <Button size="xs" className="h-8 px-2 text-red-600 border border-red-200 bg-transparent hover:bg-red-50 hover:text-red-700 transition-colors" onClick={() => handleDeleteActivity(act.id)}>
                              Xóa
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="external" className="mt-6">
          <ExternalActivities />
        </TabsContent>
      </Tabs>


      {/* Dialog: Create Activity */}
      <Dialog open={isCreateOpen} onOpenChange={handleOpenCreateChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? "Chỉnh sửa hoạt động rèn luyện" : "Tạo hoạt động rèn luyện"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Phạm vi hoạt động</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={scope === "internal" ? "default" : "outline"}
                  onClick={() => !isEditing && setScope("internal")}
                  className={scope === "internal" ? "bg-gradient-primary text-white font-medium shadow-sm" : ""}
                  disabled={isEditing}
                >
                  Trong trường
                </Button>
                <Button
                  type="button"
                  variant={scope === "external" ? "default" : "outline"}
                  onClick={() => !isEditing && setScope("external")}
                  className={scope === "external" ? "bg-gradient-primary text-white font-medium shadow-sm" : ""}
                  disabled={isEditing}
                >
                  Ngoài trường
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tên hoạt động</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ví dụ: Hội thao khoa CNTT..." />
            </div>

            {scope === "internal" ? (
              <>
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
                        {criteria.map(c => <SelectItem key={c.id} value={c.id}>{c.code}. {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="date">Ngày tổ chức</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Giờ bắt đầu</Label>
                    <Input
                      id="startTime"
                      type="text"
                      value={startTime}
                      readOnly
                      onClick={() => { setTimePickerTarget('start'); setIsTimePickerOpen(true); }}
                      className="cursor-pointer font-mono"
                      required
                      placeholder="Chọn giờ bắt đầu"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Giờ kết thúc</Label>
                    <Input
                      id="endTime"
                      type="text"
                      value={endTime}
                      readOnly
                      onClick={() => { setTimePickerTarget('end'); setIsTimePickerOpen(true); }}
                      className="cursor-pointer font-mono"
                      required
                      placeholder="Chọn giờ kết thúc"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Đơn vị tổ chức</Label>
                    <Input id="orgName" value={organizerName} onChange={e => setOrganizerName(e.target.value)} required placeholder="Ví dụ: Quận đoàn 9..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Địa điểm diễn ra</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} required placeholder="Ví dụ: Quận 9, TPHCM..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Điểm đề xuất</Label>
                    <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} required min="1" max="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Loại hoạt động ngoài trường</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger id="activityType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hoạt động xã hội">Hoạt động xã hội</SelectItem>
                        <SelectItem value="Cuộc thi khoa học">Cuộc thi khoa học</SelectItem>
                        <SelectItem value="Hoạt động thể thao">Hoạt động thể thao</SelectItem>
                        <SelectItem value="Kỹ năng mềm">Kỹ năng mềm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Ngày bắt đầu</Label>
                    <Input id="startDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Ngày kết thúc</Label>
                    <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả / Ghi chú</Label>
                  <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Mô tả chi tiết nội dung tham gia..." />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">
                {isEditing ? "Cập nhật" : "Tạo mới"}
              </Button>
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
                {selectedActivity.status === "upcoming" && !userRoles.includes("student") && (
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
                        {p.status === "evidence_submitted" && !userRoles.includes("student") && (
                          <Button size="xs" onClick={() => confirmAttended(selectedActivity.id, p.studentId)} className="bg-success text-white hover:bg-success/90 text-xs px-2 py-1 h-7">
                            Xác nhận điểm
                          </Button>
                        )}
                        {p.status === "registered" && !userRoles.includes("student") && (
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

      {/* Dialog: Display QR Code */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Mã QR Điểm Danh</DialogTitle>
            <DialogDescription className="text-center">Hãy đưa mã này cho sinh viên quét để Check-in/out.</DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="border p-3 rounded-2xl bg-white shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ activityId: Number(selectedActivity.id), token: "ACT_" + selectedActivity.id }))}`}
                  alt="QR Code"
                  className="h-44 w-44 object-contain"
                />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-primary">{selectedActivity.title}</p>
                <p className="text-xs text-muted-foreground font-mono">Token: ACT_{selectedActivity.id}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" onClick={() => setIsQrOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Simulate Check-In (GPS + Selfie) */}
      <Dialog open={isCheckInSimOpen} onOpenChange={setIsCheckInSimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MapPin className="h-5 w-5 text-success" /> Điểm danh hoạt động (Check-in)
            </DialogTitle>
            <DialogDescription>Xác thực vị trí GPS và ảnh chụp Selfie thực tế của bạn để hoàn tất điểm danh vào hoạt động.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckInSim} className="space-y-4">

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getRealLocation}
              className="w-full gap-2 border-primary text-primary h-9 text-xs"
            >
              <MapPin className="h-3.5 w-3.5" /> Sử dụng Vị trí Thực tế của thiết bị
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="simLat">Kinh độ (Latitude)</Label>
                <Input id="simLat" value={simLat} readOnly disabled className="bg-muted text-muted-foreground font-mono" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simLon">Vĩ độ (Longitude)</Label>
                <Input id="simLon" value={simLon} readOnly disabled className="bg-muted text-muted-foreground font-mono" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simSelfie">Ảnh chụp Selfie minh chứng (Chụp ảnh hoặc từ Album) *</Label>
              <Input
                id="simSelfie"
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  setSimSelfie(file ? file.name : "");
                }}
              />
            </div>

            <input id="simDeviceId" type="hidden" value={simDeviceId} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCheckInSimOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-success text-white hover:bg-success/90">Gửi Check-in</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Simulate Check-Out (GPS) */}
      <Dialog open={isCheckOutSimOpen} onOpenChange={setIsCheckOutSimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MapPin className="h-5 w-5 text-warning" /> Điểm danh kết thúc (Check-out)
            </DialogTitle>
            <DialogDescription>Xác thực vị trí GPS và ảnh chụp Selfie của bạn để hoàn tất thời gian tham gia hoạt động.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckOutSim} className="space-y-4">

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getRealLocation}
              className="w-full gap-2 border-primary text-primary h-9 text-xs"
            >
              <MapPin className="h-3.5 w-3.5" /> Sử dụng Vị trí Thực tế của thiết bị
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="simLatOut">Kinh độ (Latitude)</Label>
                <Input id="simLatOut" value={simLat} readOnly disabled className="bg-muted text-muted-foreground font-mono" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="simLonOut">Vĩ độ (Longitude)</Label>
                <Input id="simLonOut" value={simLon} readOnly disabled className="bg-muted text-muted-foreground font-mono" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simSelfieOut">Ảnh chụp Selfie xác nhận *</Label>
              <Input
                id="simSelfieOut"
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  setSimSelfie(file ? file.name : "");
                }}
              />
            </div>

            <input id="simDeviceIdOut" type="hidden" value={simDeviceId} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCheckOutSimOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-warning text-black dark:text-white hover:bg-warning/90">Gửi Check-out</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RadialTimePicker
        open={isTimePickerOpen}
        onClose={() => setIsTixmePickerOpen(false)}
        value={timePickerTarget === 'start' ? startTime : endTime}
        onChange={(val) => {
          if (timePickerTarget === 'start') {
            setStartTime(val);
          } else {
            setEndTime(val);
          }
        }}
        title={timePickerTarget === 'start' ? "Chọn giờ bắt đầu" : "Chọn giờ kết thúc"}
      />
    </div>
  );
}

interface RadialTimePickerProps {
  open: boolean;
  onClose: () => void;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  title?: string;
}

export function RadialTimePicker({ open, onClose, value, onChange, title = "Chọn giờ" }: RadialTimePickerProps) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setSelectedHour(isNaN(h) ? 6 : h);
      setSelectedMinute(isNaN(m) ? 0 : m);
    }
    setMode('hour');
  }, [value, open]);

  const handleOK = () => {
    const hh = selectedHour.toString().padStart(2, '0');
    const mm = selectedMinute.toString().padStart(2, '0');
    onChange(`${hh}:${mm}`);
    onClose();
  };

  const updateTimeFromCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = clientX - cx;
    const y = clientY - cy;
    const distance = Math.sqrt(x * x + y * y);
    
    // Calculate angle in radians, offset by -90 deg (top is 0)
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    if (mode === 'hour') {
      const isInner = distance < 68; // Inner circle for 12-23
      let hour = Math.round(angle * 12 / (2 * Math.PI)) % 12;
      if (isInner) {
        hour = hour === 0 ? 12 : hour + 12;
      } else {
        if (hour === 0) hour = 0;
      }
      setSelectedHour(hour);
    } else {
      let minute = Math.round(angle * 12 / (2 * Math.PI)) * 5 % 60;
      setSelectedMinute(minute);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    setIsDragging(true);
    updateTimeFromCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      e.preventDefault();
      updateTimeFromCoords(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false);
      if (mode === 'hour') {
        setMode('minute');
      }
    }
  };

  // Coordinates helpers
  const getCoords = (val: number, max: number, r: number) => {
    const angle = (val * 2 * Math.PI / max) - Math.PI / 2;
    return {
      x: 120 + r * Math.cos(angle),
      y: 120 + r * Math.sin(angle)
    };
  };

  // Render hour dial items
  const renderHourNumbers = () => {
    const numbers = [];
    // Outer circle (0-11)
    for (let i = 0; i < 12; i++) {
      const coords = getCoords(i, 12, 85);
      numbers.push(
        <text
          key={`out-${i}`}
          x={coords.x}
          y={coords.y + 4}
          textAnchor="middle"
          className={`text-[11px] font-semibold cursor-pointer select-none transition-all ${selectedHour === i ? 'fill-white' : 'fill-muted-foreground hover:fill-foreground'}`}
          onClick={() => setSelectedHour(i)}
        >
          {i === 0 ? '0' : i}
        </text>
      );
    }
    // Inner circle (12-23)
    for (let i = 12; i < 24; i++) {
      const coords = getCoords(i - 12, 12, 52);
      numbers.push(
        <text
          key={`in-${i}`}
          x={coords.x}
          y={coords.y + 4}
          textAnchor="middle"
          className={`text-[10px] font-medium cursor-pointer select-none transition-all ${selectedHour === i ? 'fill-white' : 'fill-muted-foreground hover:fill-foreground'}`}
          onClick={() => setSelectedHour(i)}
        >
          {i}
        </text>
      );
    }
    return numbers;
  };

  // Render minute dial items
  const renderMinuteNumbers = () => {
    const numbers = [];
    for (let i = 0; i < 60; i += 5) {
      const coords = getCoords(i, 60, 85);
      numbers.push(
        <text
          key={`min-${i}`}
          x={coords.x}
          y={coords.y + 4}
          textAnchor="middle"
          className={`text-[11px] font-semibold cursor-pointer select-none transition-all ${selectedMinute === i ? 'fill-white' : 'fill-muted-foreground hover:fill-foreground'}`}
          onClick={() => setSelectedMinute(i)}
        >
          {i === 0 ? '00' : i.toString().padStart(2, '0')}
        </text>
      );
    }
    return numbers;
  };

  // Calculate indicator position
  let activeRadius = 85;
  let activeAngleVal = 0;
  let activeMaxVal = 12;
  if (mode === 'hour') {
    if (selectedHour >= 12) {
      activeRadius = 52;
      activeAngleVal = selectedHour - 12;
    } else {
      activeRadius = 85;
      activeAngleVal = selectedHour;
    }
    activeMaxVal = 12;
  } else {
    activeRadius = 85;
    activeAngleVal = selectedMinute;
    activeMaxVal = 60;
  }
  const indicatorCoords = getCoords(activeAngleVal, activeMaxVal, activeRadius);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[320px] p-0 overflow-hidden rounded-3xl border shadow-2xl bg-background animate-in fade-in zoom-in duration-200">
        {/* Header/Title */}
        <div className="p-4 pt-5 pb-2 text-sm font-semibold text-muted-foreground text-center">
          {title}
        </div>

        {/* Time display panel */}
        <div className="flex justify-center items-center gap-2 px-6 py-4 bg-muted/20 border-y">
          <button
            type="button"
            onClick={() => setMode('hour')}
            className={`px-5 py-3 rounded-2xl text-4xl font-bold transition-all ${
              mode === 'hour'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {selectedHour.toString().padStart(2, '0')}
          </button>
          <span className="text-3xl font-bold text-muted-foreground">:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            className={`px-5 py-3 rounded-2xl text-4xl font-bold transition-all ${
              mode === 'minute'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {selectedMinute.toString().padStart(2, '0')}
          </button>
        </div>

        {/* Radial Dial Wheel */}
        <div className="flex justify-center items-center py-6 bg-background">
          <div className="relative w-[240px] h-[240px] rounded-full bg-muted/30 shadow-inner flex items-center justify-center">
            <svg
              ref={svgRef}
              width="240"
              height="240"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 cursor-crosshair touch-none select-none"
            >
              {/* Dial Center point */}
              <circle cx="120" cy="120" r="4" fill="var(--primary)" />
              
              {/* Connecting arm line */}
              <line x1="120" y1="120" x2={indicatorCoords.x} y2={indicatorCoords.y} stroke="var(--primary)" strokeWidth="2.5" />
              
              {/* Outer selector ring overlay */}
              <circle cx={indicatorCoords.x} cy={indicatorCoords.y} r="15" fill="var(--primary)" />
              
              {/* Dial numbers */}
              {mode === 'hour' ? renderHourNumbers() : renderMinuteNumbers()}
            </svg>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-4 bg-muted/20 border-t">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs px-4 h-9">Hủy</Button>
          <Button type="button" onClick={handleOK} className="bg-primary text-white text-xs px-5 h-9 rounded-xl">OK</Button>
        </div>
      </div>
    </div>
  );
}
