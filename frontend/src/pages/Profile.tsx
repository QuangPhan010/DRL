import { useState, useEffect } from "react";
import { UserIcon, Mail, Shield, GraduationCap, Phone, CalendarDays, Key, CheckCircle2, Award, Building2, BookOpen, AlertCircle, Copy, Check, Edit, Camera, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { detectFaceFromDataUrl } from "@/lib/face-recognition";

interface StudentDetail {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  class_name: string;
  faculty: string;
  cohort: string;
  gender: string;
  phone: string;
  positions: Array<{ position_name: string }>;
}

const roleLabels: Record<string, string> = {
  admin: "Quản trị hệ thống",
  advisor: "Cố vấn học tập",
  student: "Sinh viên",
  organizer: "Đơn vị tổ chức",
  class_monitor: "Ban cán sự lớp",
  student_affairs: "Phòng Công tác SV",
  academic_affairs: "Phòng Đào tạo"
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  advisor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  student: "bg-green-500/10 text-green-500 border-green-500/20",
  organizer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  class_monitor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  student_affairs: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  academic_affairs: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
};

export default function Profile() {
  const { user, updateUserPassword, updateProfileContext } = useAuth();
  const [studentInfo, setStudentInfo] = useState<StudentDetail | null>(null);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Edit profile states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updatingInfo, setUpdatingInfo] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName);
      setEditEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (studentInfo) {
      setEditPhone(studentInfo.phone || "");
    }
  }, [studentInfo]);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = localStorage.getItem("drl_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Fetch detailed student info if user is student / class monitor
        if (user.studentId && (user.role === "student" || user.role === "class_monitor")) {
          const res = await fetch(`${API_URL}/students/?student_id=${user.studentId}`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
              setStudentInfo(data[0]);
            }
          }

          // Fetch activities and filter student participations
          const actRes = await fetch(`${API_URL}/activities/`, { headers });
          if (actRes.ok) {
            const acts = await actRes.json();
            const participated = acts.filter((act: any) =>
              act.participants?.some((p: any) => p.student_id === user.studentId)
            ).map((act: any) => {
              const myPart = act.participants.find((p: any) => p.student_id === user.studentId);
              return {
                id: act.id,
                title: act.title,
                points: act.points,
                date: act.date,
                organizer: act.organizer,
                status: myPart?.status || "registered",
              };
            });
            setMyActivities(participated);
          }
        }
      } catch (err) {
        console.error("Lỗi tải thông tin cá nhân:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [user]);

  const handleCopyId = () => {
    if (user?.studentId) {
      navigator.clipboard.writeText(user.studentId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.success("Đã sao chép mã số");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ các trường mật khẩu");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setPasswordLoading(true);
      await updateUserPassword(user?.username || "", newPassword);
      toast.success("Cập nhật mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Không thể cập nhật mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Kích thước ảnh đại diện không được vượt quá 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const loadingToast = toast.loading("Đang kiểm tra khuôn mặt trong ảnh đại diện...");
        try {
          const face = await detectFaceFromDataUrl(base64String);
          const token = localStorage.getItem("drl_token");
          const response = await fetch(`${API_URL}/users/${user?.id}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              avatar: base64String,
              avatar_embedding: face.embedding,
            }),
          });
          if (!response.ok) throw new Error("Không thể lưu ảnh đại diện lên máy chủ.");
          updateProfileContext({ avatar: base64String });
          toast.success("Cập nhật ảnh đại diện Face ID thành công!", { id: loadingToast });
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Ảnh phải có đúng một khuôn mặt rõ ràng.",
            { id: loadingToast },
          );
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim() || !editEmail.trim()) {
      toast.error("Họ tên và email không được bỏ trống");
      return;
    }

    try {
      setUpdatingInfo(true);
      const token = localStorage.getItem("drl_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // 1. Update User model
      const userRes = await fetch(`${API_URL}/users/${user?.id}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          full_name: editFullName.trim(),
          email: editEmail.trim(),
        })
      });

      if (!userRes.ok) throw new Error("Không thể cập nhật thông tin tài khoản");

      // 2. Update Student model if student
      if (studentInfo) {
        const studentRes = await fetch(`${API_URL}/students/${studentInfo.id}/`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            full_name: editFullName.trim(),
            email: editEmail.trim(),
            phone: editPhone.trim(),
          })
        });
        if (!studentRes.ok) throw new Error("Không thể cập nhật thông tin sinh viên");

        const updatedStudent = await studentRes.json();
        setStudentInfo(updatedStudent);
      }

      // Update auth context state to reflect name/email updates across the app instantly
      updateProfileContext({
        fullName: editFullName.trim(),
        email: editEmail.trim(),
      });

      toast.success("Cập nhật thông tin cá nhân thành công!");
      setIsEditingInfo(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Lỗi khi cập nhật thông tin");
    } finally {
      setUpdatingInfo(false);
    }
  };

  if (!user) return null;
  const initials = user.fullName.split(" ").slice(-2).map(n => n[0]).join("") ?? "U";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "attended":
        return <Badge className="bg-success/15 text-success border-success/20">Đã tham gia</Badge>;
      case "evidence_submitted":
        return <Badge className="bg-warning/15 text-warning border-warning/20">Đã nộp minh chứng</Badge>;
      default:
        return <Badge className="bg-primary/15 text-primary border-primary/20">Đã đăng ký</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <UserIcon className="h-7 w-7 text-primary" />Thông tin tài khoản
        </h1>
        <p className="text-muted-foreground mt-1">Quản lý và xem chi tiết thông tin cá nhân của bạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Left */}
        <Card className="border-0 shadow-md h-fit overflow-hidden bg-gradient-card">
          <div className="h-24 bg-gradient-primary relative" />
          <CardContent className="pt-0 pb-6 text-center relative -mt-12">
            <div className="flex justify-center mb-4">
              <div className="relative group mx-auto h-24 w-24 rounded-full overflow-hidden border-4 border-card shadow-lg cursor-pointer">
                <Avatar className="h-full w-full">
                  {user.avatar && <AvatarImage src={user.avatar} className="object-cover animate-fade-in" />}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                >
                  <Camera className="h-5 w-5 text-white mb-1" />
                  <span className="text-[10px] text-white font-medium">Thay đổi</span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
            <h2 className="font-display text-xl font-bold">{user.fullName}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-muted-foreground text-sm">
              <span>{user.studentId || user.username}</span>
              {user.studentId && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                  {copiedId ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>

            <Badge variant="outline" className={`mt-3 ${roleBadgeColors[user.role]}`}>
              {roleLabels[user.role]}
            </Badge>

            {user.organizations && user.organizations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-muted/50 text-left space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Tổ chức trực thuộc
                </p>
                {user.organizations.map((org: any) => (
                  <div key={org.id} className="text-sm">
                    <p className="font-medium text-foreground">{org.organization_name}</p>
                    <p className="text-xs text-muted-foreground">{org.position}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Details Right */}
        <div className="md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="info" className="rounded-lg">Thông tin chi tiết</TabsTrigger>
              <TabsTrigger value="activities" disabled={!studentInfo} className="rounded-lg">Hoạt động ({myActivities.length})</TabsTrigger>
              <TabsTrigger value="password" className="rounded-lg">Đổi mật khẩu</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="font-display text-lg">Thông tin hồ sơ</CardTitle>
                    <CardDescription>Chi tiết thông tin đăng ký chính thức của tài khoản</CardDescription>
                  </div>
                  {!isEditingInfo ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingInfo(true)} className="gap-1.5 border-primary/20 hover:bg-primary/5 text-primary">
                      <Edit className="h-4 w-4" /> Chỉnh sửa
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setIsEditingInfo(false);
                        setEditFullName(user.fullName);
                        setEditEmail(user.email);
                        if (studentInfo) setEditPhone(studentInfo.phone || "");
                      }}>
                        Hủy
                      </Button>
                      <Button variant="default" size="sm" onClick={handleSaveInfo} disabled={updatingInfo} className="bg-gradient-primary gap-1.5">
                        <Save className="h-4 w-4" />
                        {updatingInfo ? "Đang lưu..." : "Lưu"}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingInfo ? (
                    <form onSubmit={handleSaveInfo} className="space-y-4 max-w-lg animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="edit-fullname">Họ và tên</Label>
                        <Input
                          id="edit-fullname"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-email">Địa chỉ Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          required
                        />
                      </div>
                      {studentInfo && (
                        <div className="space-y-2">
                          <Label htmlFor="edit-phone">Số điện thoại</Label>
                          <Input
                            id="edit-phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Địa chỉ Email</p>
                        <p className="text-sm font-medium">{user.email || "Chưa cập nhật"}</p>
                      </div>

                      <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Phân quyền hệ thống</p>
                        <p className="text-sm font-medium">{user.roles?.map(r => roleLabels[r] || r).join(", ") || roleLabels[user.role]}</p>
                      </div>

                      {studentInfo && (
                        <>
                          <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Lớp danh nghĩa</p>
                            <p className="text-sm font-medium">{studentInfo.class_name}</p>
                          </div>

                          <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Khoa đào tạo</p>
                            <p className="text-sm font-medium">{studentInfo.faculty}</p>
                          </div>

                          <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Khóa học (Cohort)</p>
                            <p className="text-sm font-medium">{studentInfo.cohort}</p>
                          </div>

                          <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Số điện thoại</p>
                            <p className="text-sm font-medium">{studentInfo.phone || "Chưa cập nhật"}</p>
                          </div>

                          <div className="space-y-1 p-3 rounded-lg bg-muted/20 border sm:col-span-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Chức vụ lớp học</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {studentInfo.positions && studentInfo.positions.length > 0 ? (
                                studentInfo.positions.map((pos, idx) => (
                                  <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 border-0">
                                    {pos.position_name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground font-normal">Thành viên lớp (Sinh viên thường)</span>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Hoạt động đã đăng ký</CardTitle>
                  <CardDescription>Danh sách các hoạt động ngoại khóa mà bạn đã tham gia</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {myActivities.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">Hoạt động</TableHead>
                          <TableHead>Ngày diễn ra</TableHead>
                          <TableHead>Điểm cộng</TableHead>
                          <TableHead className="pr-6">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myActivities.map(act => (
                          <TableRow key={act.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="font-medium pl-6">
                              <div>
                                <p className="line-clamp-1">{act.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{act.organizer}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{act.date}</TableCell>
                            <TableCell className="font-semibold text-primary">+{act.points}</TableCell>
                            <TableCell className="pr-6">{getStatusBadge(act.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm">Bạn chưa đăng ký hoạt động ngoại khóa nào trong hệ thống.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password" className="mt-4">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Đổi mật khẩu tài khoản</CardTitle>
                  <CardDescription>Thiết lập mật khẩu đăng nhập mới</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Mật khẩu mới</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto bg-gradient-primary gap-2">
                      <Key className="h-4 w-4" />
                      {passwordLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
