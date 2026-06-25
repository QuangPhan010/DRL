import { useState, useEffect } from "react";
import { Users, ClipboardCheck, Award, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

const COLORS = ["hsl(221 83% 53%)", "hsl(174 72% 45%)", "hsl(217 91% 65%)", "hsl(38 92% 50%)", "hsl(25 95% 53%)", "hsl(0 84% 60%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const [evals, setEvals] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Fetch all students count
      const studentsRes = await fetch(`${API_URL}/students/`, { headers });
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudentsCount(studentsData.length);
      }

      // 2. Fetch all evaluations
      const evalRes = await fetch(`${API_URL}/evaluations/`, { headers });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvals(evalData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const completed = evals.filter(e => e.status === "approved").length;
  const pending = evals.filter(e => e.status === "pending" || e.status === "class_pending" || e.status === "advisor_pending").length;
  const avgScore = completed > 0 
    ? Math.round(evals.filter(e => e.status === "approved").reduce((s, e) => s + e.total_score, 0) / completed) 
    : 0;

  const stats = [
    { label: "Tổng số sinh viên", value: studentsCount, icon: Users, trend: "+100%", color: "from-primary to-primary-glow" },
    { label: "Phiếu đã hoàn thành", value: completed, icon: ClipboardCheck, trend: "Duyệt xong", color: "from-accent to-cyan-400" },
    { label: "Điểm trung bình", value: avgScore, icon: Award, trend: "Lớp", color: "from-success to-emerald-400" },
    { label: "Chờ duyệt", value: pending, icon: Clock, trend: "Mới", color: "from-warning to-orange-400" },
  ];

  // Process classification distributions
  const classifications = ["Xuất sắc", "Tốt", "Khá", "Trung bình", "Yếu", "Kém"];
  const distributionData = classifications.map(cls => {
    const val = evals.filter(e => e.classification === cls).length;
    return { name: cls, value: val };
  }).filter(item => item.value > 0);

  // Fallback if no classification data yet
  const displayDistribution = distributionData.length > 0 ? distributionData : [
    { name: "Khá", value: 1 },
    { name: "Tốt", value: 2 }
  ];

  const recent = evals.slice(-5).reverse();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Xin chào, {user?.fullName ? user.fullName.split(" ").slice(-1)[0] : "Bạn"} 👋</h1>
          <p className="text-muted-foreground mt-1">Đây là tổng quan hệ thống điểm rèn luyện học kỳ này.</p>
        </div>
        <Badge variant="outline" className="w-fit">Học kỳ hiện tại: HK1 2024-2025</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="relative overflow-hidden border-0 shadow-md bg-gradient-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {s.trend}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Phân bố điểm rèn luyện</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={displayDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {displayDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Phân bố xếp loại (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={displayDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {displayDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Phiếu đánh giá gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map(e => {
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {e.student_name ? e.student_name.split(" ").slice(-1)[0][0] : "S"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.student_name}</p>
                      <p className="text-xs text-muted-foreground">{e.student_id} • {e.semester} {e.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-bold">{e.total_score}</span>
                    {e.status === "approved" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {["pending", "class_pending", "advisor_pending"].includes(e.status) && <Clock className="h-4 w-4 text-warning" />}
                    {e.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
              );
            })}
            {recent.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Chưa có phiếu đánh giá nào được gửi.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
