import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Plus, Upload, CheckCircle2, Clock, XCircle, AlertTriangle, Info, Calendar, MapPin, Building, ShieldAlert, FileText, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { OrganizerPicker } from "@/components/OrganizerPicker";
import { getOrganizerStyle } from "@/lib/organizer-highlight";
import { cn } from "@/lib/utils";

interface ExternalActivity {
  id: number;
  student: number;
  student_name: string;
  student_id_str: string;
  activity_name: string;
  organizer_name: string;
  start_date: string;
  end_date: string;
  location: string;
  activity_type: string;
  participation_content: string;
  proposed_score: number;
  description: string;
  status: string;
  evidence_files: EvidenceFile[];
  fraud_flags: FraudFlag[];
  reviews: EvidenceReview[];
  created_at: string;
}

interface EvidenceFile {
  id: number;
  activity: number;
  file_name: string;
  file_hash: string;
  file_size: number;
  file_url: string;
  uploaded_at: string;
}

interface FraudFlag {
  id: number;
  activity: number;
  rule_code: string;
  severity: string;
  description: string;
  created_at: string;
}

interface EvidenceReview {
  id: number;
  activity: number;
  reviewer: number;
  reviewer_name: string;
  review_level: string;
  status: string;
  comment: string;
  reviewed_at: string;
}

