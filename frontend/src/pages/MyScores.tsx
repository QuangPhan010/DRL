import { Award, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from "recharts";
import { mockEvaluations, mockCriteria, classificationColor } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";

export default function MyScores() {
  const { user } = useAuth();
  const myEvals = mockEvaluations.filter(e => e.studentId === (user?.studentId ?? "SV001")).sort((a, b) => a.year.localeCompare(b.year));
  const latest = myEvals[myEvals.length - 1];
  const avg = Math.round(myEvals.filter(e => e.status === "approved").reduce((s, e) => s + e.totalScore, 0) / Math.max(1, myEvals.filter(e => e.status === "approved").length));

  const chartData = myEvals.map(e => ({ name: `${e.semester} ${e.year.slice(2)}`, score: e.totalScore }));

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle2 className="h-3 w-3" />Đã duyệt</Badge>;
    if (s === "pending") return <Badge className="bg-warning/15 text-warning border-warning/30 gap-1"><Clock className="h-3 w-3" />Chờ duyệt</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><XCircle className="h-3 w-3" />Từ chối</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Award className="h-7 w-7 text-primary" />Điểm rèn luyện của tôi
        </h1>
        <p className="text-muted-foreground mt-1">Xem chi tiết điểm rèn luyện qua các học kỳ.</p>
      </div>

      {/* Hero card */}
      {latest && (
        <Card className="border-0 shadow-elegant bg-gradient-hero text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <CardContent className="p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-white/80 text-sm">Học kỳ hiện tại • {latest.semester} {latest.year}</p>
                <p className="font-display text-7xl font-bold mt-2">{latest.totalScore}<span className="text-2xl text-white/70">/100</span></p>
                <Badge className="mt-3 bg-white/20 text-white border-0 hover:bg-white/25 text-sm">{latest.classification}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Điểm TB</p>
                  <p className="font-display text-3xl font-bold mt-1">{avg}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <p className="text-white/70 text-xs">Số học kỳ</p>
                  <p className="font-display text-3xl font-bold mt-1">{myEvals.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Lịch sử điểm</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 6, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {latest && (
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display">Chi tiết tiêu chí HK gần nhất</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {mockCriteria.map(c => {
                const sc = latest.scores[c.id] || 0;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium"><span className="text-primary">{c.code}.</span> {c.name}</span>
                      <span className="font-bold">{sc}/{c.maxScore}</span>
                    </div>
                    <Progress value={(sc / c.maxScore) * 100} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="font-display">Lịch sử các học kỳ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {myEvals.slice().reverse().map(e => (
            <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-gradient-card hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-semibold">{e.semester} năm {e.year}</p>
                  {statusBadge(e.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Nộp ngày {e.submittedAt}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-display text-2xl font-bold">{e.totalScore}<span className="text-sm text-muted-foreground">/100</span></p>
                  <Badge variant="outline" className={classificationColor(e.classification)}>{e.classification}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
