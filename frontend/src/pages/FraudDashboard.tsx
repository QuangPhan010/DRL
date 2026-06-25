import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, UserX, Smartphone, MapPin, ImageOff, Lock, Eye, CheckCircle, XCircle, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/contexts/AuthContext";
import { FraudDetection, ChangeRequest, AuditLog } from "@/lib/mock-data";
import { toast } from "sonner";

export default function FraudDashboard() {
  const [frauds, setFrauds] = useState<FraudDetection[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Fraud Detections
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

  const handleRequestResubmit = async (id: string) => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_URL}/fraud-detections/${id}/request-resubmit/`, {
        method: "POST",
        headers
      });
      if (res.ok) {
        toast.success("Đã yêu cầu sinh viên gửi lại ảnh selfie minh chứng!");
        fetchData();
      } else {
        toast.error("Không thể gửi yêu cầu");
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

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case "Critical":
        return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0 font-bold">Nguy cấp</Badge>;
      case "High":
        return <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/20 border-0 font-semibold">Cao</Badge>;
      default:
        return <Badge className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20 border-0">Trung bình</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive" /> Giám sát & Chống gian lận
          </h1>
          <p className="text-muted-foreground mt-1">Phát hiện bất thường GPS, trùng thiết bị check-in và quản lý yêu cầu chỉnh sửa điểm.</p>
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
              <p className="text-3xl font-extrabold text-destructive">{frauds.filter(f => f.severity === "Critical").length}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive"><Lock className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Vi phạm GPS / Selfie</span>
              <p className="text-3xl font-extrabold text-orange-600">{frauds.filter(f => f.rule_code === "RULE_1" || f.rule_code === "RULE_2" || f.rule_code === "RULE_4").length}</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600"><MapPin className="h-6 w-6" /></div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trùng Thiết Bị (3p)</span>
              <p className="text-3xl font-extrabold text-amber-600">{frauds.filter(f => f.rule_code === "RULE_5").length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600"><Smartphone className="h-6 w-6" /></div>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Fraud Log Table */}
        <Card className="border-0 shadow-md xl:col-span-2">
          <CardHeader className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Nhật ký Cảnh báo Nghi vấn
              </CardTitle>
              <CardDescription>Danh sách cảnh báo tự động từ hệ thống check-in/out.</CardDescription>
            </div>
            <div className="flex gap-2 self-start md:self-center">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Mức độ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi mức độ</SelectItem>
                  <SelectItem value="Critical">Nguy cấp</SelectItem>
                  <SelectItem value="High">Cao</SelectItem>
                  <SelectItem value="Medium">Trung bình</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Luật vi phạm" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi luật</SelectItem>
                  <SelectItem value="RULE_1">Quá bán kính check-in</SelectItem>
                  <SelectItem value="RULE_2">Quá bán kính check-out</SelectItem>
                  <SelectItem value="RULE_4">Thiếu selfie</SelectItem>
                  <SelectItem value="RULE_5">Check-in chung thiết bị</SelectItem>
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
                    <TableCell className="text-right">
                      {f.rule_code === "RULE_4" && (
                        <Button 
                          size="xs" 
                          onClick={() => handleRequestResubmit(f.id)} 
                          disabled={f.description.includes("Đã yêu cầu gửi lại")}
                          className="bg-primary text-white hover:bg-primary/90 text-xs px-2.5 py-1 h-7 disabled:opacity-60"
                        >
                          {f.description.includes("Đã yêu cầu gửi lại") ? "Đang chờ gửi lại" : "Yêu cầu gửi lại"}
                        </Button>
                      )}
                    </TableCell>
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

      {/* Audit Logs Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="font-display flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" /> Nhật ký Thay đổi Dữ liệu (Audit Log)
          </CardTitle>
          <CardDescription>Ghi lại toàn bộ hành động chỉnh sửa thông tin, điểm rèn luyện và trạng thái hoạt động.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Bảng tác động</TableHead>
                <TableHead>Giá trị trước</TableHead>
                <TableHead>Giá trị sau</TableHead>
                <TableHead>Địa chỉ IP</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map(l => (
                <TableRow key={l.id} className="hover:bg-muted/10">
                  <TableCell className="font-medium text-xs">{l.user_name || "Hệ thống"}</TableCell>
                  <TableCell className="text-xs font-semibold">{l.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.entity_name} (ID: {l.entity_id})</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate" title={l.before_value}>{l.before_value || "N/A"}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate text-primary font-medium" title={l.after_value}>{l.after_value || "N/A"}</TableCell>
                  <TableCell className="text-xs font-mono">{l.ip_address || "127.0.0.1"}</TableCell>
                  <TableCell className="text-xs font-mono">{l.created_at ? new Date(l.created_at).toLocaleString() : "Vừa xong"}</TableCell>
                </TableRow>
              ))}
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Không có dữ liệu nhật ký thay đổi.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </div>
    );
  }
