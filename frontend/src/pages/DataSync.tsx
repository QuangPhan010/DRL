import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Database, FileSpreadsheet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AcademicRecord {
  studentId: string;
  fullName: string;
  className: string;
  gpa: number;
  credits: number;
  status: "synced" | "pending";
}

export default function DataSync() {
  const { user } = useAuth();
  const [semester, setSemester] = useState("HK1");
  const [year, setYear] = useState("2024-2025");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AcademicRecord[]>([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/students/`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((s: any, idx: number) => {
          // Seed GPA grades
          const seed = idx * 7.5;
          const gpa = Number((2.0 + (Math.sin(seed) + 1) * 1.0).toFixed(2)); // GPA between 2.0 and 4.0
          return {
            studentId: s.student_id,
            fullName: s.full_name,
            className: s.class_name || "",
            gpa,
            credits: 15 + (idx % 5) * 2,
            status: idx % 3 === 0 ? "synced" : "pending"
          };
        });
        setRecords(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách sinh viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const pendingCount = records.filter(r => r.status === "pending").length;

  const handleSyncAll = () => {
    setSyncing(true);
    setTimeout(() => {
      setRecords(records.map(r => ({ ...r, status: "synced" })));
      setSyncing(false);
      toast.success("Đồng bộ điểm học tập thành công sang hệ thống điểm rèn luyện!");
    }, 1500);
  };

  const handleSyncSingle = (id: string) => {
    setRecords(records.map(r => r.studentId === id ? { ...r, status: "synced" } : r));
    toast.success(`Đã đồng bộ điểm học tập cho sinh viên ${id}!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <RefreshCw className={`h-7 w-7 text-primary ${syncing ? "animate-spin" : ""}`} />Đồng bộ điểm học tập
          </h1>
          <p className="text-muted-foreground mt-1">Dành cho Phòng Đào tạo: Cung cấp điểm học tập và GPA cho hệ thống tính điểm rèn luyện.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-primary/20">
            <FileSpreadsheet className="h-4 w-4" />Nhập Excel
          </Button>
          <Button onClick={handleSyncAll} disabled={syncing || pendingCount === 0} className="bg-gradient-primary gap-2">
            <Database className="h-4 w-4" />Đồng bộ toàn bộ ({pendingCount})
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-gradient-card">
        <CardHeader>
          <CardTitle className="font-display text-base">Bộ lọc dữ liệu học kỳ</CardTitle>
          <CardDescription>Chọn học kỳ để rà soát điểm học tập từ cơ sở dữ liệu đào tạo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[150px]">
            <span className="text-xs font-semibold text-muted-foreground">Học kỳ</span>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HK1">Học kỳ 1</SelectItem>
                <SelectItem value="HK2">Học kỳ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <span className="text-xs font-semibold text-muted-foreground">Năm học</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
                <SelectItem value="2023-2024">2023-2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Badge variant="outline" className="h-10 px-4 bg-primary/5 text-primary border-primary/10">
            <Sparkles className="h-4 w-4 mr-2" /> Tiêu chí tự động hóa: GPA quy đổi thành điểm tối đa 14 (Rubric I.1)
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-lg">Danh sách điểm học kỳ đào tạo</CardTitle>
          <CardDescription>GPA quy đổi từ hệ điểm 4 sang điểm rèn luyện tương ứng</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Số tín chỉ</TableHead>
                <TableHead>GPA hệ 4</TableHead>
                <TableHead>Điểm quy đổi rèn luyện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Không có dữ liệu sinh viên.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(r => {
                  // Formula to map GPA (0 to 4.0) to Rubric points (max 14)
                  const mappedPoints = Math.min(14, Math.round((r.gpa / 4.0) * 14));
                  return (
                    <TableRow key={r.studentId} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium">{r.studentId}</TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell><Badge variant="secondary">{r.className}</Badge></TableCell>
                      <TableCell>{r.credits}</TableCell>
                      <TableCell className="font-bold">{r.gpa}</TableCell>
                      <TableCell className="font-bold text-primary font-display">+{mappedPoints} / 14 điểm</TableCell>
                      <TableCell>
                        {r.status === "synced" ? (
                          <Badge variant="outline" className="bg-success/5 text-success border-success/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Đã đồng bộ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20 gap-1">
                            <AlertCircle className="h-3 w-3" /> Chưa đồng bộ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => handleSyncSingle(r.studentId)} className="bg-primary/95 text-white hover:bg-primary h-8 px-3">
                            Đồng bộ
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
