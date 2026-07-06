import { useState, useMemo, useEffect } from "react";
import { Settings as SettingsIcon, Bell, Database, Lock, Calendar, Shield, Plus, Edit2, Trash2, Key, ShieldAlert, Copy, RefreshCw, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, Role } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SettingsPage() {
  const { allUsers, fetchUsers } = useAuth();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form states
  const [nameInput, setNameInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<Role>("advisor");

  // State to show newly generated passwords (on create or reset)
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    username: string;
    studentId: string;
    pass: string;
    type: "create" | "reset";
  }>({
    isOpen: false,
    username: "",
    studentId: "",
    pass: "",
    type: "create"
  });

  interface ScaleEntry {
    min_score: number;
    label: string;
  }
  const [scale, setScale] = useState<ScaleEntry[]>([]);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [savingScale, setSavingScale] = useState(false);

  const fetchScale = async () => {
    setScaleLoading(true);
    try {
      const res = await fetch(`${API_URL}/configs/training_score_scale/`);
      if (res.ok) {
        const data = await res.json();
        setScale(Array.isArray(data.value) ? data.value : []);
      } else {
        toast.error("Không thể tải cấu hình thang điểm");
        setScale([]);
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
      setScale([]);
    } finally {
      setScaleLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchScale();
  }, []);

  const handleScaleChange = (index: number, field: keyof ScaleEntry, val: string) => {
    const updated = [...scale];
    if (field === 'min_score') {
      updated[index].min_score = parseInt(val) || 0;
    } else {
      updated[index].label = val;
    }
    setScale(updated);
  };

  const handleSaveScale = async () => {
    for (let entry of scale) {
      if (entry.min_score < 0 || entry.min_score > 100) {
        toast.error("Điểm tối thiểu phải nằm trong khoảng từ 0 đến 100");
        return;
      }
      if (!entry.label.trim()) {
        toast.error("Nhãn xếp loại không được để trống");
        return;
      }
    }

    setSavingScale(true);
    try {
      const res = await fetch(`${API_URL}/configs/training_score_scale/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "training_score_scale",
          value: scale,
          description: "Thang điểm xếp loại điểm rèn luyện"
        })
      });
      if (res.ok) {
        toast.success("Cập nhật thang điểm xếp loại thành công!");
        fetchScale();
      } else {
        toast.error("Không thể lưu cấu hình thang điểm");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSavingScale(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success("Đã cập nhật vai trò người dùng");
        fetchUsers();
      } else {
        toast.error("Không thể cập nhật vai trò");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/toggle-active/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast.success(`Đã ${!currentStatus ? "mở" : "đóng"} tài khoản người dùng thành công!`);
        fetchUsers();
      } else {
        toast.error("Không thể thay đổi trạng thái tài khoản");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleAddClick = () => {
    setEditingUser(null);
    setNameInput("");
    setStudentIdInput("");
    setEmailInput("");
    setRoleInput("advisor");
    setIsUserDialogOpen(true);
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setNameInput(u.fullName);
    setStudentIdInput(u.studentId || u.username);
    setEmailInput(u.email);
    setRoleInput(u.role);
    setIsUserDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa người dùng thành công!");
        fetchUsers();
      } else {
        toast.error("Không thể xóa người dùng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleResetPassword = async (u: User) => {
    try {
      const res = await fetch(`${API_URL}/users/${u.id}/reset-password/`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setPasswordModal({
          isOpen: true,
          username: u.fullName,
          studentId: u.studentId || u.username,
          pass: data.password,
          type: "reset"
        });
        fetchUsers();
      } else {
        toast.error("Không thể reset mật khẩu");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !emailInput || (editingUser && !studentIdInput)) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (editingUser) {
      try {
        const res = await fetch(`${API_URL}/users/${editingUser.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: nameInput,
            student_id: studentIdInput,
            email: emailInput,
            role: roleInput
          })
        });
        if (res.ok) {
          toast.success("Cập nhật thông tin người dùng thành công!");
          setIsUserDialogOpen(false);
          fetchUsers();
        } else {
          toast.error("Không thể cập nhật thông tin");
        }
      } catch (err) {
        toast.error("Lỗi kết nối máy chủ");
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/users/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: nameInput,
            studentId: studentIdInput,
            email: emailInput,
            role: roleInput
          })
        });
        if (res.ok) {
          const data = await res.json();
          setIsUserDialogOpen(false);
          setPasswordModal({
            isOpen: true,
            username: nameInput,
            studentId: data.user.studentId || data.user.student_id || data.user.username || studentIdInput,
            pass: data.password,
            type: "create"
          });
          fetchUsers();
        } else {
          const errData = await res.json();
          toast.error(errData.error || "Không thể tạo tài khoản");
        }
      } catch (err) {
        toast.error("Lỗi kết nối máy chủ");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép mật khẩu vào bộ nhớ tạm!");
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3"><SettingsIcon className="h-7 w-7 text-primary" />Cấu hình hệ thống</h1>
          <p className="text-muted-foreground mt-1">Quản lý cài đặt chung, thang điểm xếp loại và tài khoản người dùng trong hệ thống.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList className="bg-muted/60 p-1 w-full max-w-lg grid grid-cols-3">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Cài đặt chung
          </TabsTrigger>
          <TabsTrigger value="scale" className="gap-2">
            <Award className="h-4 w-4" /> Thang điểm xếp loại
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Shield className="h-4 w-4" /> Tài khoản & Phân quyền
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Học kỳ hiện tại</CardTitle>
              <CardDescription>Cấu hình thời gian đánh giá</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Học kỳ</Label>
                <Select defaultValue="HK1">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="HK1">Học kỳ 1</SelectItem><SelectItem value="HK2">Học kỳ 2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Năm học</Label><Input defaultValue="2024-2025" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Bắt đầu chấm</Label><Input type="date" defaultValue="2024-12-01" /></div>
                <div className="space-y-2"><Label>Hạn cuối</Label><Input type="date" defaultValue="2024-12-31" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Thông báo</CardTitle>
              <CardDescription>Cấu hình email và thông báo</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { l: "Thông báo qua email", d: "Gửi email khi có phiếu mới" },
                { l: "Nhắc nhở hạn nộp", d: "Tự động nhắc trước 3 ngày" },
                { l: "Thông báo kết quả", d: "Gửi kết quả duyệt cho sinh viên" },
              ].map(s => (
                <div key={s.l} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium text-sm">{s.l}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scale" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> Cấu hình Thang điểm Xếp loại
              </CardTitle>
              <CardDescription>
                Thiết lập điểm tối thiểu (mốc dưới) cho mỗi loại xếp loại rèn luyện. Điểm tối đa mặc định là 100.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {scaleLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Xếp loại</TableHead>
                          <TableHead>Mốc điểm tối thiểu</TableHead>
                          <TableHead>Mô tả phạm vi điểm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(scale) && scale.map((entry, idx) => {
                          const maxVal = idx === 0 ? 100 : (scale[idx - 1]?.min_score || 0) - 1;
                          return (
                            <TableRow key={entry.label} className="hover:bg-muted/20">
                              <TableCell className="font-semibold">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  {entry.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 max-w-[150px]">
                                  <span className="text-muted-foreground text-sm">≥</span>
                                  <Input
                                    type="number"
                                    value={entry.min_score}
                                    onChange={(e) => handleScaleChange(idx, 'min_score', e.target.value)}
                                    className="h-9 font-mono"
                                    min={0}
                                    max={100}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                Từ {entry.min_score} đến {maxVal} điểm
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={fetchScale} disabled={scaleLoading || savingScale}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Hủy thay đổi
                    </Button>
                    <Button onClick={handleSaveScale} disabled={savingScale} className="bg-gradient-primary">
                      {savingScale && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Lưu cấu hình
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Quản lý tài khoản và Phân quyền
                </CardTitle>
                <CardDescription className="mt-1">
                  Tạo tài khoản mới, cấp mật khẩu ngẫu nhiên, reset mật khẩu, kích hoạt hoặc khóa tài khoản hệ thống.
                </CardDescription>
              </div>
              <Button onClick={handleAddClick} className="bg-gradient-primary gap-2 text-xs w-fit">
                <Plus className="h-4 w-4" />Thêm tài khoản mới
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Mã số đăng nhập</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Quyền hiện tại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.filter(u => (u.role !== "student" && u.role !== "class_monitor") || (u.organizations && u.organizations.length > 0)).map(u => (
                    <TableRow key={u.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="font-medium">{u.fullName}</div>
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          {u.isFirstLogin && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Đăng nhập lần đầu</span>
                          )}
                          {u.organizations && u.organizations.map(org => (
                            <Badge key={org.id} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                              {org.organization_name} ({org.position})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{u.studentId || u.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(r) => handleRoleChange(u.id, r as Role)}>
                          <SelectTrigger className="w-[170px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="organizer">Đơn vị tổ chức</SelectItem>
                            <SelectItem value="advisor">Cố vấn học tập</SelectItem>
                            <SelectItem value="student_affairs">Phòng CTSV</SelectItem>
                            <SelectItem value="academic_affairs">Phòng Đào tạo</SelectItem>
                            <SelectItem value="admin">Quản trị hệ thống</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={u.isActive !== false} 
                            onCheckedChange={() => handleToggleActive(u.id, u.isActive !== false)} 
                          />
                          <span className={`text-xs font-semibold ${u.isActive !== false ? "text-success" : "text-destructive"}`}>
                            {u.isActive !== false ? "Đang mở" : "Đã khóa"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-amber-600 hover:text-amber-700" 
                            onClick={() => handleResetPassword(u)}
                            title="Cấp lại mật khẩu mới"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleEditClick(u)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* User Form Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingUser ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Cập nhật các trường thông tin cơ bản cho tài khoản." 
                : "Mật khẩu ngẫu nhiên sẽ được sinh tự động sau khi tạo và yêu cầu người dùng đổi mật khẩu ở lần đăng nhập kế tiếp."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên *</Label>
              <Input id="name" value={nameInput} onChange={e => setNameInput(e.target.value)} required placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label htmlFor="studentId">Mã số đăng nhập</Label>
                <Input id="studentId" value={studentIdInput} disabled className="bg-muted" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} required placeholder="user@university.edu.vn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Quyền hạn hệ thống</Label>
              <Select value={roleInput} onValueChange={(r) => setRoleInput(r as Role)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="organizer">Đơn vị tổ chức hoạt động</SelectItem>
                  <SelectItem value="advisor">Cố vấn học tập</SelectItem>
                  <SelectItem value="student_affairs">Phòng Công tác SV</SelectItem>
                  <SelectItem value="academic_affairs">Phòng Đào tạo</SelectItem>
                  <SelectItem value="admin">Quản trị hệ thống</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-gradient-primary">
                {editingUser ? "Cập nhật" : "Tạo mới & Sinh mật khẩu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Output Dialog */}
      <Dialog open={passwordModal.isOpen} onOpenChange={(o) => { if (!o) setPasswordModal(prev => ({ ...prev, isOpen: false })); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-success">
              <ShieldAlert className="h-5 w-5" />
              {passwordModal.type === "create" ? "Tạo tài khoản thành công!" : "Reset mật khẩu thành công!"}
            </DialogTitle>
            <DialogDescription>
              Hãy lưu lại mật khẩu ngẫu nhiên này để cung cấp cho người dùng đăng nhập lần đầu.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Tài khoản (Mã số):</p>
              <p className="font-bold text-sm">{passwordModal.studentId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mật khẩu mới (Tạo ngẫu nhiên):</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-mono font-bold text-lg text-primary select-all">{passwordModal.pass}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => copyToClipboard(passwordModal.pass)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-gradient-primary" onClick={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}>
              Đóng và tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
