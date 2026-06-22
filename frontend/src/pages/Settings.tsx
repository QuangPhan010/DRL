import { useState } from "react";
import { Settings as SettingsIcon, Bell, Database, Lock, Calendar, Shield, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { mockUsers, User, Role } from "@/lib/mock-data";
import { toast } from "sonner";

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form states
  const [nameInput, setNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<Role>("student");

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast.success("Thay đổi phân quyền thành công! Hãy lưu cấu hình để áp dụng.");
  };

  const handleAddClick = () => {
    setEditingUser(null);
    setNameInput("");
    setUsernameInput("");
    setEmailInput("");
    setRoleInput("student");
    setIsUserDialogOpen(true);
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setNameInput(u.fullName);
    setUsernameInput(u.username);
    setEmailInput(u.email);
    setRoleInput(u.role);
    setIsUserDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    toast.success("Đã xóa người dùng thành công!");
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, fullName: nameInput, username: usernameInput, email: emailInput, role: roleInput } : u));
      toast.success("Cập nhật thông tin người dùng thành công!");
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        fullName: nameInput,
        username: usernameInput,
        password: "password123",
        email: emailInput,
        role: roleInput
      };
      setUsers([...users, newUser]);
      toast.success("Thêm người dùng mới thành công!");
    }
    setIsUserDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3"><SettingsIcon className="h-7 w-7 text-primary" />Cấu hình hệ thống</h1>
        <p className="text-muted-foreground mt-1">Quản lý cài đặt chung của hệ thống điểm rèn luyện.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Bảo mật</CardTitle>
            <CardDescription>Quyền hạn và bảo mật hệ thống</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {[
              { l: "Sinh viên tự đánh giá", d: "Cho phép SV nhập điểm trước" },
              { l: "Yêu cầu duyệt 2 cấp", d: "Cố vấn + Trưởng khoa" },
              { l: "Khoá khi đã duyệt", d: "Không thể sửa sau khi duyệt" },
            ].map(s => (
              <div key={s.l} className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="font-medium text-sm">{s.l}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
                <Switch defaultChecked={s.l !== "Sinh viên tự đánh giá"} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Sao lưu dữ liệu</CardTitle>
            <CardDescription>Quản lý sao lưu và phục hồi</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-card border">
              <p className="text-sm text-muted-foreground">Lần sao lưu gần nhất</p>
              <p className="font-display font-bold mt-1">09/06/2026, 03:00</p>
            </div>
            <Button variant="outline" className="w-full">Sao lưu ngay</Button>
            <Button variant="outline" className="w-full">Xuất toàn bộ dữ liệu</Button>
          </CardContent>
        </Card>

        {/* Roles and Permissions Section */}
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Phân quyền người dùng
              </CardTitle>
              <CardDescription className="mt-1">Quản lý vai trò (roles) và điều chỉnh các quyền hạn truy cập của cán bộ, sinh viên trong hệ thống.</CardDescription>
            </div>
            <Button onClick={handleAddClick} className="bg-gradient-primary gap-2 text-xs">
              <Plus className="h-4 w-4" />Thêm người dùng
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Quyền hiện tại</TableHead>
                  <TableHead>Thay đổi quyền hạn</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs font-semibold">
                        {u.role === "student" && "Sinh viên"}
                        {u.role === "organizer" && "Đơn vị tổ chức"}
                        {u.role === "class_monitor" && "Ban cán sự lớp"}
                        {u.role === "advisor" && "Cố vấn học tập"}
                        {u.role === "student_affairs" && "Phòng CTSV"}
                        {u.role === "academic_affairs" && "Phòng Đào tạo"}
                        {u.role === "admin" && "Quản trị hệ thống"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(r) => handleRoleChange(u.id, r as Role)}>
                        <SelectTrigger className="w-[170px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Sinh viên</SelectItem>
                          <SelectItem value="organizer">Đơn vị tổ chức</SelectItem>
                          <SelectItem value="class_monitor">Ban cán sự lớp</SelectItem>
                          <SelectItem value="advisor">Cố vấn học tập</SelectItem>
                          <SelectItem value="student_affairs">Phòng CTSV</SelectItem>
                          <SelectItem value="academic_affairs">Phòng Đào tạo</SelectItem>
                          <SelectItem value="admin">Quản trị hệ thống</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
      </div>

      {/* User Form Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên</Label>
              <Input id="name" value={nameInput} onChange={e => setNameInput(e.target.value)} required placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input id="username" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} required placeholder="Ví dụ: nguyenvala" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} required placeholder="user@university.edu.vn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Quyền hạn hệ thống</Label>
              <Select value={roleInput} onValueChange={(r) => setRoleInput(r as Role)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Sinh viên</SelectItem>
                  <SelectItem value="organizer">Đơn vị tổ chức hoạt động</SelectItem>
                  <SelectItem value="class_monitor">Ban cán sự lớp</SelectItem>
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
                {editingUser ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] z-20 bg-card/90 backdrop-blur-md p-4 border-t flex justify-end gap-2 shadow-lg transition-all duration-200">
        <Button variant="outline">Khôi phục mặc định</Button>
        <Button className="bg-gradient-primary" onClick={() => toast.success("Đã lưu cấu hình và phân quyền mới thành công!")}>Lưu thay đổi</Button>
      </div>
    </div>
  );
}
