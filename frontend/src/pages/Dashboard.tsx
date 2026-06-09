import { Users, ClipboardCheck, Award, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { mockStudents, mockEvaluations, distributionData, trendData, classificationColor } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["hsl(221 83% 53%)", "hsl(174 72% 45%)", "hsl(217 91% 65%)", "hsl(38 92% 50%)", "hsl(25 95% 53%)", "hsl(0 84% 60%)"];

export default function Dashboard() {
  const { user } = useAuth();
  const totalStudents = mockStudents.length;
  const completed = mockEvaluations.filter(e => e.status === "approved").length;
  const pending = mockEvaluations.filter(e => e.status === "pending").length;
  const avgScore = Math.round(mockEvaluations.filter(e => e.status === "approved").reduce((s, e) => s + e.totalScore, 0) / completed);

  const stats = [
    { label: "Tổng số sinh viên", value: totalStudents, icon: Users, trend: "+12%", color: "from-primary to-primary-glow" },
    { label: "Phiếu đã hoàn thành", value: completed, icon: ClipboardCheck, trend: "+8%", color: "from-accent to-cyan-400" },
    { label: "Điểm trung bình", value: avgScore, icon: Award, trend: "+3.2", color: "from-success to-emerald-400" },
    { label: "Chờ duyệt", value: pending, icon: Clock, trend: "Mới", color: "from-warning to-orange-400" },
  ];

  const recent = mockEvaluations.slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Xin chào, {user?.fullName.split(" ").slice(-1)[0]} 👋</h1>
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
                <Badge variant="secondary" className="text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />{s.trend}
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
            <CardTitle className="font-display">Xu hướng điểm trung bình</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="semester" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="Trung bình" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Phân bố xếp loại</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  {distributionData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Phân bố điểm rèn luyện</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {distributionData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display">Phiếu đánh giá gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map(e => {
              const student = mockStudents.find(s => s.studentId === e.studentId);
              return (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {student?.fullName.split(" ").slice(-1)[0][0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{student?.fullName}</p>
                      <p className="text-xs text-muted-foreground">{e.studentId} • {e.semester} {e.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-bold">{e.totalScore}</span>
                    {e.status === "approved" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {e.status === "pending" && <Clock className="h-4 w-4 text-warning" />}
                    {e.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
