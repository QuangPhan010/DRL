import { useState, useEffect, useMemo } from "react";
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
  gpa: number | null;
  status: "synced" | "pending";
}

const getTokenHeaders = () => {
  const token = localStorage.getItem("drl_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const academicYearOptions = () => {
  const base = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => {
    const start = base - 1 + index;
    return `${start}-${start + 1}`;
  });
};

export default function DataSync() {
  const { user } = useAuth();
  const [semester, setSemester] = useState("HK1");
  const [year, setYear] = useState(academicYearOptions()[1] || "");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [classFilter, setClassFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch transcripts list
      const transRes = await fetch(`${API_URL}/transcripts/`, { headers: getTokenHeaders() });
      const transData = transRes.ok ? await transRes.json() : [];

      // 2. Filter matching imported transcripts
      const matchingTranscripts = (transData || []).filter(
        (t: any) =>
          t.school_year === year &&
          t.semester === semester &&
          (t.status === "IMPORTED" || t.status === "VALIDATED")
      );

      // 3. Fetch details for each to build GPA map
      const gpaMap: Record<string, number> = {};
      for (const t of matchingTranscripts) {
        try {
          const detailRes = await fetch(`${API_URL}/transcripts/${t.id}/`, { headers: getTokenHeaders() });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const items = detailData.items || detailData.students || [];
            items.forEach((item: any) => {
              if (item.student_code) {
                gpaMap[item.student_code] = Number(item.gpa || 0);
              }
            });
          }
        } catch (err) {
          console.error(`Failed to fetch details for transcript ${t.id}`, err);
        }
      }

      // 4. Fetch students list
      const studentsRes = await fetch(`${API_URL}/students/`, { headers: getTokenHeaders() });
      if (!studentsRes.ok) throw new Error("Không tải được danh sách sinh viên");
      const studentsData = await studentsRes.json();

      // 5. Map records using real GPA from transcripts if available
      const mapped = (studentsData || []).map((s: any) => {
        const studentCode = s.student_id;
        const gpa = gpaMap[studentCode] !== undefined ? gpaMap[studentCode] : null;
        return {
          studentId: studentCode,
          fullName: s.full_name,
          className: s.class_name || "",
          gpa: gpa,
          status: gpa !== null ? "synced" : "pending",
        };
      });

      setRecords(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu đồng bộ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [semester, year]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(records.map(r => r.className).filter(Boolean))).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => classFilter === "all" || r.className === classFilter)
      .sort((a, b) => a.className.localeCompare(b.className, "vi") || a.studentId.localeCompare(b.studentId, "vi"));
  }, [records, classFilter]);

  const pendingCount = filteredRecords.filter(r => r.status === "pending" && r.gpa !== null).length;

  const handleSyncAll = () => {
    setSyncing(true);
    setTimeout(() => {
      setRecords(records.map(r => {
        const isMatched = filteredRecords.some(fr => fr.studentId === r.studentId);
        return isMatched && r.gpa !== null ? { ...r, status: "synced" } : r;
      }));
      setSyncing(false);
      toast.success("Đồng bộ điểm học tập thành công cho các sinh viên được lọc!");
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
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HK1">Học kỳ 1</SelectItem>
                <SelectItem value="HK2">Học kỳ 2</SelectItem>
                <SelectItem value="HK3">Học kỳ 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <span className="text-xs font-semibold text-muted-foreground">Năm học</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {academicYearOptions().map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[180px]">
            <span className="text-xs font-semibold text-muted-foreground">Lớp học</span>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Tất cả các lớp" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả các lớp</SelectItem>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
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
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>GPA hệ 4</TableHead>
                <TableHead>Điểm quy đổi rèn luyện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2 text-primary" />
                    Đang tải dữ liệu thực tế...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Không có dữ liệu sinh viên khớp với bộ lọc.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map(r => {
                  const hasGpa = r.gpa !== null;
                  const mappedPoints = hasGpa ? Math.min(14, Math.round((r.gpa! / 4.0) * 14)) : 0;
                  return (
                    <TableRow key={r.studentId} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-medium">{r.studentId}</TableCell>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell><Badge variant="secondary">{r.className}</Badge></TableCell>
                      <TableCell className="font-bold">
                        {hasGpa ? r.gpa!.toFixed(2) : <span className="text-xs text-muted-foreground font-normal italic">Chưa nhập điểm</span>}
                      </TableCell>
                      <TableCell className="font-bold text-primary font-display">
                        {hasGpa ? `+${mappedPoints} / 14 điểm` : <span className="text-xs text-muted-foreground font-normal italic">Chưa quy đổi</span>}
                      </TableCell>
                      <TableCell>
                        {hasGpa ? (
                          r.status === "synced" ? (
                            <Badge variant="outline" className="bg-success/5 text-success border-success/20 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Đã đồng bộ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20 gap-1">
                              <AlertCircle className="h-3 w-3" /> Chưa đồng bộ
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1">
                            <AlertCircle className="h-3 w-3" /> Chưa có điểm
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasGpa && r.status === "pending" && (
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
