import { useState, useMemo, useEffect } from "react";
import { ClipboardList, Save, Send, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { classify, classificationColor } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Criterion {
  id: number;
  code: string;
  name: string;
  max_score: number;
  description: string;
  groups?: Array<{
    id: number;
    name: string;
    subItems: Array<{
      id: number;
      name: string;
      max_score: number;
    }>;
  }>;
}

export default function Evaluations() {
  const { user } = useAuth();
  const isStudent = user?.role === "student" || user?.role === "class_monitor";

  const [students, setStudents] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("HK1");
  const [year, setYear] = useState("2024-2025");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState("draft");

  // Manage scores at sub-item level (Cấp 3)
  const [subScores, setSubScores] = useState<Record<string, number>>({});

  const fetchCriteria = async () => {
    try {
      const res = await fetch(`${API_URL}/criteria/`);
      if (res.ok) {
        const data = await res.json();
        setCriteria(data);
        
        // Initialize scores to 0
        const initial: Record<string, number> = {};
        data.forEach((c: any) => {
          c.groups?.forEach((g: any) => {
            g.subItems?.forEach((s: any) => {
              initial[s.id.toString()] = 0;
            });
          });
        });
        setSubScores(initial);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students/`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
        if (!user?.studentId && data.length > 0) {
          setStudentId(data[0].student_id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvaluation = async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`${API_URL}/evaluations/?student_id=${studentId}&semester=${semester}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const evalObj = data[0];
          setEvaluationId(evalObj.id);
          setEvaluationStatus(evalObj.status);
          setNote(evalObj.note || "");
          
          const scores: Record<string, number> = {};
          criteria.forEach((c: any) => {
            c.groups?.forEach((g: any) => {
              g.subItems?.forEach((s: any) => {
                scores[s.id.toString()] = 0;
              });
            });
          });

          evalObj.details?.forEach((d: any) => {
            scores[d.sub_item_id.toString()] = d.score;
          });
          setSubScores(scores);
        } else {
          setEvaluationId(null);
          setEvaluationStatus("draft");
          setNote("");
          
          const initial: Record<string, number> = {};
          criteria.forEach((c: any) => {
            c.groups?.forEach((g: any) => {
              g.subItems?.forEach((s: any) => {
                initial[s.id.toString()] = 0;
              });
            });
          });
          setSubScores(initial);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCriteria(), fetchStudents()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (criteria.length > 0) {
      fetchEvaluation();
    }
  }, [studentId, semester, year, criteria.length]);

  const filteredStudents = useMemo(
    () => students.filter(s => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search)).slice(0, 8),
    [students, search]
  );

  const student = useMemo(() => {
    return students.find(s => s.student_id === studentId);
  }, [students, studentId]);

  // Dynamic calculations
  const getParentScore = (c: Criterion) => {
    let sum = 0;
    c.groups?.forEach(g => {
      g.subItems.forEach(s => {
        sum += subScores[s.id.toString()] || 0;
      });
    });
    return Math.max(0, Math.min(c.max_score, sum));
  };

  const parentScores = useMemo(() => {
    return Object.fromEntries(criteria.map(c => [c.id, getParentScore(c)]));
  }, [subScores, criteria]);

  const total = useMemo(() => {
    return Object.values(parentScores).reduce((a, b) => a + b, 0);
  }, [parentScores]);

  const classification = classify(total);

  const updateSubScore = (id: string, val: number, max: number) => {
    const v = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
    setSubScores(prev => ({ ...prev, [id]: v }));
  };

  const togglePenalty = (id: string, penalty: number, active: boolean) => {
    setSubScores(prev => ({ ...prev, [id]: active ? penalty : 0 }));
  };

  const handleSubmit = async (statusVal: "draft" | "pending") => {
    if (!studentId) return;
    try {
      const res = await fetch(`${API_URL}/evaluations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId,
          semester: semester,
          year: year,
          note: note,
          status: statusVal,
          scores: subScores
        })
      });

      if (res.ok) {
        toast.success(statusVal === "draft" ? "Đã lưu nháp kết quả tự đánh giá" : "Đã gửi phiếu tự đánh giá lên Ban cán sự lớp");
        fetchEvaluation();
      } else {
        toast.error("Không thể lưu kết quả đánh giá");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
        Đang tải phiếu tự đánh giá...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />Tự đánh giá điểm rèn luyện
        </h1>
        <p className="text-muted-foreground mt-1">Đánh giá chi tiết từng tiêu chí con để hệ thống tự động cộng dồn điểm tổng học kỳ.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: student & info */}
        <Card className="border-0 shadow-md lg:sticky lg:top-20 h-fit">
          <CardHeader>
            <CardTitle className="font-display text-lg">Thông tin phiếu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isStudent && (
              <>
                <div className="space-y-2">
                  <Label>Tìm sinh viên</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tên hoặc mã SV..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {filteredStudents.map(s => (
                    <button key={s.id} onClick={() => setStudentId(s.student_id)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${studentId === s.student_id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${studentId === s.student_id ? "bg-white/20" : "bg-gradient-primary text-white"}`}>
                        {s.full_name.split(" ").slice(-1)[0][0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.full_name}</p>
                        <p className={`text-xs truncate ${studentId === s.student_id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{s.student_id} • {s.class_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Học kỳ</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="HK1">Học kỳ 1</SelectItem><SelectItem value="HK2">Học kỳ 2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Năm học</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="2023-2024">2023-2024</SelectItem><SelectItem value="2024-2025">2024-2025</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-gradient-hero text-white">
              <p className="text-sm opacity-80">Tổng điểm tích lũy</p>
              <p className="font-display text-5xl font-bold mt-1">{total}<span className="text-lg opacity-70">/100</span></p>
              <div className="flex gap-2 items-center mt-2">
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/25">{classification}</Badge>
                {evaluationStatus === "pending" && (
                  <Badge variant="outline" className="border-white/40 text-white bg-warning/20">Đã gửi duyệt</Badge>
                )}
                {evaluationStatus === "approved" && (
                  <Badge variant="outline" className="border-white/40 text-white bg-success/20">Đã duyệt</Badge>
                )}
              </div>
              <Progress value={total} className="mt-3 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        {/* Right: criteria scoring */}
        <div className="lg:col-span-2 space-y-4">
          {student && (
            <Card className="border-0 shadow-md bg-gradient-card">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-display text-xl font-bold">
                  {student.full_name.split(" ").slice(-1)[0][0]}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{student.student_id} • {student.class_name} • {student.faculty}</p>
                </div>
                <Badge variant="outline">{semester} {year}</Badge>
              </CardContent>
            </Card>
          )}

          {criteria.map(c => (
            <Card key={c.id} className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <span className="text-primary font-bold">{c.code}.</span> {c.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{c.description}</CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-2xl text-primary">{parentScores[c.id]}</span>
                    <span className="text-xs text-muted-foreground"> / {c.max_score}đ</span>
                  </div>
                </div>
              </CardHeader>
              {c.groups && (
                <CardContent className="pt-0 space-y-4">
                  {c.groups.map(g => (
                    <div key={g.id} className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{g.name}</p>
                      <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                        {g.subItems.map(sc => {
                          const isPenalty = sc.max_score < 0;
                          return (
                            <div key={sc.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/65 transition-colors gap-4">
                              <span className="leading-snug">{sc.name}</span>
                              <div className="shrink-0 flex items-center gap-3">
                                {isPenalty ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-destructive font-semibold">Vi phạm ({sc.max_score}đ)</span>
                                    <input
                                      type="checkbox"
                                      checked={subScores[sc.id.toString()] < 0}
                                      onChange={e => togglePenalty(sc.id.toString(), sc.max_score, e.target.checked)}
                                      className="h-4.5 w-4.5 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={sc.max_score}
                                      value={subScores[sc.id.toString()]}
                                      onChange={e => updateSubScore(sc.id.toString(), parseInt(e.target.value), sc.max_score)}
                                      className="w-16 h-8 text-center text-xs font-bold"
                                    />
                                    <span className="text-xs text-muted-foreground">/ {sc.max_score}đ</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}

          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display text-base">Ghi chú</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Nhập ghi chú, nhận xét về quá trình rèn luyện..." value={note} onChange={e => setNote(e.target.value)} rows={4} />
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end sticky bottom-4 bg-card/80 backdrop-blur p-3 rounded-xl border shadow-elegant">
            <Button variant="outline" onClick={() => handleSubmit("draft")} className="gap-2"><Save className="h-4 w-4" />Lưu nháp</Button>
            <Button onClick={() => handleSubmit("pending")} className="gap-2 bg-gradient-primary shadow-md"><Send className="h-4 w-4" />Gửi tự đánh giá</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
