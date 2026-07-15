import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { User } from "@/lib/mock-data";

export default function Login() {
  const { user, login, updateUserPassword } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Password reset dialog state for first time login
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showFirstLoginDialog, setShowFirstLoginDialog] = useState(false);
  const [firstLoginMssv, setFirstLoginMssv] = useState("");
  const [requestingPassword, setRequestingPassword] = useState(false);

  const handleRequestPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstLoginMssv) {
      toast.error("Vui lòng nhập MSSV.");
      return;
    }
    setRequestingPassword(true);
    try {
      const res = await fetch(`${API_URL}/request-first-login-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: firstLoginMssv })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Mật khẩu đã được cấp và gửi đến email.");
        if (data.plain_password) {
          toast.info(`[Demo] Mật khẩu cấp: ${data.plain_password}`, { duration: 10000 });
        }
        setShowFirstLoginDialog(false);
        setFirstLoginMssv("");
      } else {
        toast.error(data.error || "Gặp lỗi khi yêu cầu cấp mật khẩu.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ.");
    } finally {
      setRequestingPassword(false);
    }
  };

  if (user) return <Navigate to="/" replace />;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);

    if (res.isInactive) {
      toast.error("Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
      return;
    }

    if (res.isFirstLogin && res.user) {
      setTempUser(res.user);
      setShowResetDialog(true);
      toast.warning("Đây là lần đầu đăng nhập. Vui lòng đổi mật khẩu mới!");
      return;
    }

    if (res.user) {
      toast.success(`Chào mừng, ${res.user.fullName}`);
      navigate("/");
    } else {
      toast.error("Mã số đăng nhập hoặc mật khẩu không đúng");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự trở lên");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không trùng khớp");
      return;
    }
    if (tempUser) {
      await updateUserPassword(tempUser.username, newPassword);
      toast.success("Đổi mật khẩu thành công! Hệ thống đang tự động đăng nhập...");
      setShowResetDialog(false);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden p-12 flex-col justify-between text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white flex items-center justify-center border shadow-sm">
              <img src="/logo.jpg" alt="ITC Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">ITC Point</p>
              <p className="text-sm text-white/70">University Training Score System</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Quản lý điểm rèn luyện <br />
            <span className="text-white/80">thông minh & minh bạch</span>
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Hệ thống số hóa quy trình đánh giá điểm rèn luyện cho sinh viên, cố vấn và quản trị viên.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 max-w-md">
            {[{ n: "5,000+", l: "Sinh viên" }, { n: "120+", l: "Lớp học" }, { n: "98%", l: "Hài lòng" }].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="font-display font-bold text-2xl">{s.n}</p>
                <p className="text-xs text-white/70 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">© 2026 ITC Point. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="h-11 w-11 rounded-xl overflow-hidden bg-white flex items-center justify-center border shadow-sm">
              <img src="/logo.jpg" alt="ITC Logo" className="h-full w-full object-contain" />
            </div>
            <p className="font-display text-2xl font-bold">ITC Point</p>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold">Đăng nhập</h2>
            <p className="text-muted-foreground mt-2">Chào mừng trở lại! Đăng nhập bằng mã số của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Mã số đăng nhập / Tên đăng nhập</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ví dụ: SV001, advisor, admin..." required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary hover:opacity-90 shadow-elegant font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đăng nhập"}
            </Button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowFirstLoginDialog(true)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Đăng nhập lần đầu? Nhận mật khẩu qua Email
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dialog: Force Reset Password on First Login */}
      <Dialog open={showResetDialog} onOpenChange={(o) => { if (!o) setShowResetDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-warning" /> Thay đổi mật khẩu lần đầu
            </DialogTitle>
            <DialogDescription>
              Đây là lần đầu bạn đăng nhập hệ thống. Để bảo mật thông tin, bạn vui lòng thay đổi mật khẩu của mình trước khi tiếp tục.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Mật khẩu mới *</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Nhập mật khẩu mới..." />
            </div>
            <div className="space-y-2">
              <Label>Xác nhận mật khẩu mới *</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Xác nhận lại mật khẩu..." />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="bg-gradient-primary w-full">Cập nhật mật khẩu mới</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Request Password for First Login */}
      <Dialog open={showFirstLoginDialog} onOpenChange={setShowFirstLoginDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Cấp mật khẩu lần đầu</DialogTitle>
            <DialogDescription>
              Nhập mã sinh viên (MSSV) của bạn. Hệ thống sẽ sinh mật khẩu ngẫu nhiên và gửi tới địa chỉ email sinh viên của bạn đã đăng ký trên hệ thống.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="first-login-mssv">Mã số sinh viên (MSSV) *</Label>
              <Input
                id="first-login-mssv"
                value={firstLoginMssv}
                onChange={e => setFirstLoginMssv(e.target.value)}
                required
                placeholder="Nhập MSSV của bạn"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={requestingPassword} className="bg-gradient-primary w-full">
                {requestingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Nhận mật khẩu qua Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
