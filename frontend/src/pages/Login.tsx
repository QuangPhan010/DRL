import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, Users, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const roleCards = [
  { role: "admin", label: "Quản trị viên", user: "admin", pass: "admin123", icon: ShieldCheck, color: "from-primary to-primary-glow" },
  { role: "advisor", label: "Cố vấn học tập", user: "advisor", pass: "advisor123", icon: BookOpen, color: "from-accent to-cyan-400" },
  { role: "student", label: "Sinh viên", user: "student", pass: "student123", icon: Users, color: "from-violet-500 to-fuchsia-500" },
];

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const u = login(username, password);
      setLoading(false);
      if (u) {
        toast.success(`Chào mừng, ${u.fullName}`);
        navigate("/");
      } else {
        toast.error("Tên đăng nhập hoặc mật khẩu không đúng");
      }
    }, 500);
  };

  const quickFill = (u: string, p: string) => { setUsername(u); setPassword(p); };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden p-12 flex-col justify-between text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">EduPoint</p>
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

        <p className="relative text-xs text-white/50">© 2026 EduPoint. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="h-11 w-11 rounded-xl bg-gradient-hero flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <p className="font-display text-2xl font-bold">EduPoint</p>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold">Đăng nhập</h2>
            <p className="text-muted-foreground mt-2">Chào mừng trở lại! Vui lòng đăng nhập tài khoản của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin / advisor / student" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary hover:opacity-90 shadow-elegant font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đăng nhập"}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">Đăng nhập nhanh (demo)</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {roleCards.map(r => (
                <Card key={r.role} onClick={() => quickFill(r.user, r.pass)} className="p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-2 hover:border-primary/30">
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center mb-2`}>
                    <r.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-semibold">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.user}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
