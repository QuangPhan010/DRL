import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Users, Award, CheckCircle2, Clock, Upload, Check, Trash2, QrCode, Eye, Loader2 } from "lucide-react";
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
import FaceVerificationCamera, { FaceVerificationData } from "@/components/FaceVerificationCamera";
import { getFreshAttendanceLocation, GpsPosition } from "@/lib/geolocation";
import { getOrganizerStyle } from "@/lib/organizer-highlight";
import { cn } from "@/lib/utils";
import { OrganizerPicker } from "@/components/OrganizerPicker";

const getLocalToday = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};

export default function Activities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [highlightedOrganizer, setHighlightedOrganizer] = useState("all");
  const organizers = useMemo(
    () => Array.from(new Set(
      activities
        .map(activity => activity.organizer?.trim())
        .filter((organizer): organizer is string => Boolean(organizer)),
    )).sort((left, right) => left.localeCompare(right, "vi")),
    [activities],
  );

  const canReviewAttendance = (act: any) => {
    if (!user || !act) return false;
    // Admin / CTSV / Phòng Đào tạo luôn có quyền
    const isStaff = userRoles.includes("admin") || userRoles.includes("student_affairs") || userRoles.includes("academic_affairs");
    if (isStaff) return true;
    
    // Đơn vị tổ chức trực tiếp (khớp tên)
    if (act.organizer === user.fullName) return true;

    // Đơn vị tổ chức (khớp tổ chức của user)
    const userOrgs = user.organizations || [];
    const isFromOrganizingUnit = userOrgs.some((org: any) => org.organization_name === act.organizer);
    if (isFromOrganizingUnit) return true;

    // Người đồng tổ chức (Các CLB được liên kết)
    if (act.scope_type === "club") {
      const isLinkedClubLeader = userOrgs.some((org: any) => {
        const isLeader = ["Chủ nhiệm", "Phó chủ nhiệm", "Trưởng ban", "Phụ trách"].includes(org.position);
        const allowedClubIds = act.allowed_clubs || [];
        const isClubAllowed = allowedClubIds.includes(Number(org.organization)) || allowedClubIds.includes(org.organization?.toString());
        return isLeader && isClubAllowed;
      });
      if (isLinkedClubLeader) return true;
    }

    // Người đồng tổ chức (Các Lớp được liên kết)
    if (act.scope_type === "class") {
      const allowedClassIds = act.allowed_classes || [];
      const isClassOfficer = userRoles.includes("class_officer") || userRoles.includes("advisor");
      const userClassId = user.classId || user.class_info?.id;
      const isLinkedClassLeader = isClassOfficer && userClassId && allowedClassIds.includes(Number(userClassId));
      if (isLinkedClassLeader) return true;
    }

    return false;
  };

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
      setDate(getLocalToday());
      setStartTime("08:00");
      setEndTime("11:00");
      setMaxParticipants("100");
      setIsEditing(false);
      setEditActivityId(null);
      setScope("internal");
      setOrganizerName("");
      setLocation("");
      setEndDate(getLocalToday());
      setActivityType("Hoạt động xã hội");
      setScopeType("all");
      setSelectedClasses([]);
      setSelectedClubs([]);
      setIsRegistrationRequired(false);
      setRegistrationStartDate(getLocalToday());
      setRegistrationStartTime("08:00");
      setRegistrationEndDate(getLocalToday());
      setRegistrationEndTime("11:00");
      setClassSearch("");
      setClubSearch("");
    }
  };
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Time picker states
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | 'regStart' | 'regEnd'>('start');

  // Simulation states
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCheckInSimOpen, setIsCheckInSimOpen] = useState(false);
  const [isCheckOutSimOpen, setIsCheckOutSimOpen] = useState(false);
  const [simDeviceId, setSimDeviceId] = useState("phone_device_sim");
  const [faceVerification, setFaceVerification] = useState<FaceVerificationData | null>(null);
  const [gpsPosition, setGpsPosition] = useState<GpsPosition | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFaceVerified = async (data: FaceVerificationData | null) => {
    setFaceVerification(null);
    setGpsPosition(null);
    if (!data) return;
    const gps = await getFreshAttendanceLocation();
    setGpsPosition(gps);
    setFaceVerification(data);
  };

  const openCheckInSim = (act: Activity) => {
    setSelectedActivity(act);
    setSimDeviceId("device_" + (user?.studentId || "SV001"));
    setFaceVerification(null);
    setGpsPosition(null);
    setIsCheckInSimOpen(true);
  };

  const openCheckOutSim = (act: Activity) => {
    setSelectedActivity(act);
    setSimDeviceId("device_" + (user?.studentId || "SV001"));
    setFaceVerification(null);
    setGpsPosition(null);
    setIsCheckOutSimOpen(true);
  };

  const getCheckoutStatus = (act: Activity) => {
    if (!act.check_in_time) return { enabled: false, text: "Chưa Check-in", remaining: null };
    const start = parseDateTime(act.date, act.start_time || "00:00");
    if (!start) return { enabled: true, text: "Check-out Face ID", remaining: 0 };
    let end = parseDateTime(act.date, act.end_time || "");
    if (!end) {
      end = new Date(start.getTime() + (act.duration_minutes || 180) * 60 * 1000);
    } else if (end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const checkoutOpenTime = new Date(
      start.getTime() + (end.getTime() - start.getTime()) * 2 / 3,
    );
    const now = new Date();
    const remainingMins = Math.max(
      0,
      Math.ceil((checkoutOpenTime.getTime() - now.getTime()) / (60 * 1000)),
    );

    if (now >= checkoutOpenTime) {
      return { enabled: true, text: "Check-out Face ID", remaining: 0 };
    }
    return {
      enabled: false,
      text: `Mở check-out sau ${remainingMins}p`,
      remaining: remainingMins
    };
  };

  // Form states for creating activity
  const [scope, setScope] = useState<"internal" | "external">("internal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("5");
  const [criterionId, setCriterionId] = useState("c1");
  const [date, setDate] = useState(getLocalToday);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [maxParticipants, setMaxParticipants] = useState("100");
  const [isEditing, setIsEditing] = useState(false);
  const [editActivityId, setEditActivityId] = useState<string | null>(null);

  // New scope and registration fields
  const [scopeType, setScopeType] = useState<"all" | "class" | "club">("all");
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<number[]>([]);
  const [isRegistrationRequired, setIsRegistrationRequired] = useState(false);
  const [registrationStartDate, setRegistrationStartDate] = useState(getLocalToday);
  const [registrationStartTime, setRegistrationStartTime] = useState("08:00");
  const [registrationEndDate, setRegistrationEndDate] = useState(getLocalToday);
  const [registrationEndTime, setRegistrationEndTime] = useState("11:00");

  const [classList, setClassList] = useState<any[]>([]);
  const [clubList, setClubList] = useState<any[]>([]);

  // Search states for filtering classes and clubs
  const [classSearch, setClassSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");

  // Off-campus fields
  const [organizerName, setOrganizerName] = useState("");
  const [location, setLocation] = useState("");
  const [endDate, setEndDate] = useState(getLocalToday);
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
          max_participants: Number(act.max_participants || 100),
          check_in_time: act.check_in_time,
          start_time: act.start_time,
          end_time: act.end_time,
          scope_type: act.scope_type,
          allowed_classes: act.allowed_classes,
          allowed_clubs: act.allowed_clubs,
          is_registration_required: act.is_registration_required,
          registration_start: act.registration_start,
          registration_end: act.registration_end,
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

    // Fetch classes and clubs for scope selection
    const fetchClassesAndClubs = async () => {
      try {
        const classRes = await fetch(`${API_URL}/classes/`);
        if (classRes.ok) {
          const classData = await classRes.json();
          setClassList(classData);
        }
        const orgRes = await fetch(`${API_URL}/organizations/`);
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setClubList(orgData.filter((org: any) => org.type === "CLB"));
        }
      } catch (err) {
        console.error("Error fetching classes or clubs:", err);
      }
    };
    fetchClassesAndClubs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizerName.trim()) {
      toast.error("Vui lòng chọn hoặc thêm đơn vị tổ chức.");
      return;
    }
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
            organizer: organizerName.trim(),
            status: "upcoming",
            latitude: 10.850100,
            longitude: 106.771200,
            radius_meters: 100,
            duration_minutes: calculateDuration(startTime, endTime),
            max_participants: Number(maxParticipants),
            start_time: startTime ? `${startTime}:00` : null,
            end_time: endTime ? `${endTime}:00` : null,
            scope_type: scopeType,
            allowed_classes: scopeType === "class" ? selectedClasses : [],
            allowed_clubs: scopeType === "club" ? selectedClubs : [],
            is_registration_required: isRegistrationRequired,
            registration_start: isRegistrationRequired && registrationStartDate && registrationStartTime ? new Date(`${registrationStartDate}T${registrationStartTime}:00`).toISOString() : null,
            registration_end: isRegistrationRequired && registrationEndDate && registrationEndTime ? new Date(`${registrationEndDate}T${registrationEndTime}:00`).toISOString() : null
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
        setMaxParticipants("100");
        setIsEditing(false);
        setEditActivityId(null);
        setScope("internal");
        setOrganizerName("");
        setLocation("");
        setEndDate(getLocalToday());
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
    setOrganizerName(act.organizer || "");
    setPoints(act.points.toString());
    setCriterionId(act.criterionId);
    setDate(act.date);
    setStartTime(act.start_time ? act.start_time.substring(0, 5) : "08:00");
    setEndTime(act.end_time ? act.end_time.substring(0, 5) : "11:00");
    setMaxParticipants(String(act.max_participants || 100));
    setIsEditing(true);
    setEditActivityId(act.id);
    
    // Set scope and registration states
    setScopeType(act.scope_type || "all");
    setSelectedClasses(act.allowed_classes || []);
    setSelectedClubs(act.allowed_clubs || []);
    setIsRegistrationRequired(!!act.is_registration_required);
    
    const toLocalDateAndTime = (isoString?: string) => {
      if (!isoString) return { date: "", time: "08:00" };
      const d = new Date(isoString);
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      const isoStr = localDate.toISOString();
      return {
        date: isoStr.slice(0, 10),
        time: isoStr.slice(11, 16)
      };
    };
    
    const regStartVal = toLocalDateAndTime(act.registration_start);
    setRegistrationStartDate(regStartVal.date || getLocalToday());
    setRegistrationStartTime(regStartVal.time || "08:00");
    
    const regEndVal = toLocalDateAndTime(act.registration_end);
    setRegistrationEndDate(regEndVal.date || getLocalToday());
    setRegistrationEndTime(regEndVal.time || "11:00");
    
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
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Không thể đăng ký tham gia");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const cancelRegistration = async (id: string) => {
    const token = localStorage.getItem("drl_token");
    if (!token) {
      toast.error("Vui lòng đăng nhập để hủy đăng ký.");
      return;
    }
    if (!window.confirm("Bạn có chắc muốn hủy đăng ký hoạt động này?")) return;

    try {
      const res = await fetch(`${API_URL}/activities/${id}/cancel-registration/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success(data?.message || "Đã hủy đăng ký hoạt động.");
        fetchActivities();
      } else {
        toast.error(data?.error || "Không thể hủy đăng ký hoạt động.");
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
          max_participants: Number(updated.max_participants || 100),
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
    if (!faceVerification || !gpsPosition) {
      toast.error("Vui lòng xác thực khuôn mặt và GPS trước.");
      return;
    }
    try {
      setIsVerifying(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/activities/${selectedActivity.id}/check-in/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...faceVerification,
          ...gpsPosition,
          deviceId: simDeviceId,
        })
      });
      const responseText = await res.text();
      if (res.ok) {
        const data = JSON.parse(responseText);
        toast.success(`Check-in Face ID thành công! Độ tương đồng ${Math.round(data.face_similarity * 100)}%.`);
        fetchActivities();
        setIsCheckInSimOpen(false);
      } else {
        console.error("Lỗi 400/500 Check-in từ backend:", responseText);
        let errorMsg = "Check-in thất bại";
        try {
          const parsed = JSON.parse(responseText);
          errorMsg = parsed.error || errorMsg;
        } catch(e) {}
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Lỗi kết nối Check-in:", err);
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckOutSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    if (!faceVerification || !gpsPosition) {
      toast.error("Vui lòng xác thực khuôn mặt và GPS trước.");
      return;
    }
    try {
      setIsVerifying(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/activities/${selectedActivity.id}/check-out/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...faceVerification,
          ...gpsPosition,
          deviceId: simDeviceId,
        })
      });
      const responseText = await res.text();
      if (res.ok) {
        const data = JSON.parse(responseText);
        toast.success(`Check-out Face ID thành công! Độ tương đồng ${Math.round(data.face_similarity * 100)}%.`);
        fetchActivities();
        setIsCheckOutSimOpen(false);
      } else {
        console.error("Lỗi 400/500 Check-out từ backend:", responseText);
        let errorMsg = "Check-out thất bại";
        try {
          const parsed = JSON.parse(responseText);
          errorMsg = parsed.error || errorMsg;
        } catch(e) {}
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("Lỗi kết nối Check-out:", err);
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsVerifying(false);
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
            onClick={() => navigate("/activities/create")}
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
          {organizers.length > 0 && (
            <div className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Highlight theo người tổ chức
                </p>
                {highlightedOrganizer !== "all" && (
                  <button
                    type="button"
                    onClick={() => setHighlightedOrganizer("all")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Bỏ highlight
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={highlightedOrganizer === "all" ? "default" : "outline"}
                  onClick={() => setHighlightedOrganizer("all")}
                  className="shrink-0"
                >
                  Tất cả
                </Button>
                {organizers.map(organizer => {
                  const style = getOrganizerStyle(organizer);
                  return (
                    <Button
                      key={organizer}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setHighlightedOrganizer(organizer)}
                      className={cn(
                        "shrink-0 gap-2 transition-all",
                        style.badge,
                        highlightedOrganizer === organizer && `ring-2 ring-offset-1 ${style.ring}`,
                      )}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                      {organizer}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(act => {
              const isRegistered = act.participants.some(p => p.studentId === user?.studentId);
              const studentStatus = act.participants.find(p => p.studentId === user?.studentId)?.status;
              const isFull = act.participants.length >= (act.max_participants || 100);
              const criterion = criteria.find(c => c.id === act.criterionId);

              const start = parseDateTime(act.date, act.start_time);
              const end = parseDateTime(act.date, act.end_time);
              const now = new Date();
              const isOngoing = act.status !== "completed" && start && end && now >= start && now <= end;
              const isEnded = act.status !== "completed" && end && now > end;
              const cancellationDeadline = parseDateTime(
                act.date,
                act.start_time || "00:00",
              );
              const canCancelRegistration = !!cancellationDeadline
                && cancellationDeadline.getTime() - now.getTime() >= 24 * 60 * 60 * 1000;
              const organizerName = act.organizer?.trim() || "Chưa xác định";
              const organizerStyle = getOrganizerStyle(organizerName);
              const isOrganizerHighlighted = highlightedOrganizer === "all"
                || highlightedOrganizer === organizerName;

              return (
                <Card
                  key={act.id}
                  className={cn(
                    "flex flex-col justify-between border border-l-4 bg-gradient-card shadow-md transition-all duration-200",
                    organizerStyle.border,
                    highlightedOrganizer !== "all" && !isOrganizerHighlighted && "scale-[0.98] opacity-35 grayscale",
                    highlightedOrganizer !== "all" && isOrganizerHighlighted && `ring-2 ring-offset-2 ${organizerStyle.ring}`,
                  )}
                >
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
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="outline" className={cn("text-[10px] font-medium py-0.5 px-2", organizerStyle.badge)}>
                        <span className={cn("mr-1.5 h-2 w-2 rounded-full", organizerStyle.dot)} />
                        {organizerName}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-muted/40 font-medium py-0.5 px-2">
                        {act.scope_type === "class" ? "Giới hạn Lớp" : act.scope_type === "club" ? "Giới hạn CLB" : "Toàn trường"}
                      </Badge>
                      {act.is_registration_required && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium py-0.5 px-2">
                          Cần đăng ký trước
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-3 text-sm mt-2">{act.description}</CardDescription>
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
                        <span>
                          {act.participants.length}/{act.max_participants || 100} người đăng ký
                        </span>
                      </div>

                      {userRoles.includes("student") && (
                        <div className="flex flex-wrap gap-2">
                          {!isRegistered && act.status === "upcoming" && act.is_registration_required && (
                            <Button
                              size="sm"
                              onClick={() => registerActivity(act.id)}
                              disabled={isFull}
                            >
                              {isFull ? "Đã đủ người" : "Đăng ký"}
                            </Button>
                          )}
                          {studentStatus === "registered" && act.is_registration_required && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => cancelRegistration(act.id)}
                              disabled={!canCancelRegistration}
                              title={canCancelRegistration
                                ? "Hủy đăng ký hoạt động"
                                : "Chỉ được hủy trước giờ diễn ra ít nhất 24 giờ"}
                            >
                              {canCancelRegistration ? "Hủy đăng ký" : "Đã hết hạn hủy"}
                            </Button>
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
                            {canReviewAttendance(act) ? (
                              <>
                                <Button size="xs" variant="outline" className="gap-1 border-primary/20 text-primary h-8 px-2" onClick={() => { setSelectedActivity(act); setIsQrOpen(true); }}>
                                  <QrCode className="h-3.5 w-3.5" /> Mã QR
                                </Button>
                                <Button size="xs" variant="outline" className="gap-1 border-primary/20 h-8 px-2" onClick={() => { setSelectedActivity(act); setIsParticipantsOpen(true); }}>
                                  Danh sách ({act.participants.length})
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Chỉ đơn vị tổ chức được rà soát</span>
                            )}
                          </div>
                          {canReviewAttendance(act) && (
                            <div className="flex gap-1.5">
                              <Button size="xs" className="h-8 px-2 text-amber-600 border border-amber-300 bg-transparent hover:bg-amber-50 hover:text-amber-700 transition-colors" onClick={() => navigate(`/activities/${act.id}/edit`)}>
                                Sửa
                              </Button>
                              <Button size="xs" className="h-8 px-2 text-red-600 border border-red-200 bg-transparent hover:bg-red-50 hover:text-red-700 transition-colors" onClick={() => handleDeleteActivity(act.id)}>
                                Xóa
                              </Button>
                            </div>
                          )}
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
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {isEditing ? "Chỉnh sửa hoạt động rèn luyện" : "Tạo hoạt động rèn luyện"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Điền các thông tin cần thiết để tạo mới hoặc chỉnh sửa hoạt động rèn luyện.
            </DialogDescription>
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
                <OrganizerPicker
                  value={organizerName}
                  onChange={setOrganizerName}
                  defaultNewType="Đoàn - Hội"
                />
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
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Số người tham gia tối đa</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={maxParticipants}
                    onChange={e => setMaxParticipants(e.target.value)}
                    required
                    min="1"
                    step="1"
                    placeholder="Ví dụ: 100"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="date">Ngày tổ chức</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} required />
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

                <div className="space-y-2 border-t pt-3 mt-3">
                  <Label>Phạm vi sinh viên có thể tham gia</Label>
                  <Select value={scopeType} onValueChange={(val: any) => setScopeType(val)}>
                    <SelectTrigger id="scopeType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toàn trường</SelectItem>
                      <SelectItem value="class">Theo Lớp</SelectItem>
                      <SelectItem value="club">Theo Câu lạc bộ (CLB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scopeType === "class" && (
                  <div className="space-y-1.5 mt-2">
                    <Label>Chọn lớp áp dụng (chọn một hoặc nhiều)</Label>
                    <Input
                      type="text"
                      placeholder="Tìm kiếm lớp..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="h-8 text-xs mb-1.5"
                    />
                    <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1.5 bg-background">
                      {classList
                        .filter(cls =>
                          cls.name.toLowerCase().includes(classSearch.toLowerCase()) ||
                          (cls.faculty && cls.faculty.toLowerCase().includes(classSearch.toLowerCase()))
                        )
                        .map(cls => (
                          <div key={cls.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`class-${cls.id}`}
                              checked={selectedClasses.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClasses([...selectedClasses, cls.id]);
                                } else {
                                  setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`class-${cls.id}`} className="text-sm font-medium leading-none cursor-pointer">
                              {cls.name} ({cls.faculty})
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {scopeType === "club" && (
                  <div className="space-y-1.5 mt-2">
                    <Label>Chọn Câu lạc bộ áp dụng (chọn một hoặc nhiều)</Label>
                    <Input
                      type="text"
                      placeholder="Tìm kiếm câu lạc bộ..."
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      className="h-8 text-xs mb-1.5"
                    />
                    <div className="border rounded-md p-2 max-h-36 overflow-y-auto space-y-1.5 bg-background">
                      {clubList
                        .filter(club =>
                          club.name.toLowerCase().includes(clubSearch.toLowerCase())
                        )
                        .map(club => (
                          <div key={club.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`club-${club.id}`}
                              checked={selectedClubs.includes(club.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClubs([...selectedClubs, club.id]);
                                } else {
                                  setSelectedClubs(selectedClubs.filter(id => id !== club.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`club-${club.id}`} className="text-sm font-medium leading-none cursor-pointer">
                              {club.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-t pt-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRegistrationRequired"
                      checked={isRegistrationRequired}
                      onChange={(e) => setIsRegistrationRequired(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <Label htmlFor="isRegistrationRequired" className="cursor-pointer text-sm font-medium">
                      Cho phép sinh viên đăng ký trước?
                    </Label>
                  </div>

                  {isRegistrationRequired && (
                    <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-muted/40 rounded-lg animate-in fade-in-50 duration-200">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold">Bắt đầu đăng ký</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={registrationStartDate}
                            onChange={(e) => setRegistrationStartDate(e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker()}
                            required={isRegistrationRequired}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="text"
                            value={registrationStartTime}
                            readOnly
                            onClick={() => { setTimePickerTarget('regStart'); setIsTimePickerOpen(true); }}
                            className="cursor-pointer font-mono h-9 text-xs"
                            required={isRegistrationRequired}
                            placeholder="Chọn giờ"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold">Kết thúc đăng ký</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={registrationEndDate}
                            onChange={(e) => setRegistrationEndDate(e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker()}
                            required={isRegistrationRequired}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="text"
                            value={registrationEndTime}
                            readOnly
                            onClick={() => { setTimePickerTarget('regEnd'); setIsTimePickerOpen(true); }}
                            className="cursor-pointer font-mono h-9 text-xs"
                            required={isRegistrationRequired}
                            placeholder="Chọn giờ"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <OrganizerPicker
                  value={organizerName}
                  onChange={setOrganizerName}
                  defaultNewType="Đơn vị ngoài trường"
                />
                <div className="grid grid-cols-1 gap-4">
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
          <DialogHeader>
            <DialogTitle className="font-display">Nộp minh chứng hoạt động</DialogTitle>
            <DialogDescription className="sr-only">Nộp tệp tin hoặc hình ảnh minh chứng để được ghi nhận điểm rèn luyện.</DialogDescription>
          </DialogHeader>
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
            <DialogDescription>{selectedActivity?.title} ({selectedActivity?.date})</DialogDescription>
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

      {/* Dialog: Check-In Face ID */}
      <Dialog open={isCheckInSimOpen} onOpenChange={setIsCheckInSimOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {isVerifying && (
            <div className="absolute inset-0 bg-background/80 z-50 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Đang đối sánh Face ID & GPS...</p>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              Điểm danh hoạt động bằng Face ID
            </DialogTitle>
            <DialogDescription>Quét khuôn mặt trực tiếp và đối chiếu với ảnh đại diện của tài khoản.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckInSim} className="space-y-4">
            <FaceVerificationCamera avatar={user?.avatar} onVerified={handleFaceVerified} />

            <input id="simDeviceId" type="hidden" value={simDeviceId} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCheckInSimOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!faceVerification || !gpsPosition} className="bg-success text-white hover:bg-success/90">Xác nhận Check-in</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Check-Out Face ID */}
      <Dialog open={isCheckOutSimOpen} onOpenChange={setIsCheckOutSimOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {isVerifying && (
            <div className="absolute inset-0 bg-background/80 z-50 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Đang đối sánh Face ID & GPS...</p>
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              Điểm danh kết thúc bằng Face ID
            </DialogTitle>
            <DialogDescription>Quét lại khuôn mặt để xác nhận người tham gia khi kết thúc hoạt động.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckOutSim} className="space-y-4">
            <FaceVerificationCamera avatar={user?.avatar} onVerified={handleFaceVerified} />

            <input id="simDeviceIdOut" type="hidden" value={simDeviceId} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCheckOutSimOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={!faceVerification || !gpsPosition} className="bg-warning text-black dark:text-white hover:bg-warning/90">Xác nhận Check-out</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RadialTimePicker
        open={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        value={
          timePickerTarget === 'start' ? startTime :
          timePickerTarget === 'end' ? endTime :
          timePickerTarget === 'regStart' ? registrationStartTime :
          registrationEndTime
        }
        onChange={(val) => {
          if (timePickerTarget === 'start') {
            setStartTime(val);
          } else if (timePickerTarget === 'end') {
            setEndTime(val);
          } else if (timePickerTarget === 'regStart') {
            setRegistrationStartTime(val);
          } else if (timePickerTarget === 'regEnd') {
            setRegistrationEndTime(val);
          }
        }}
        title={
          timePickerTarget === 'start' ? "Chọn giờ bắt đầu hoạt động" :
          timePickerTarget === 'end' ? "Chọn giờ kết thúc hoạt động" :
          timePickerTarget === 'regStart' ? "Chọn giờ bắt đầu đăng ký" :
          "Chọn giờ kết thúc đăng ký"
        }
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[320px] p-0 overflow-hidden rounded-3xl border shadow-2xl bg-background gap-0" aria-describedby={undefined}>
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
      </DialogContent>
    </Dialog>
  );
}
