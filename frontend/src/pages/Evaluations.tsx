import { useState, useMemo } from "react";
import { ClipboardList, Save, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockStudents, mockCriteria, classify, classificationColor } from "@/lib/mock-data";
import { toast } from "sonner";

export default function Evaluations() {
  const [studentId, setStudentId] = useState(mockStudents[0].studentId);
  const [search, setSearch] = useState("");
  const [semester, setSemester] = useState("HK1");
  const [year, setYear] = useState("2024-2025");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(mockCriteria.map(c => [c.id, 0]))
  );
  const [note, setNote] = useState("");

  const filteredStudents = useMemo(
    () => mockStudents.filter(s => !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search)).slice(0, 8),
    [search]
  );

  const student = mockStudents.find(s => s.studentId === studentId);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const classification = classify(total);

  const updateScore = (id: string, val: number, max: number) => {
    const v = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
    setScores({ ...scores, [id]: v });
  };

  const handleSubmit = (status: "draft" | "pending") => {
    toast.success(status === "draft" ? "Đã lưu nháp" : "Đã gửi phiếu đánh giá để xét duyệt");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />Đánh giá điểm rèn luyện
        </h1>
        <p className="text-muted-foreground mt-1">Chấm điểm rèn luyện theo từng tiêu chí và học kỳ.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: student & info */}
        <Card className="border-0 shadow-md lg:sticky lg:top-20 h-fit">
          <CardHeader>
            <CardTitle className="font-display text-lg">Thông tin phiếu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tìm sinh viên</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tên hoặc mã SV..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {filteredStudents.map(s => (
                <button key={s.id} onClick={() => setStudentId(s.studentId)}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${studentId === s.studentId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${studentId === s.studentId ? "bg-white/20" : "bg-gradient-primary text-white"}`}>
                    {s.fullName.split(" ").slice(-1)[0][0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.fullName}</p>
                    <p className={`text-xs truncate ${studentId === s.studentId ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{s.studentId} • {s.className}</p>
                  </div>
                </button>
              ))}
            </div>
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
              <p className="text-sm opacity-80">Tổng điểm</p>
              <p className="font-display text-5xl font-bold mt-1">{total}<span className="text-lg opacity-70">/100</span></p>
              <Badge className="mt-3 bg-white/20 text-white border-0 hover:bg-white/25">{classification}</Badge>
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
                  {student.fullName.split(" ").slice(-1)[0][0]}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{student.fullName}</p>
                  <p className="text-sm text-muted-foreground">{student.studentId} • {student.className} • {student.faculty}</p>
                </div>
                <Badge variant="outline">{semester} {year}</Badge>
              </CardContent>
            </Card>
          )}

          {mockCriteria.map(c => (
            <Card key={c.id} className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <span className="text-primary font-bold">{c.code}.</span> {c.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{c.description}</CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <Input type="number" min={0} max={c.maxScore} value={scores[c.id]}
                      onChange={e => updateScore(c.id, parseInt(e.target.value), c.maxScore)}
                      className="w-20 text-center font-bold text-lg" />
                    <p className="text-xs text-muted-foreground mt-1">/ {c.maxScore} điểm</p>
                  </div>
                </div>
              </CardHeader>
              {c.subCriteria && (
                <CardContent className="pt-0 space-y-2">
                  {c.subCriteria.map(sc => (
                    <div key={sc.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <span>{sc.name}</span>
                      <Badge variant="secondary">Tối đa {sc.maxScore}đ</Badge>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}

          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="font-display text-base">Ghi chú</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Nhập ghi chú, nhận xét về sinh viên..." value={note} onChange={e => setNote(e.target.value)} rows={4} />
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end sticky bottom-4 bg-card/80 backdrop-blur p-3 rounded-xl border shadow-elegant">
            <Button variant="outline" onClick={() => handleSubmit("draft")} className="gap-2"><Save className="h-4 w-4" />Lưu nháp</Button>
            <Button onClick={() => handleSubmit("pending")} className="gap-2 bg-gradient-primary shadow-md"><Send className="h-4 w-4" />Gửi xét duyệt</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
