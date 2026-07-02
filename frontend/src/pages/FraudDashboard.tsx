import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, UserX, Smartphone, MapPin, ImageOff, Lock, Eye, CheckCircle, XCircle, Filter, RefreshCw, Award, Copy, Percent, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { API_URL } from "@/contexts/AuthContext";
import { FraudDetection, ChangeRequest, AuditLog } from "@/lib/mock-data";
import { toast } from "sonner";

interface ExternalActivity {
  id: number;
  student_name: string;
  student_id_str: string;
  activity_name: string;
  organizer_name: string;
  proposed_score: number;
  status: string;
  fraud_flags: {
    id: number;
    rule_code: string;
    severity: string;
    description: string;
  }[];
}

export default function FraudDashboard() {
  const [frauds, setFrauds] = useState<FraudDetection[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [externalActivities, setExternalActivities] = useState<ExternalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Post-audit state
  const [auditPercent, setAuditPercent] = useState("10");
  const [isAuditResultOpen, setIsAuditResultOpen] = useState(false);
  const [auditedList, setAuditedList] = useState<any[]>([]);
  const [auditMessage, setAuditMessage] = useState("");

  // Filters
  const [severityFilter, setSeverityFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [extSeverityFilter, setExtSeverityFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Fraud Detections (Check-in/out alerts)
      const resF = await fetch(`${API_URL}/fraud-detections/`);
      if (resF.ok) {
        const data = await resF.json();
        setFrauds(data.map((f: any) => ({
          id: f.id.toString(),
          student: f.student,
          student_name: f.student_name,
          student_id_str: f.student_id_str,
          activity: f.activity,
          activity_title: f.activity_title,
          rule_code: f.rule_code,
          severity: f.severity,
          description: f.description,
          created_at: f.created_at
        })));
      }

      // Fetch External Activities (for anti-fraud assessment)
      const resExt = await fetch(`${API_URL}/external-activities/`);
      if (resExt.ok) {
        const data = await resExt.json();
        setExternalActivities(data);
      }

      // Fetch Change Requests
      const resR = await fetch(`${API_URL}/change-requests/`);
      if (resR.ok) {
        const data = await resR.json();
        setRequests(data.map((r: any) => ({
          id: r.id.toString(),
          request_type: r.request_type,
          reason: r.reason,
          requested_by: r.requested_by,
          requested_by_name: r.requested_by_name,
          approved_by: r.approved_by,
          approved_by_name: r.approved_by_name,
          status: r.status,
          created_at: r.created_at
        })));
      }

      // Fetch Audit Logs
      const resL = await fetch(`${API_URL}/audit-logs/`);
      if (resL.ok) {
        const data = await resL.json();
        setAuditLogs(data.map((l: any) => ({
          id: l.id.toString(),
          user: l.user,
          user_name: l.user_name,
          action: l.action,
          entity_name: l.entity_name,
          entity_id: l.entity_id,
          before_value: l.before_value,
          after_value: l.after_value,
          ip_address: l.ip_address,
          device_id: l.device_id,
          created_at: l.created_at
        })));
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi đồng bộ dữ liệu giám sát gian lận");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveRequest = async (id: string, approve: boolean) => {
    try {
      const res = await fetch(`${API_URL}/change-requests/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: approve ? "approved" : "rejected" })
      });
      if (res.ok) {
        toast.success(approve ? "Đã phê duyệt yêu cầu thay đổi" : "Đã từ chối yêu cầu");
        fetchData();
      } else {
        toast.error("Không thể xử lý yêu cầu thay đổi");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleRunRandomAudit = async () => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/external-activities/random-audit/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ percent: parseInt(auditPercent) })
      });

      if (res.ok) {
        const data = await res.json();
        setAuditedList(data.audited_activities || []);
        setAuditMessage(data.message);
        setIsAuditResultOpen(true);
        toast.success("Hậu kiểm ngẫu nhiên hoàn tất!");
        fetchData();
      } else {
        toast.error("Không thể chạy hậu kiểm ngẫu nhiên");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const filteredFrauds = frauds.filter(f => {
    const matchS = severityFilter === "all" || f.severity === severityFilter;
    const matchR = ruleFilter === "all" || f.rule_code === ruleFilter;
    return matchS && matchR;
  });

  // Extract all fraud flags from external activities
  const externalFlags = externalActivities.flatMap(act => 
    (act.fraud_flags || []).map(flag => ({
      id: flag.id,
      activity_id: act.id,
      student_name: act.student_name,
      student_id_str: act.student_id_str,
      activity_name: act.activity_name,
      rule_code: flag.rule_code,
      severity: flag.severity,
      description: flag.description,
      status: act.status
    }))
  );

  // Sorting severity priority: Critical -> High -> Medium -> Low
  const severityOrder: Record<string, number> = { "Critical": 0, "High": 1, "Medium": 2, "Low": 3 };
  
  const sortedExternalFlags = externalFlags
    .filter(flag => extSeverityFilter === "all" || flag.severity === extSeverityFilter)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case "Critical":
        return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0 font-bold">Nguy cấp</Badge>;
      case "High":
        return <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/20 border-0 font-semibold">Cao</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20 border-0 font-medium">Trung bình</Badge>;
      default:
        return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-0">Thấp</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive" /> Giám sát & Chống gian lận
          </h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi xác thực Face ID khi check-in và tự động rà soát cảnh báo trùng lặp minh chứng ngoài trường.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2 self-start sm:self-center">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-white dark:from-red-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cảnh báo Nguy cấp</span>
              <p className="text-3xl font-extrabold text-destructive">
                {frauds.filter(f => f.severity === "Critical").length + externalFlags.filter(f => f.severity === "Critical").length}
              </p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive"><Lock className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trùng minh chứng</span>
              <p className="text-3xl font-extrabold text-orange-600">
                {externalFlags.filter(f => f.rule_code === "RULE_1" || f.rule_code === "RULE_2" || f.rule_code === "RULE_3").length}
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600"><Copy className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Hồ sơ chờ duyệt</span>
              <p className="text-3xl font-extrabold text-amber-600">
                {externalActivities.filter(act => act.status === "submitted").length}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600"><Award className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Yêu cầu Thay đổi Điểm</span>
              <p className="text-3xl font-extrabold text-primary">{requests.filter(r => r.status === "pending").length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><AlertTriangle className="h-6 w-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Retroactive Audit & Watchlist section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retroactive Audit Panel */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Percent className="h-5 w-5 text-indigo-600" /> Hậu kiểm ngẫu nhiên hồ sơ đã duyệt (Post-Audit)
            </CardTitle>
            <CardDescription>
              Phòng CTSV thực hiện rút ngẫu nhiên từ 5% đến 10% hồ sơ hoạt động ngoài trường đã duyệt để tiến hành hậu kiểm độc lập (gọi điện, xác minh website).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border">
              <div className="space-y-1 flex-1">
                <span className="font-bold text-xs text-muted-foreground uppercase">Tỷ lệ lấy mẫu hậu kiểm</span>
                <p className="text-xs text-muted-foreground">Chọn tỷ lệ phần trăm hồ sơ đã duyệt để rút kiểm tra ngẫu nhiên.</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={auditPercent} onValueChange={setAuditPercent}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Tỷ lệ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleRunRandomAudit}>
                  Chạy Hậu Kiểm
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist card */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Quy tắc Watchlist
            </CardTitle>
            <CardDescription>Các đơn vị cần xác minh đặc biệt:</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p className="p-2 border rounded bg-yellow-50 text-yellow-700">
              Hệ thống tự động quét tên Đơn vị tổ chức chứa từ khóa nghi vấn như: <strong>"Tự phát", "Cá nhân", "Unknown"</strong>.
            </p>
            <p className="p-2 border rounded bg-red-50 text-red-700">
              Trùng hash SHA256 giữa các sinh viên khác nhau được phân loại là <strong>Nguy cấp (Critical)</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Flags tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* External Activity Fraud Flags */}
        <Card className="border-0 shadow-md xl:col-span-2">
          <CardHeader className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2 text-destructive">
                <Award className="h-5 w-5" /> Cảnh báo Hoạt động Ngoài trường
              </CardTitle>
              <CardDescription>Các hồ sơ ngoài trường có dấu hiệu bất thường (Xếp ưu tiên Critical → High → Medium).</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={extSeverityFilter} onValueChange={setExtSeverityFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Mức độ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi mức độ</SelectItem>
                  <SelectItem value="Critical">Nguy cấp</SelectItem>
                  <SelectItem value="High">Cao</SelectItem>
                  <SelectItem value="Medium">Trung bình</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SV</TableHead>
                  <TableHead>Sinh viên</TableHead>
                  <TableHead>Tên hoạt động ngoài trường</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Nội dung nghi vấn</TableHead>
                  <TableHead>Luật quét</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExternalFlags.map((flag) => (
                  <TableRow key={flag.id} className="hover:bg-muted/10">
                    <TableCell className="font-mono font-medium text-xs">{flag.student_id_str}</TableCell>
                    <TableCell className="text-xs font-semibold">{flag.student_name}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[150px] truncate" title={flag.activity_name}>{flag.activity_name}</TableCell>
                    <TableCell>{getSeverityBadge(flag.severity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{flag.description}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-destructive">{flag.rule_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{flag.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedExternalFlags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Không phát hiện nghi vấn nào trên hoạt động ngoài trường.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Change Requests Section */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" /> Yêu cầu Sửa điểm (LOCKED)
            </CardTitle>
            <CardDescription>Thay đổi điểm sau khi CTSV phê duyệt phải được duyệt tại đây.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {requests.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">{r.request_type}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Yêu cầu bởi: <strong>{r.requested_by_name}</strong></p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground border-l-2 pl-2 italic">"{r.reason}"</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApproveRequest(r.id, true)} className="flex-1 bg-success hover:bg-success/90 h-8 text-xs gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Duyệt sửa
                  </Button>
                  <Button size="sm" onClick={() => handleApproveRequest(r.id, false)} variant="outline" className="flex-1 hover:bg-destructive/10 hover:text-destructive h-8 text-xs gap-1 border-destructive/20 text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> Từ chối
                  </Button>
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === "pending").length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">Không có yêu cầu chỉnh sửa điểm nào đang chờ duyệt.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Internal checkins anomalies */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Check-in Alerts */}
        <Card className="border-0 shadow-md xl:col-span-2">
          <CardHeader className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Nhật ký Nghi vấn Check-in Face ID
              </CardTitle>
              <CardDescription>Danh sách cảnh báo check-in/out tự động của hoạt động nội bộ.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Mức độ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi mức độ</SelectItem>
                  <SelectItem value="Critical">Nguy cấp</SelectItem>
                  <SelectItem value="High">Cao</SelectItem>
                  <SelectItem value="Medium">Trung bình</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SV</TableHead>
                  <TableHead>Sinh viên</TableHead>
                  <TableHead>Hoạt động</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Mô tả vi phạm</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFrauds.map(f => (
                  <TableRow key={f.id} className="hover:bg-muted/10">
                    <TableCell className="font-mono font-medium text-xs">{f.student_id_str || "N/A"}</TableCell>
                    <TableCell className="text-xs">{f.student_name || "Hệ thống"}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs" title={f.activity_title}>{f.activity_title || "Toàn cục"}</TableCell>
                    <TableCell>{getSeverityBadge(f.severity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.description}</TableCell>
                    <TableCell className="text-xs font-mono">{f.created_at ? new Date(f.created_at).toLocaleString() : "Vừa xong"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                  </TableRow>
                ))}
                {filteredFrauds.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Không phát hiện cảnh báo nghi vấn nào.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="font-display flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" /> Nhật ký Thay đổi Dữ liệu (Audit Log)
            </CardTitle>
            <CardDescription>Ghi lại toàn bộ hành động chỉnh sửa trạng thái hoạt động.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tài khoản</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.slice(0, 15).map(l => (
                  <TableRow key={l.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium text-[10px]">{l.user_name || "Hệ thống"}</TableCell>
                    <TableCell className="text-[10px] font-semibold">
                      <div>{l.action}</div>
                      <div className="text-[9px] text-muted-foreground">{l.entity_name} ID: {l.entity_id}</div>
                    </TableCell>
                    <TableCell className="text-[9px] font-mono whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleDateString() : "Vừa xong"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Post-Audit Results */}
      <Dialog open={isAuditResultOpen} onOpenChange={setIsAuditResultOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Percent className="h-5 w-5 text-indigo-600" /> Kết quả chọn mẫu hậu kiểm ngẫu nhiên</DialogTitle>
            <DialogDescription>
              {auditMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
            {auditedList.map(act => (
              <div key={act.id} className="p-3 border rounded-lg bg-muted/30 text-xs flex justify-between items-center gap-2">
                <div>
                  <span className="font-semibold text-sm block">{act.activity_name}</span>
                  <span className="text-muted-foreground">Sinh viên: {act.student_name} ({act.student_id_str})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary block">{act.proposed_score} điểm</span>
                  <span className="text-[10px] text-muted-foreground">Đơn vị: {act.organizer_name}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setIsAuditResultOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Xác nhận hậu kiểm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
