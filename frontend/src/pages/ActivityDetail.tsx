import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CalendarDays, ArrowLeft, Award, Users, CheckCircle2, Clock, MapPin, Building, ShieldAlert, FileText, QrCode, Trash2, Eye, Shield, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import FaceVerificationCamera, { FaceVerificationData } from "@/components/FaceVerificationCamera";
import { getFreshAttendanceLocation, GpsPosition } from "@/lib/geolocation";

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isStudent = userRoles.includes("student");
  const isAdvisor = userRoles.includes("advisor");
  const isCTSV = userRoles.includes("student_affairs") || userRoles.includes("admin");

  const [loading, setLoading] = useState(true);
  const [isExternal, setIsExternal] = useState(false);
  const [activity, setActivity] = useState<any>(null);

  // Common modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  // Internal activity simulation states
  const [isCheckInSimOpen, setIsCheckInSimOpen] = useState(false);
  const [isCheckOutSimOpen, setIsCheckOutSimOpen] = useState(false);
  const [simDeviceId, setSimDeviceId] = useState("device_" + (user?.studentId || "SV001"));
  const [faceVerification, setFaceVerification] = useState<FaceVerificationData | null>(null);
  const [gpsPosition, setGpsPosition] = useState<GpsPosition | null>(null);

  const handleFaceVerified = async (data: FaceVerificationData | null) => {
    setFaceVerification(null);
    setGpsPosition(null);
    if (!data) return;
    const gps = await getFreshAttendanceLocation();
    setGpsPosition(gps);
    setFaceVerification(data);
  };

  useEffect(() => {
    if (!isCheckInSimOpen && !isCheckOutSimOpen) {
      setFaceVerification(null);
      setGpsPosition(null);
    }
  }, [isCheckInSimOpen, isCheckOutSimOpen]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Try fetching from internal activities first
      let res = await fetch(`${API_URL}/activities/${id}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
        setIsExternal(false);
        setLoading(false);
        return;
      }

      // 2. Try fetching from external activities
      res = await fetch(`${API_URL}/external-activities/${id}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
        setIsExternal(true);
        setLoading(false);
        return;
      }

      toast.error("Không tìm thấy thông tin hoạt động");
      navigate("/activities");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải chi tiết hoạt động");
      navigate("/activities");
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Actions for Internal Activity
  const registerActivity = async () => {
    try {
      const res = await fetch(`${API_URL}/activities/${id}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: user?.studentId || "SV001" })
      });
      if (res.ok) {
        toast.success("Đăng ký tham gia hoạt động thành công!");
        fetchDetail();
      } else {
        toast.error("Không thể đăng ký tham gia");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceVerification || !gpsPosition) {
      toast.error("Vui lòng xác thực khuôn mặt và GPS trước.");
      return;
    }
    try {
      const token = localStorage.getItem("drl_token");
      const res = await fetch(`${API_URL}/activities/${id}/check-in/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...faceVerification,
          ...gpsPosition,
          deviceId: simDeviceId,
        })
      });
      if (res.ok) {
        toast.success("Check-in bằng Face ID thành công!");
        setIsCheckInSimOpen(false);
        fetchDetail();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Check-in thất bại");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceVerification || !gpsPosition) {
      toast.error("Vui lòng xác thực khuôn mặt và GPS trước.");
      return;
    }
    try {
      const token = localStorage.getItem("drl_token");
      const res = await fetch(`${API_URL}/activities/${id}/check-out/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...faceVerification,
          ...gpsPosition,
          deviceId: simDeviceId,
        })
      });
      if (res.ok) {
        toast.success("Check-out bằng Face ID thành công!");
        setIsCheckOutSimOpen(false);
        fetchDetail();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Check-out thất bại");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const approvePoints = async () => {
    try {
      const res = await fetch(`${API_URL}/activities/${id}/approve-points/`, { method: "POST" });
      if (res.ok) {
        toast.success("Đã kết thúc hoạt động và đề xuất điểm rèn luyện cho sinh viên!");
        fetchDetail();
      } else {
        toast.error("Lỗi khi kết thúc hoạt động");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  const confirmAttended = async (studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/activities/${id}/confirm-attended/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        toast.success("Đã xác nhận điểm rèn luyện!");
        fetchDetail();
      } else {
        toast.error("Lỗi xác nhận");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  // Actions for External Activity
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewStatus) {
      toast.error("Vui lòng chọn quyết định");
      return;
    }

    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let url = `${API_URL}/external-activities/${id}/review-advisor/`;
      if (isCTSV) {
        url = `${API_URL}/external-activities/${id}/review-ctsv/`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: reviewStatus, comment: reviewComment })
      });

      if (res.ok) {
        toast.success("Xét duyệt hồ sơ thành công!");
        setIsReviewOpen(false);
        fetchDetail();
      } else {
        toast.error("Lỗi xét duyệt hồ sơ");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground text-sm font-medium">Đang tải chi tiết hoạt động...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        if (!isExternal && activity) {
          const start = parseDateTime(activity.date, activity.start_time);
          const end = parseDateTime(activity.date, activity.end_time);
          const now = new Date();
          if (start && end && now >= start && now <= end) {
            return <Badge className="bg-orange-500 text-white">Đang diễn ra</Badge>;
          } else if (end && now > end) {
            return <Badge className="bg-red-500 text-white">Đã kết thúc</Badge>;
          }
        }
        return <Badge className="bg-blue-500 text-white">Sắp diễn ra</Badge>;
      case "completed":
        return <Badge className="bg-green-600 text-white">Đã hoàn thành</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-500 text-white">Submitted</Badge>;
      case "advisor_approved":
        return <Badge className="bg-indigo-500 text-white">Advisor Approved</Badge>;
      case "need_more_info":
        return <Badge className="bg-amber-500 text-white">Need More Info</Badge>;
      case "rejected_by_advisor":
        return <Badge className="bg-orange-500 text-white">Rejected By Advisor</Badge>;
      case "approved":
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Internal helper variables
  const isRegistered = !isExternal && activity?.participants?.some((p: any) => p.student_id === user?.studentId || p.studentId === user?.studentId);
  const studentStatus = !isExternal && activity?.participants?.find((p: any) => p.student_id === user?.studentId || p.studentId === user?.studentId)?.status;

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

  const getCheckInStatus = (act: any) => {
    if (act?.check_in_time) {
      return { enabled: false, text: "Đã Check-in" };
    }
    const start = parseDateTime(act?.date, act?.start_time);
    const end = parseDateTime(act?.date, act?.end_time);
    if (!start || !end) return { enabled: true, text: "Check-in Face ID" };

    const now = new Date();
    const checkInOpenTime = new Date(start.getTime() - 10 * 60 * 1000);

    if (now < checkInOpenTime) {
      const diffMins = Math.max(1, Math.round((start.getTime() - now.getTime()) / (60 * 1000)));
      return { enabled: false, text: `Mở check-in sau ${diffMins}p` };
    }
    if (now > end) {
      return { enabled: false, text: "Đã hết giờ" };
    }
    return { enabled: true, text: "Check-in Face ID" };
  };

  const getCheckoutStatus = (act: any) => {
    if (!act?.check_in_time) {
      return { enabled: false, text: "Chưa Check-in" };
    }
    const end = parseDateTime(act?.date, act?.end_time);
    if (!end) return { enabled: true, text: "Check-out Face ID" };

    const now = new Date();
    const checkoutOpenTime = new Date(end.getTime() - 10 * 60 * 1000);

    if (now < checkoutOpenTime) {
      const diffMins = Math.max(1, Math.round((checkoutOpenTime.getTime() - now.getTime()) / (60 * 1000)));
      return { enabled: false, text: `Khóa (còn ${diffMins}p)` };
    }
    return { enabled: true, text: "Check-out Face ID" };
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Back to list */}
      <Button variant="ghost" className="gap-2" onClick={() => navigate("/activities")}>
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Button>

      {/* Main card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {isExternal ? (activity.activity_type || "Hoạt động ngoài trường") : "Hoạt động trong trường"}
                </span>
                {getStatusBadge(activity.status)}
              </div>
              <CardTitle className="font-display text-2xl font-bold mt-2">
                {isExternal ? activity.activity_name : activity.title}
              </CardTitle>
              <CardDescription className="text-sm mt-1">{activity.description || "Chưa có mô tả."}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Grid detail metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl">
                <div className="flex gap-2.5 items-start">
                  <Building className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Đơn vị tổ chức</span>
                    <span className="font-semibold">{isExternal ? activity.organizer_name : (activity.organizer || "ITC")}</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Địa điểm</span>
                    <span className="font-semibold">{activity.location || (isExternal ? "N/A" : "Trường Cao đẳng Công nghệ Thông tin TP.HCM (ITC)")}</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Thời gian diễn ra</span>
                    <span className="font-semibold">
                      {isExternal ? `${activity.start_date} đến ${activity.end_date}` : `${activity.date}`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Điểm rèn luyện</span>
                    <span className="font-bold text-primary">{isExternal ? activity.proposed_score : activity.points} điểm</span>
                  </div>
                </div>
                {!isExternal && (
                  <>
                    <div className="flex gap-2.5 items-start">
                      <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Phạm vi đối tượng</span>
                        <span className="font-semibold">
                          {activity.scope_type === "class" ? "Giới hạn Lớp học" : activity.scope_type === "club" ? "Giới hạn CLB" : "Toàn trường"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start col-span-1 sm:col-span-2 border-t pt-3 mt-1">
                      <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Đăng ký trước</span>
                        <span className="font-semibold text-xs">
                          {activity.is_registration_required ? (
                            <span className="text-amber-600 font-medium">
                              Bắt buộc (từ {activity.registration_start ? new Date(activity.registration_start).toLocaleString('vi-VN') : "N/A"} đến {activity.registration_end ? new Date(activity.registration_end).toLocaleString('vi-VN') : "N/A"})
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">Không yêu cầu đăng ký trước (có thể check-in trực tiếp)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Internal checkins history */}
              {!isExternal && !isStudent && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> Sinh viên đăng ký tham gia ({activity.participants?.length || 0})
                    </h3>
                  </div>

                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Mã SV</TableHead>
                        <TableHead>Họ và tên</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-center">Check-in Face ID</TableHead>
                        <TableHead className="text-center">Check-out Face ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.participants?.map((p: any) => {
                        const svId = p.student_id || p.studentId;
                        const svName = p.student_name || p.fullName;
                        const formatTime = (isoString?: string) => {
                          if (!isoString) return "";
                          const dateObj = new Date(isoString);
                          return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };
                        return (
                          <TableRow key={svId} className="hover:bg-muted/10">
                            <TableCell className="font-mono font-medium text-xs">{svId}</TableCell>
                            <TableCell className="text-xs font-semibold">{svName}</TableCell>
                            <TableCell>
                              {p.status === "registered" && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đã đăng ký</Badge>}
                              {p.status === "attended" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã tham gia</Badge>}
                              {p.status === "evidence_submitted" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Đã nộp minh chứng</Badge>}
                            </TableCell>
                            <TableCell className="text-center">
                              {p.checked_in_time ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-mono text-[10px]">
                                  ✓ {formatTime(p.checked_in_time)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {p.checked_out_time ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-mono text-[10px]">
                                  ✓ {formatTime(p.checked_out_time)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!activity.participants || activity.participants.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">Chưa có sinh viên nào đăng ký tham gia.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* External files & fraud flags */}
              {isExternal && (
                <div className="space-y-6">
                  {/* Evidence Files */}
                  <div className="space-y-3">
                    <h3 className="font-display font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" /> Tài liệu minh chứng ({activity.evidence_files?.length || 0})
                    </h3>
                    {activity.evidence_files?.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">Chưa nộp minh chứng nào.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activity.evidence_files?.map((file: any) => (
                          <div key={file.id} className="p-3 border rounded-xl bg-background flex justify-between items-center text-xs">
                            <div className="space-y-1 overflow-hidden">
                              <a href={file.file_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline block truncate">
                                {file.file_name}
                              </a>
                              <p className="text-[10px] text-muted-foreground">Kích thước: {(file.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                              <p className="text-[9px] font-mono text-muted-foreground truncate" title={file.file_hash}>Hash: {file.file_hash}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fraud Flags */}
                  {activity.fraud_flags && activity.fraud_flags.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-display font-bold flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-5 w-5" /> Cảnh báo nghi vấn từ hệ thống ({activity.fraud_flags.length})
                      </h3>
                      <div className="space-y-2.5">
                        {activity.fraud_flags.map((flag: any) => (
                          <div
                            key={flag.id}
                            className={`p-3 border rounded-xl text-xs flex gap-2.5 ${flag.severity === "Critical" ? "bg-red-50 border-red-200 text-red-700" :
                                flag.severity === "High" ? "bg-orange-50 border-orange-200 text-orange-700" :
                                  "bg-yellow-50 border-yellow-200 text-yellow-700"
                              }`}
                          >
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block uppercase text-[10px]">{flag.rule_code} • {flag.severity}</span>
                              <p className="mt-1 font-medium">{flag.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Panel: Actions / Reviews / Maps */}
        <div className="space-y-6">
          {/* Internal Actions / Map Simulator */}
          {!isExternal && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3 border-b"><CardTitle className="font-display text-lg">Hành động & Face ID</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Buttons based on role */}
                <div className="flex flex-col gap-2 pt-2">
                  {isStudent && activity.status === "upcoming" && (
                    <>
                      {activity.is_registration_required && !isRegistered && (
                        <Button className="w-full bg-gradient-primary" onClick={registerActivity}>Đăng ký tham gia</Button>
                      )}
                      {(!activity.is_registration_required || isRegistered) && (studentStatus === "registered" || !studentStatus) && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="bg-success text-white hover:bg-success/90 disabled:opacity-60 text-xs px-2"
                            onClick={() => setIsCheckInSimOpen(true)}
                            disabled={!getCheckInStatus(activity).enabled}
                          >
                            {getCheckInStatus(activity).text}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-warning text-black hover:bg-warning/90 disabled:opacity-60 text-xs px-2"
                            onClick={() => setIsCheckOutSimOpen(true)}
                            disabled={!getCheckoutStatus(activity).enabled}
                          >
                            {getCheckoutStatus(activity).text}
                          </Button>
                        </div>
                      )}
                      {studentStatus === "attended" && (
                        <Badge variant="outline" className="bg-success/10 text-success p-2 justify-center w-full text-center">Bạn đã tham gia hoạt động này</Badge>
                      )}
                    </>
                  )}

                  {!userRoles.includes("student") && (
                    <>
                      <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary" onClick={() => setIsQrOpen(true)}>
                        <QrCode className="h-4 w-4" /> Hiển thị mã QR điểm danh
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* External Student Info & Reviews */}
          {isExternal && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3 border-b"><CardTitle className="font-display text-lg">Thông tin hồ sơ & Duyệt</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-6 text-sm">
                {/* Student Info */}
                <div className="bg-muted/40 p-3 rounded-xl border space-y-2 text-xs">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block">Sinh viên nộp hồ sơ</span>
                  <div className="flex justify-between">
                    <span>Họ và tên:</span>
                    <span className="font-bold">{activity.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mã sinh viên:</span>
                    <span className="font-mono font-bold">{activity.student_id_str}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày khai báo:</span>
                    <span className="font-mono text-muted-foreground">{activity.created_at?.substring(0, 10)}</span>
                  </div>
                </div>

                {/* Review History */}
                {activity.reviews && activity.reviews.length > 0 && (
                  <div className="space-y-3">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block">Ý kiến xét duyệt trước</span>
                    <div className="space-y-2">
                      {activity.reviews.map((rev: any) => (
                        <div key={rev.id} className="p-2.5 rounded bg-muted/30 border text-xs">
                          <div className="flex justify-between text-muted-foreground font-semibold">
                            <span>{rev.reviewer_name || "Hệ thống"} ({rev.review_level.toUpperCase()})</span>
                            <span>{rev.reviewed_at?.substring(0, 10)}</span>
                          </div>
                          <p className="mt-1 font-medium">Quyết định: {getStatusBadge(rev.status)}</p>
                          {rev.comment && <p className="mt-1 text-muted-foreground italic border-l-2 pl-2">"{rev.comment}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval buttons */}
                <div className="flex flex-col gap-2">
                  {isAdvisor && activity.status === "submitted" && (
                    <Button className="w-full bg-gradient-primary" onClick={() => { setReviewStatus("advisor_approved"); setIsReviewOpen(true); }}>
                      CVHT Xét duyệt
                    </Button>
                  )}

                  {isCTSV && ["submitted", "advisor_approved"].includes(activity.status) && (
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setReviewStatus("approved"); setIsReviewOpen(true); }}>
                      Phê duyệt cuối (CTSV)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: QR code */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Mã QR Điểm Danh</DialogTitle>
            <DialogDescription className="text-center">Hãy đưa mã này cho sinh viên quét để check-in/out.</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="border p-3 rounded-2xl bg-white shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/activities/' + (activity?.id || ''))}`}
                alt="QR code"
                className="h-44 w-44 object-contain"
              />
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Hoạt động: {isExternal ? activity?.activity_name : activity?.title}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Review form */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-display">Đánh giá và Xét duyệt hồ sơ ngoài trường</DialogTitle>
            <DialogDescription>Nhập ý kiến đánh giá và chọn kết quả phê duyệt cho hồ sơ hoạt động.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="revStatus">Quyết định phê duyệt <span className="text-destructive">*</span></Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger id="revStatus">
                  <SelectValue placeholder="Chọn quyết định" />
                </SelectTrigger>
                <SelectContent>
                  {isAdvisor && (
                    <>
                      <SelectItem value="advisor_approved">Phê duyệt hồ sơ (Advisor Approved)</SelectItem>
                      <SelectItem value="need_more_info">Yêu cầu bổ sung thông tin (Need More Info)</SelectItem>
                      <SelectItem value="rejected_by_advisor">Từ chối hồ sơ (Rejected By Advisor)</SelectItem>
                    </>
                  )}
                  {isCTSV && (
                    <>
                      <SelectItem value="approved">Duyệt cấp trường (Approved)</SelectItem>
                      <SelectItem value="rejected">Từ chối duyệt cuối (Rejected)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="comment">Ý kiến đánh giá / Nhận xét phản hồi</Label>
              <Textarea id="comment" placeholder="Mô tả lý do từ chối hoặc hướng dẫn bổ sung thông tin..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={4} />
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Xác nhận</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Check-in Face ID */}
      <Dialog open={isCheckInSimOpen} onOpenChange={setIsCheckInSimOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Check-in bằng Face ID</DialogTitle>
            <DialogDescription className="text-xs">
              Quét khuôn mặt trực tiếp và đối chiếu với ảnh đại diện của tài khoản.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckIn} className="space-y-4 py-2 text-xs">
            <FaceVerificationCamera avatar={user?.avatar} onVerified={handleFaceVerified} />

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCheckInSimOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-success text-white" disabled={!faceVerification || !gpsPosition}>Xác nhận Check-in</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Check-out Face ID */}
      <Dialog open={isCheckOutSimOpen} onOpenChange={setIsCheckOutSimOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold">Check-out bằng Face ID</DialogTitle>
            <DialogDescription className="text-xs">
              Quét lại khuôn mặt để xác nhận người tham gia khi kết thúc hoạt động.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckOut} className="space-y-4 py-2 text-xs">
            <FaceVerificationCamera avatar={user?.avatar} onVerified={handleFaceVerified} />

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCheckOutSimOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-success text-white" disabled={!faceVerification || !gpsPosition}>Xác nhận Check-out</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