export default function ExternalActivities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isStudent = userRoles.includes("student");
  const isAdvisor = userRoles.includes("advisor");
  const isCTSV = userRoles.includes("student_affairs") || userRoles.includes("admin");

  const [activities, setActivities] = useState<ExternalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const handleOpenCreateChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setActivityName("");
      setOrganizerName("");
      setLocation("");
      setActivityType("Hoạt động xã hội");
      setParticipationContent("");
      setStartDate("");
      setEndDate("");
      setProposedScore(5);
      setDescription("");
    }
  };

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const handleOpenUploadChange = (open: boolean) => {
    setIsUploadOpen(open);
    if (!open) {
      setFileName("");
      setFileHash("");
      setFileSize(1024 * 1024);
      setFileUrl("");
      setIsCustomHash(false);
    }
  };

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const handleOpenReviewChange = (open: boolean) => {
    setIsReviewOpen(open);
    if (!open) {
      setReviewStatus("");
      setReviewComment("");
    }
  };

  const [selectedActivity, setSelectedActivity] = useState<ExternalActivity | null>(null);

  // Form states - Create Activity
  const [activityName, setActivityName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [location, setLocation] = useState("");
  const [activityType, setActivityType] = useState("Hoạt động xã hội");
  const [participationContent, setParticipationContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [proposedScore, setProposedScore] = useState(5);
  const [description, setDescription] = useState("");

  // Form states - Upload Evidence
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [fileSize, setFileSize] = useState(1024 * 1024); // Default 1MB
  const [fileUrl, setFileUrl] = useState("");
  const [isCustomHash, setIsCustomHash] = useState(false);

  // Form states - Review
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  // Search/Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [highlightedOrganizer, setHighlightedOrganizer] = useState("all");
  const organizers = useMemo(
    () => Array.from(new Set(
      activities
        .map(activity => activity.organizer_name?.trim())
        .filter((organizer): organizer is string => Boolean(organizer)),
    )).sort((left, right) => left.localeCompare(right, "vi")),
    [activities],
  );

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      let url = `${API_URL}/external-activities/`;
      const params = [];
      if (statusFilter !== "all") {
        params.push(`status=${statusFilter}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      } else {
        toast.error("Không thể tải danh sách hoạt động");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi đồng bộ dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    const handleRefresh = () => {
      fetchActivities();
    };
    window.addEventListener("refresh-external-activities", handleRefresh);
    return () => {
      window.removeEventListener("refresh-external-activities", handleRefresh);
    };
  }, [statusFilter]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName || !organizerName || !startDate || !endDate || !proposedScore) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const payload = {
        activity_name: activityName,
        organizer_name: organizerName,
        start_date: startDate,
        end_date: endDate,
        location,
        activity_type: activityType,
        participation_content: participationContent,
        proposed_score: proposedScore,
        description,
        status: "draft"
      };

      const res = await fetch(`${API_URL}/external-activities/`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Tạo nháp hoạt động thành công! Vui lòng nộp minh chứng.");
        setIsCreateOpen(false);
        // Reset form
        setActivityName("");
        setOrganizerName("");
        setLocation("");
        setParticipationContent("");
        setStartDate("");
        setEndDate("");
        setProposedScore(5);
        setDescription("");
        fetchActivities();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Lỗi tạo hồ sơ hoạt động");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !fileHash || !fileSize) {
      toast.error("Vui lòng điền đầy đủ thông tin file");
      return;
    }

    // Size limit check
    if (fileSize > 10 * 1024 * 1024) {
      toast.error("Kích thước file vượt quá 10MB!");
      return;
    }

    // Format check
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'png', 'jpg', 'jpeg'].includes(extension)) {
      toast.error("Định dạng file không hỗ trợ! Chỉ cho phép PDF, PNG, JPG, JPEG.");
      return;
    }

    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/evidence-files/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          activity: selectedActivity?.id,
          file_name: fileName,
          file_hash: fileHash,
          file_size: fileSize,
          file_url: fileUrl || "https://example.com/mock_file_url"
        })
      });

      if (res.ok) {
        toast.success("Tải lên minh chứng thành công!");
        setIsUploadOpen(false);
        setFileName("");
        setFileHash("");
        setFileUrl("");
        setIsCustomHash(false);
        // Refresh details
        if (selectedActivity) {
          const freshActRes = await fetch(`${API_URL}/external-activities/${selectedActivity.id}/`, { headers });
          if (freshActRes.ok) {
            const freshAct = await freshActRes.json();
            setSelectedActivity(freshAct);
          }
        }
        fetchActivities();
      } else {
        toast.error("Lỗi tải lên minh chứng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleDeleteEvidence = async (evidenceId: number) => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/evidence-files/${evidenceId}/`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        toast.success("Đã xóa file minh chứng");
        if (selectedActivity) {
          const freshActRes = await fetch(`${API_URL}/external-activities/${selectedActivity.id}/`, { headers });
          if (freshActRes.ok) {
            const freshAct = await freshActRes.json();
            setSelectedActivity(freshAct);
          }
        }
        fetchActivities();
      } else {
        toast.error("Lỗi khi xóa minh chứng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleSubmitActivity = async (id: number) => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/external-activities/${id}/submit/`, {
        method: "POST",
        headers
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Nộp hồ sơ thành công! Hệ thống đã chạy kiểm tra tự động.");
        fetchActivities();
        setSelectedActivity(data);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Lỗi khi nộp hồ sơ");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewStatus) {
      toast.error("Vui lòng chọn quyết định xét duyệt");
      return;
    }

    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let url = `${API_URL}/external-activities/${selectedActivity?.id}/review-advisor/`;
      if (isCTSV) {
        url = `${API_URL}/external-activities/${selectedActivity?.id}/review-ctsv/`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          status: reviewStatus,
          comment: reviewComment
        })
      });

      if (res.ok) {
        toast.success("Xét duyệt hồ sơ thành công!");
        setIsReviewOpen(false);
        setReviewStatus("");
        setReviewComment("");
        fetchActivities();
      } else {
        toast.error("Lỗi xét duyệt hồ sơ");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const selectPresetDocument = (preset: string) => {
    switch (preset) {
      case "original_1":
        setFileName("QuyetDinh_123_ITC_Original.pdf");
        setFileHash("df6c944ad7a35368a514d7a858ff4d3a2de3a16503c467a28e9d1bfcf24b3c9b");
        setFileSize(1523450); // ~1.4MB
        setFileUrl("https://example.com/files/QuyetDinh_123_ITC_Original.pdf");
        setIsCustomHash(false);
        break;
      case "duplicate_1":
        setFileName("QuyetDinh_123_ITC_Copy.pdf");
        setFileHash("df6c944ad7a35368a514d7a858ff4d3a2de3a16503c467a28e9d1bfcf24b3c9b"); // Same hash to trigger Rule 1/2/3
        setFileSize(1523450);
        setFileUrl("https://example.com/files/QuyetDinh_123_ITC_Copy.pdf");
        setIsCustomHash(false);
        break;
      case "original_2":
        setFileName("ChungNhan_MuaHeXanh.png");
        setFileHash("7f83b1657ff1fc53b92c4738cfbcfc0e251a2a46503a4d7a28e9a2632b35432b");
        setFileSize(4302910); // ~4.1MB
        setFileUrl("https://example.com/files/ChungNhan_MuaHeXanh.png");
        setIsCustomHash(false);
        break;
      case "invalid_format":
        setFileName("ChungNhan_BiaGia.exe");
        setFileHash("9983b1657ff1fc53b92c4738cfbcfc0e251a2a46503a4d7a28e9a2632b35432b");
        setFileSize(520300);
        setIsCustomHash(false);
        break;
      case "oversized":
        setFileName("Video_ThamGia_HoatDong.mp4");
        setFileHash("2a83b1657ff1fc53b92c4738cfbcfc0e251a2a46503a4d7a28e9a2632b35499a");
        setFileSize(15 * 1024 * 1024); // 15MB (> 10MB limit)
        setIsCustomHash(false);
        break;
      default:
        setFileName("");
        setFileHash("");
        setFileSize(1024 * 1024);
        setFileUrl("");
        setIsCustomHash(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Submitted</Badge>;
      case "advisor_approved":
        return <Badge className="bg-indigo-500 text-white hover:bg-indigo-600">Advisor Approved</Badge>;
      case "need_more_info":
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Need More Info</Badge>;
      case "rejected_by_advisor":
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Rejected By Advisor</Badge>;
      case "approved":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Award className="h-7 w-7 text-primary" /> Hoạt động ngoài trường
          </h1>
          <p className="text-muted-foreground mt-1">
            Khai báo, nộp minh chứng, và quản lý phê duyệt hoạt động ngoài trường của sinh viên.
          </p>
        </div>
        {isStudent && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-primary gap-2">
            <Plus className="h-4 w-4" /> Khai báo hoạt động mới
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-display text-lg">Danh sách hoạt động đã khai báo</CardTitle>
                <CardDescription>Tìm thấy {activities.length} bản ghi</CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Highlight:</Label>
                <Select value={highlightedOrganizer} onValueChange={setHighlightedOrganizer}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Theo đơn vị" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả đơn vị</SelectItem>
                    {organizers.map(organizer => (
                      <SelectItem key={organizer} value={organizer}>{organizer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Trạng thái:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="draft">Draft (Nháp)</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="advisor_approved">Advisor Approved</SelectItem>
                    <SelectItem value="need_more_info">Need More Info</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  Đang tải dữ liệu...
                </div>
              ) : activities.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                  Không có hoạt động ngoài trường nào.
                </div>
              ) : (
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {!isStudent && <TableHead>Sinh viên</TableHead>}
                      <TableHead>Tên hoạt động</TableHead>
                      <TableHead>Đơn vị tổ chức</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Điểm đề xuất</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((act) => {
                      const organizerName = act.organizer_name?.trim() || "Chưa xác định";
                      const organizerStyle = getOrganizerStyle(organizerName);
                      const isHighlighted = highlightedOrganizer === "all"
                        || highlightedOrganizer === organizerName;
                      return (
                      <TableRow
                        key={act.id}
                        className={cn(
                          "cursor-pointer transition-all hover:bg-muted/10",
                          selectedActivity?.id === act.id && "bg-primary/5",
                          highlightedOrganizer !== "all" && !isHighlighted && "opacity-35 grayscale",
                          highlightedOrganizer !== "all" && isHighlighted && "bg-primary/5",
                        )}
                        onClick={() => navigate(`/activities/${act.id}`)}
                      >
                        {!isStudent && (
                          <TableCell>
                            <div className="font-semibold text-sm">{act.student_name}</div>
                            <div className="text-xs text-muted-foreground">{act.student_id_str}</div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-sm">{act.activity_name}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className={organizerStyle.badge}>
                            <span className={cn("mr-1.5 h-2 w-2 rounded-full", organizerStyle.dot)} />
                            {organizerName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {act.start_date} → {act.end_date}
                        </TableCell>
                        <TableCell className="text-center font-bold text-primary">{act.proposed_score}</TableCell>
                        <TableCell>{getStatusBadge(act.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="xs" variant="outline" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); navigate(`/activities/${act.id}`); }}>
                            Xem chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="space-y-6">
          {selectedActivity ? (
            <Card className="border-0 shadow-md sticky top-6">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">{selectedActivity.activity_type}</span>
                    <CardTitle className="font-display text-xl mt-1">{selectedActivity.activity_name}</CardTitle>
                  </div>
                  {getStatusBadge(selectedActivity.status)}
                </div>
                {!isStudent && (
                  <div className="mt-2 text-sm bg-muted/40 p-2 rounded flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground">Sinh viên khai báo</p>
                      <p className="font-medium">{selectedActivity.student_name}</p>
                    </div>
                    <span className="font-mono text-xs bg-white border px-1.5 py-0.5 rounded">{selectedActivity.student_id_str}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-4 text-sm">
                {/* Details list */}
                <div className="space-y-3">
                  <div className="flex gap-2 items-start text-muted-foreground">
                    <Building className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Đơn vị tổ chức</span>
                      <Badge
                        variant="outline"
                        className={getOrganizerStyle(selectedActivity.organizer_name).badge}
                      >
                        {selectedActivity.organizer_name}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Địa điểm diễn ra</span>
                      <span className="text-foreground">{selectedActivity.location || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Thời gian diễn ra</span>
                      <span className="text-foreground">{selectedActivity.start_date} đến {selectedActivity.end_date}</span>
                    </div>
                  </div>
                  {selectedActivity.participation_content && (
                    <div className="bg-muted/20 p-2 rounded text-xs border border-dashed">
                      <span className="font-semibold block text-[10px] text-muted-foreground uppercase">Nội dung tham gia</span>
                      <p className="mt-1 text-foreground italic">"{selectedActivity.participation_content}"</p>
                    </div>
                  )}
                </div>

                {/* Evidence Section */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold flex items-center gap-1.5 text-sm">
                      <FileText className="h-4 w-4 text-primary" /> Hồ sơ minh chứng ({selectedActivity.evidence_files?.length || 0})
                    </h3>
                    {isStudent && (selectedActivity.status === "draft" || selectedActivity.status === "need_more_info") && (
                      <Button size="xs" variant="outline" className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/5" onClick={() => setIsUploadOpen(true)}>
                        <Upload className="h-3.5 w-3.5" /> Thêm file
                      </Button>
                    )}
                  </div>

                  {selectedActivity.evidence_files?.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">
                      Chưa nộp file minh chứng nào. Vui lòng tải lên trước khi nộp duyệt!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedActivity.evidence_files?.map((file) => (
                        <div key={file.id} className="p-2 border rounded-lg bg-background flex items-center justify-between text-xs gap-2">
                          <div className="overflow-hidden space-y-1">
                            <a href={file.file_url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline block truncate">
                              {file.file_name}
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{(file.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span className="font-mono text-[9px]" title={`SHA256: ${file.file_hash}`}>
                                SHA256: {file.file_hash.substring(0, 10)}...
                              </span>
                            </div>
                          </div>
                          {isStudent && (selectedActivity.status === "draft" || selectedActivity.status === "need_more_info") && (
                            <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEvidence(file.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fraud Warnings (Critical > High > Medium) */}
                {selectedActivity.fraud_flags && selectedActivity.fraud_flags.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <h3 className="font-display font-semibold flex items-center gap-1.5 text-sm text-destructive">
                      <ShieldAlert className="h-4 w-4" /> Cảnh báo tự động phát hiện ({selectedActivity.fraud_flags.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedActivity.fraud_flags.map((flag) => (
                        <div 
                          key={flag.id} 
                          className={`p-2 border rounded-lg text-xs flex gap-2 ${
                            flag.severity === "Critical" 
                              ? "bg-red-50 border-red-200 text-red-700" 
                              : flag.severity === "High" 
                              ? "bg-orange-50 border-orange-200 text-orange-700" 
                              : "bg-yellow-50 border-yellow-200 text-yellow-700"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block uppercase text-[10px]">
                              {flag.rule_code} • {flag.severity === "Critical" ? "Nguy cấp" : flag.severity === "High" ? "Cao" : "Trung bình"}
                            </span>
                            <p className="mt-0.5">{flag.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews / Feedback */}
                {selectedActivity.reviews && selectedActivity.reviews.length > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <h3 className="font-display font-semibold text-xs text-muted-foreground uppercase tracking-wider">Lịch sử xét duyệt</h3>
                    <div className="space-y-2">
                      {selectedActivity.reviews.map((rev) => (
                        <div key={rev.id} className="p-2 rounded bg-muted/40 text-xs border">
                          <div className="flex justify-between font-semibold text-muted-foreground">
                            <span>{rev.reviewer_name || "Hệ thống"} ({rev.review_level.toUpperCase()})</span>
                            <span className="text-[10px]">{rev.reviewed_at.substring(0, 10)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="font-medium text-foreground">Trạng thái:</span>
                            {getStatusBadge(rev.status)}
                          </div>
                          {rev.comment && (
                            <p className="mt-1 text-foreground bg-white border border-dashed p-1.5 rounded text-[11px] italic">
                              "{rev.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions panel */}
                <div className="pt-4 border-t flex flex-col gap-2">
                  {isStudent && (selectedActivity.status === "draft" || selectedActivity.status === "need_more_info") && (
                    <Button 
                      className="w-full bg-gradient-primary font-semibold gap-2" 
                      disabled={selectedActivity.evidence_files?.length === 0}
                      onClick={() => handleSubmitActivity(selectedActivity.id)}
                    >
                      Nộp hồ sơ xét duyệt <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {isAdvisor && selectedActivity.status === "submitted" && (
                    <Button className="w-full" onClick={() => { setReviewStatus("advisor_approved"); setIsReviewOpen(true); }}>
                      CVHT Xét duyệt
                    </Button>
                  )}

                  {isCTSV && ["submitted", "advisor_approved"].includes(selectedActivity.status) && (
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setReviewStatus("approved"); setIsReviewOpen(true); }}>
                      Phê duyệt cuối (CTSV)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-md p-8 text-center text-muted-foreground">
              <Info className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              Chọn một hoạt động khai báo để xem thông tin chi tiết, cảnh báo tự động, minh chứng, và lịch sử xét duyệt.
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Create Activity */}
      <Dialog open={isCreateOpen} onOpenChange={handleOpenCreateChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="font-display">Khai báo hoạt động ngoài trường mới</DialogTitle>
            <DialogDescription>Nhập thông tin chi tiết về hoạt động ngoài trường của bạn. Vui lòng khai báo đúng sự thật.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateActivity} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="actName">Tên hoạt động <span className="text-destructive">*</span></Label>
              <Input id="actName" placeholder="Ví dụ: Chiến dịch mùa hè xanh 2025" value={activityName} onChange={(e) => setActivityName(e.target.value)} required />
            </div>

            <div className="space-y-4">
              <OrganizerPicker
                value={organizerName}
                onChange={setOrganizerName}
                defaultNewType="Đơn vị ngoài trường"
              />
              <div className="space-y-1">
                <Label htmlFor="actLocation">Địa điểm diễn ra</Label>
                <Input id="actLocation" placeholder="Ví dụ: TPHCM" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="actType">Loại hoạt động</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger id="actType">
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hoạt động xã hội">Hoạt động xã hội</SelectItem>
                    <SelectItem value="Cuộc thi khoa học">Cuộc thi khoa học</SelectItem>
                    <SelectItem value="Hoạt động thể thao">Hoạt động thể thao</SelectItem>
                    <SelectItem value="Kỹ năng mềm">Kỹ năng mềm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="score">Điểm đề xuất <span className="text-destructive">*</span></Label>
                <Input id="score" type="number" min="1" max="30" value={proposedScore} onChange={(e) => setProposedScore(parseInt(e.target.value))} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sDate">Ngày bắt đầu <span className="text-destructive">*</span></Label>
                <Input id="sDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="eDate">Ngày kết thúc <span className="text-destructive">*</span></Label>
                <Input id="eDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="partContent">Nội dung công việc tham gia</Label>
              <Textarea id="partContent" placeholder="Mô tả cụ thể bạn đã tham gia làm việc gì..." value={participationContent} onChange={(e) => setParticipationContent(e.target.value)} rows={2} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="actDesc">Ghi chú / Mô tả thêm</Label>
              <Textarea id="actDesc" placeholder="Mô tả thêm chi tiết khác (nếu có)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Tạo bản nháp</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Upload Evidence */}
      <Dialog open={isUploadOpen} onOpenChange={handleOpenUploadChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-display">Tải lên minh chứng tham gia</DialogTitle>
            <DialogDescription>Chọn các tài liệu, giấy chứng nhận để nộp kèm với hoạt động rèn luyện ngoài trường.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Tải file thử nghiệm nhanh (Hỗ trợ demo rule trùng lặp)</span>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="xs" variant="outline" className="text-[10px]" onClick={() => selectPresetDocument("original_1")}>
                  Quyết định 123 gốc
                </Button>
                <Button type="button" size="xs" variant="outline" className="text-[10px]" onClick={() => selectPresetDocument("duplicate_1")}>
                  Quyết định 123 trùng
                </Button>
                <Button type="button" size="xs" variant="outline" className="text-[10px]" onClick={() => selectPresetDocument("original_2")}>
                  Ảnh Mùa hè xanh
                </Button>
                <Button type="button" size="xs" variant="outline" className="text-[10px] text-orange-600 hover:text-orange-700" onClick={() => selectPresetDocument("invalid_format")}>
                  File đuôi lạ (.exe)
                </Button>
                <Button type="button" size="xs" variant="outline" className="text-[10px] text-red-600 hover:text-red-700" onClick={() => selectPresetDocument("oversized")}>
                  File quá lớn (15MB)
                </Button>
                <Button type="button" size="xs" variant="outline" className="text-[10px]" onClick={() => selectPresetDocument("")}>
                  Nhập tay file khác
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fName">Tên file minh chứng <span className="text-destructive">*</span></Label>
              <Input id="fName" placeholder="Ví dụ: chung_nhan.pdf" value={fileName} onChange={(e) => setFileName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fHash">Mã băm SHA256 (Để chống sửa file/trùng lặp) <span className="text-destructive">*</span></Label>
              <Input 
                id="fHash" 
                placeholder="Ví dụ: df6c944ad7a35368a514d7a858ff4d3a..." 
                value={fileHash} 
                onChange={(e) => setFileHash(e.target.value)} 
                required 
                disabled={!isCustomHash}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Mã băm này dùng để định danh duy nhất file trên cơ sở dữ liệu.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fSize">Kích thước file (bytes) <span className="text-destructive">*</span></Label>
                <Input id="fSize" type="number" value={fileSize} onChange={(e) => setFileSize(parseInt(e.target.value))} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fUrl">Đường dẫn file (URL)</Label>
                <Input id="fUrl" placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Tải lên</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Review Activity (Advisor/CTSV) */}
      <Dialog open={isReviewOpen} onOpenChange={handleOpenReviewChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="font-display">Đánh giá và Xét duyệt hồ sơ</DialogTitle>
            <DialogDescription>
              Kiểm tra kỹ các thông tin khai báo, minh chứng đính kèm và cảnh báo gian lận trước khi đưa ra quyết định.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="reviewStatus">Quyết định xét duyệt <span className="text-destructive">*</span></Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger id="reviewStatus">
                  <SelectValue placeholder="Chọn quyết định" />
                </SelectTrigger>
                <SelectContent>
                  {isAdvisor && (
                    <>
                      <SelectItem value="advisor_approved">Duyệt hồ sơ (Advisor Approved)</SelectItem>
                      <SelectItem value="need_more_info">Yêu cầu bổ sung thông tin (Need More Info)</SelectItem>
                      <SelectItem value="rejected_by_advisor">Từ chối hồ sơ (Rejected By Advisor)</SelectItem>
                    </>
                  )}
                  {isCTSV && (
                    <>
                      <SelectItem value="approved">Phê duyệt cuối cùng (Approved)</SelectItem>
                      <SelectItem value="rejected">Từ chối phê duyệt cuối cùng (Rejected)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reviewComment">Ý kiến phản hồi / Nhận xét</Label>
              <Textarea id="reviewComment" placeholder="Nhập lý do từ chối hoặc nội dung yêu cầu bổ sung chi tiết..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">Lưu quyết định</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
