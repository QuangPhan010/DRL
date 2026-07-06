import { useState, useEffect } from "react";
import { 
  Users, 
  ClipboardCheck, 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Activity,
  FileText,
  Bookmark,
  MapPin,
  Flame,
  Star
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from "recharts";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Loading from "./Loading";
import ErrorPage from "./ErrorPage";

const COLORS = [
  "hsl(var(--primary))", 
  "hsl(var(--accent))", 
  "hsl(142 71% 45%)", 
  "hsl(38 92% 50%)", 
  "hsl(25 95% 53%)", 
  "hsl(0 84% 60%)"
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evals, setEvals] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (user?.role === "student") {
        // 1. Fetch student's own evaluations
        const evalRes = await fetch(`${API_URL}/evaluations/?studentId=${user.studentId}`, { headers });
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          const semesterOrder: Record<string, number> = { HK1: 1, HK2: 2, HK3: 3 };
          const sorted = (evalData || []).sort((a: any, b: any) => {
            const yearDifference = (a.year || "").localeCompare(b.year || "");
            if (yearDifference !== 0) return yearDifference;
            return (semesterOrder[a.semester] || 99) - (semesterOrder[b.semester] || 99);
          });
          setEvals(sorted);
        }

        // 2. Fetch criteria list
        const criteriaRes = await fetch(`${API_URL}/criteria/?all=true`, { headers });
        if (criteriaRes.ok) {
          const criteriaData = await criteriaRes.json();
          setCriteria(criteriaData);
        }

        // 3. Fetch activities
        const actRes = await fetch(`${API_URL}/activities/`, { headers });
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData);
        }
      } else {
        // Admin / Staff data
        const studentsRes = await fetch(`${API_URL}/students/`, { headers });
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudentsCount(studentsData.length);
        }

        const evalRes = await fetch(`${API_URL}/evaluations/`, { headers });
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          setEvals(evalData);
        }
      }
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
      toast.error("Lỗi khi tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <Loading message="Đang tải thông tin tổng quan..." />;
  }

  if (error) {
    return (
      <ErrorPage 
        code="500" 
        title="Lỗi tải trang tổng quan" 
        message="Hệ thống không thể kết nối tới máy chủ hoặc dữ liệu tải bị lỗi. Vui lòng nhấn nút tải lại để thử lại." 
        onRetry={fetchDashboardData} 
      />
    );
  }

  const statusBadge = (s: string) => {
    if (s === "approved") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Đã duyệt
        </Badge>
      );
    }
    if (["pending", "class_pending", "advisor_pending"].includes(s)) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <Clock className="h-3 w-3 text-amber-500" /> Chờ duyệt
        </Badge>
      );
    }
    if (s === "draft") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 text-[10px] font-semibold py-0.5">
          <Clock className="h-3 w-3 text-blue-500" /> Tự đánh giá
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1 text-[10px] font-semibold py-0.5">
        <XCircle className="h-3 w-3 text-rose-500" /> Từ chối
      </Badge>
    );
  };

  // ==========================================
  // STUDENT DASHBOARD RENDER
  // ==========================================
  if (user?.role === "student") {
    const latestEval = evals[evals.length - 1];
    const approvedEvals = evals.filter(e => e.status === "approved");
    const avgScore = approvedEvals.length > 0
      ? Math.round(approvedEvals.reduce((s, e) => s + e.total_score, 0) / approvedEvals.length)
      : 0;

    const registeredActCount = activities.filter(act => 
      act.participants?.some((p: any) => p.student_id === user.studentId || p.studentId === user.studentId)
    ).length;

    const studentStats = [
      { 
        label: "Điểm HK mới nhất", 
        value: latestEval ? `${latestEval.total_score}đ` : "0đ", 
        icon: Award, 
        trend: latestEval ? latestEval.semester : "Chưa có", 
        color: "bg-primary/10 text-primary border-primary/20",
        trendColor: "bg-primary/5 text-primary"
      },
      { 
        label: "Xếp loại rèn luyện", 
        value: latestEval?.classification || "Chưa xếp", 
        icon: Sparkles, 
        trend: "Kết quả", 
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        trendColor: "bg-emerald-500/5 text-emerald-600"
      },
      { 
        label: "Điểm học tập (GPA)", 
        value: latestEval?.academic_gpa ? Number(latestEval.academic_gpa).toFixed(2) : "0.00", 
        icon: Bookmark, 
        trend: latestEval?.academic_classification || "Chưa có", 
        color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        trendColor: "bg-cyan-500/5 text-cyan-600"
      },
      { 
        label: "Hoạt động đã tham gia", 
        value: registeredActCount, 
        icon: Flame, 
        trend: "Hoạt động", 
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        trendColor: "bg-amber-500/5 text-amber-600"
      },
    ];

    // Personal score history chart
    const personalChartData = evals.map(e => ({
      name: `${e.semester} ${e.year.substring(2, 4)}`,
      score: Number(e.total_score || 0),
    }));

    // Find criteria associated with current set
    const latestCriteria = latestEval 
      ? criteria.filter(c => c.criteria_set === latestEval.criteria_set)
      : [];

    const upcomingActivities = activities
      .filter(act => act.status === "upcoming")
      .slice(0, 3);

    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Welcome & General Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Xin chào, {user?.fullName ? user.fullName.split(" ").slice(-1)[0] : "Bạn"} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Chào mừng quay trở lại. Hãy theo dõi điểm số rèn luyện và tiến trình tiêu chí của bạn dưới đây.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-muted/40 border-border/50 text-xs font-semibold text-foreground/80 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Học kỳ hiện tại: HK1 2024-2025
          </Badge>
        </div>

        {/* Student Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {studentStats.map(s => (
            <Card key={s.label} className="border border-border/50 bg-card hover:bg-muted/5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl flex flex-col justify-between p-5 group">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge className={`border-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.trendColor}`}>
                  {s.trend}
                </Badge>
              </div>
              <div className="mt-5">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {s.value}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Student Dashboard Content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Progress & History chart */}
          <div className="lg:col-span-8 space-y-8">
            {/* Criteria Progress */}
            <Card className="border border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" /> Tiến độ tiêu chí học kỳ này ({latestEval?.semester || "N/A"})
                </CardTitle>
                <CardDescription>Tiến độ tích lũy điểm rèn luyện của bạn qua từng nhóm tiêu chí</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {latestEval && latestCriteria.length > 0 ? (
                  latestCriteria.map(c => {
                    const sc = latestEval.scores?.[c.id] || latestEval.scores?.[`c${c.id}`] || 0;
                    const percentage = Math.min(100, (sc / c.max_score) * 100);
                    
                    const getProgressColorClass = (score: number, max: number) => {
                      const ratio = score / max;
                      if (ratio >= 0.8) return "bg-emerald-500";
                      if (ratio >= 0.5) return "bg-amber-500";
                      return "bg-rose-500";
                    };

                    return (
                      <div key={c.id} className="space-y-1.5 group p-1">
                        <div className="flex justify-between text-xs sm:text-sm gap-2">
                          <span className="font-semibold text-foreground/80 line-clamp-1 group-hover:text-primary transition-colors">
                            {c.code}. {c.name}
                          </span>
                          <span className="font-bold shrink-0">{sc} / <span className="text-muted-foreground font-normal">{c.max_score}đ</span></span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColorClass(sc, c.max_score)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                    <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Chưa có phiếu đánh giá nào cho học kỳ hiện tại.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score History Line Chart */}
            <Card className="border border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Tiến trình rèn luyện qua các học kỳ
                </CardTitle>
                <CardDescription>Biểu đồ theo dõi xu hướng điểm số rèn luyện tích lũy của bạn</CardDescription>
              </CardHeader>
              <CardContent className="h-64 pb-6">
                {personalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={personalChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="studentScoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        domain={[0, 100]}
                        fontSize={11} 
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border) / 0.8)", 
                          borderRadius: 12,
                          boxShadow: "var(--shadow-sm)"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        name="Điểm rèn luyện"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#studentScoreGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border border-dashed rounded-xl bg-muted/20">
                    <p className="text-xs text-muted-foreground">Chưa có lịch sử điểm số rèn luyện.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Upcoming Activities & Evaluation summary */}
          <div className="lg:col-span-4 space-y-8">
            {/* Upcoming Activities list */}
            <Card className="border border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" /> Hoạt động sắp diễn ra
                </CardTitle>
                <CardDescription>Đăng ký tham gia để tích lũy thêm điểm rèn luyện</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingActivities.map(act => (
                  <div 
                    key={act.id} 
                    className="p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors flex flex-col justify-between gap-2.5 group cursor-pointer"
                    onClick={() => navigate(`/activities/${act.id}`)}
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {act.title}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t pt-2 border-border/40">
                      <span className="text-[10px] text-primary font-bold">+{act.score}đ rèn luyện</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2 hover:bg-primary/10 hover:text-primary gap-1">
                        Chi tiết <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingActivities.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Không có hoạt động sắp diễn ra nào mới.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Evaluations Summary */}
            <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" /> Phiếu đánh giá của tôi
                </CardTitle>
                <CardDescription>Trạng thái phiếu rèn luyện qua các học kỳ</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {evals.slice(-4).reverse().map(e => (
                    <div 
                      key={e.id} 
                      className="p-4 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => navigate("/my-scores")}
                    >
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {e.semester}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Niên khóa: {e.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-foreground">{e.total_score}đ</p>
                        <div className="mt-1 flex justify-end">
                          {statusBadge(e.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {evals.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Bạn chưa có phiếu rèn luyện nào được khởi tạo.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STAFF / ADMIN / MONITOR DASHBOARD RENDER
  // ==========================================
  const completed = evals.filter(e => e.status === "approved").length;
  const pending = evals.filter(e => e.status === "pending" || e.status === "class_pending" || e.status === "advisor_pending").length;
  const avgScore = completed > 0 
    ? Math.round(evals.filter(e => e.status === "approved").reduce((s, e) => s + e.total_score, 0) / completed) 
    : 0;

  const stats = [
    { 
      label: "Tổng số sinh viên", 
      value: studentsCount, 
      icon: Users, 
      trend: "Sinh viên", 
      color: "bg-primary/10 text-primary border-primary/20",
      trendColor: "bg-primary/5 text-primary"
    },
    { 
      label: "Phiếu đã duyệt", 
      value: completed, 
      icon: ClipboardCheck, 
      trend: "Hoàn tất", 
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      trendColor: "bg-emerald-500/5 text-emerald-600"
    },
    { 
      label: "Điểm trung bình", 
      value: avgScore, 
      icon: Award, 
      trend: "Toàn trường", 
      color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      trendColor: "bg-cyan-500/5 text-cyan-600"
    },
    { 
      label: "Đang chờ duyệt", 
      value: pending, 
      icon: Clock, 
      trend: "Yêu cầu mới", 
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      trendColor: "bg-amber-500/5 text-amber-600 animate-pulse"
    },
  ];

  // Process classification distributions
  const classifications = ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu", "Kém"];
  const distributionData = classifications.map(cls => {
    const val = evals.filter(e => e.classification === cls).length;
    return { name: cls, value: val };
  }).filter(item => item.value > 0);

  // Fallback if no classification data yet
  const displayDistribution = distributionData.length > 0 ? distributionData : [
    { name: "Khá", value: 1 },
    { name: "Giỏi", value: 2 }
  ];

  const recent = evals.slice(-5).reverse();

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Welcome & Time Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Xin chào, {user?.fullName ? user.fullName.split(" ").slice(-1)[0] : "Bạn"} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Chào mừng quay trở lại. Dưới đây là hoạt động tổng quát của hệ thống đánh giá điểm rèn luyện.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1.5 rounded-full flex items-center gap-1.5 bg-muted/40 border-border/50 text-xs font-semibold text-foreground/80 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          Học kỳ hiện tại: HK1 2024-2025
        </Badge>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map(s => (
          <Card key={s.label} className="border border-border/50 bg-card hover:bg-muted/5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl flex flex-col justify-between p-5 group">
            <div className="flex items-start justify-between">
              <div className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <Badge className={`border-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${s.trendColor}`}>
                {s.trend}
              </Badge>
            </div>
            <div className="mt-5">
              <h3 className="font-display text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                {s.value.toLocaleString()}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Bar Chart card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-8 flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Phân bố kết quả điểm rèn luyện
            </CardTitle>
            <CardDescription>Số lượng sinh viên tương ứng theo từng bậc xếp loại rèn luyện</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  fontSize={11} 
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }}
                  contentStyle={{ 
                    background: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border) / 0.8)", 
                    borderRadius: 12,
                    boxShadow: "var(--shadow-sm)"
                  }}
                />
                <Bar dataKey="value" name="Số lượng SV" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {displayDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart card */}
        <Card className="border border-border/50 shadow-sm rounded-2xl lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Tỷ lệ xếp loại (%)
            </CardTitle>
            <CardDescription>Phần trăm đóng góp các nhóm xếp loại rèn luyện</CardDescription>
          </CardHeader>
          <CardContent className="h-72 p-6 flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={displayDistribution} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={55} 
                  outerRadius={75} 
                  paddingAngle={3} 
                  dataKey="value"
                >
                  {displayDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border) / 0.8)", 
                    borderRadius: 12,
                    boxShadow: "var(--shadow-sm)"
                  }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend 
                  iconType="circle" 
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations Section */}
      <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Phiếu đánh giá mới gửi gần đây
          </CardTitle>
          <CardDescription>Các phiếu rèn luyện sinh viên vừa nộp yêu cầu duyệt hoặc xử lý</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-4">
          <div className="space-y-3 px-4 sm:px-0">
            {recent.map(e => (
              <div 
                key={e.id} 
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/10 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {e.student_name ? e.student_name.split(" ").slice(-1)[0][0] : "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                      {e.student_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MSSV: {e.student_id} · {e.semester} {e.year}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-display font-extrabold text-lg text-foreground tracking-tight">
                      {e.total_score}
                      <span className="text-xs text-muted-foreground font-normal ml-0.5">đ</span>
                    </p>
                    <div className="mt-1 flex justify-end">
                      {statusBadge(e.status)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-1 hidden sm:block" />
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
                <ClipboardCheck className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Chưa có phiếu đánh giá nào được gửi lên hệ thống.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
