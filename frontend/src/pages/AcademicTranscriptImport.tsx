import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type MatchStatus = "MATCHED" | "NOT_FOUND" | "CLASS_MISMATCH" | "DUPLICATE" | string;
type SchoolClass = { id: number; name: string; faculty?: string; cohort?: string };
type Item = {
  id?: number;
  student_db_id?: number | null;
  student_id?: string;
  student_code: string;
  full_name: string;
  gpa: number;
  classification: string;
  match_status: MatchStatus;
  remark: string;
};
type TranscriptRecord = {
  id: number;
  class_name: string;
  selected_class?: string;
  semester: string | null;
  school_year: string;
  source_file_name: string;
  pdf_class_name: string;
  pdf_class?: string;
  item_count: number;
  uploaded_by_name?: string;
  uploaded_at?: string;
  status: string;
  valid?: boolean;
  class_match?: boolean;
  summary: Record<string, number>;
  summary_percent: Record<string, number>;
  items: Item[];
};

const SUMMARY_LABELS = ["Xuất sắc", "Giỏi", "Khá", "TB Khá", "TB", "Yếu"];
const MATCH_STATUS_ORDER: Record<string, number> = { MATCHED: 0, NOT_FOUND: 1, DUPLICATE: 2, CLASS_MISMATCH: 3 };
const SEMESTERS = [
  { value: "HK1", label: "Học kỳ 1" },
  { value: "HK2", label: "Học kỳ 2" },
  { value: "HK3", label: "Học kỳ 3" },
];

const emptySummary = () => SUMMARY_LABELS.reduce<Record<string, number>>((acc, label) => ((acc[label] = 0), acc), {});

const getTokenHeaders = (multipart = false) => {
  const token = localStorage.getItem("drl_token");
  const headers: Record<string, string> = {};
  if (!multipart) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

const normalizeDisplayName = (value?: string) => {
  if (!value) return "-";
  const tokens = value.trim().split(/\s+/);
  const keep: string[] = [];
  for (const token of tokens) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(token) || /^\d+(?:[.,]\d+)?$/.test(token)) break;
    keep.push(token);
  }
  return keep.length ? keep.join(" ") : value.trim();
};

const academicYearOptions = () => {
  const base = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return Array.from({ length: 4 }, (_, index) => {
    const start = base - 1 + index;
    return `${start}-${start + 1}`;
  });
};

const matchStatusClass = (status: MatchStatus) => {
  switch (status) {
    case "MATCHED": return "bg-success/15 text-success border-success/20";
    case "NOT_FOUND": return "bg-amber-500/15 text-amber-700 border-amber-500/20";
    case "DUPLICATE": return "bg-orange-500/15 text-orange-700 border-orange-500/20";
    case "CLASS_MISMATCH": return "bg-destructive/15 text-destructive border-destructive/20";
    default: return "bg-muted/40 text-foreground border-border";
  }
};

const statusClass = (status: string) => {
  switch (status) {
    case "IMPORTED": return "bg-success/15 text-success border-success/20";
    case "VALIDATED": return "bg-blue-500/15 text-blue-700 border-blue-500/20";
    case "FAILED": return "bg-destructive/15 text-destructive border-destructive/20";
    default: return "bg-muted/40 text-foreground border-border";
  }
};

const toNum = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const mapItem = (item: any): Item => ({
  id: item.id,
  student_db_id: item.student_db_id ?? item.student ?? null,
  student_id: item.student_id ?? "",
  student_code: item.student_code ?? "",
  full_name: item.full_name ?? "",
  gpa: toNum(item.gpa),
  classification: item.classification ?? "",
  match_status: item.match_status ?? item.status ?? "NOT_FOUND",
  remark: item.remark ?? "",
});

const mapRecord = (data: any, fallbackFileName = ""): TranscriptRecord => {
  const items = (data.items || data.students || []).map(mapItem);
  const source = data.source_file_name || data.original_filename || fallbackFileName || "";
  return {
    id: data.validation_session ?? data.import_id ?? data.id,
    class_name: data.class_name || data.selected_class || "",
    selected_class: data.selected_class || data.class_name || "",
    semester: data.semester ?? null,
    school_year: data.school_year || "",
    source_file_name: source,
    pdf_class_name: data.pdf_class_name || data.pdf_class || "",
    pdf_class: data.pdf_class || data.pdf_class_name || "",
    item_count: data.item_count ?? data.total_students ?? items.length,
    uploaded_by_name: data.uploaded_by_name || "",
    uploaded_at: data.uploaded_at || new Date().toISOString(),
    status: data.status || (data.valid === false ? "FAILED" : "VALIDATED"),
    valid: data.valid,
    class_match: data.class_match,
    summary: data.summary || {},
    summary_percent: data.summary_percent || {},
    items,
  };
};

export default function AcademicTranscriptImport() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [history, setHistory] = useState<TranscriptRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeRecord, setActiveRecord] = useState<TranscriptRecord | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [schoolYear, setSchoolYear] = useState(academicYearOptions()[1] || "");
  const [semester, setSemester] = useState("HK1");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"student_code" | "full_name" | "gpa" | "classification" | "match_status">("student_code");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await fetch(`${API_URL}/classes/`, { headers: getTokenHeaders() });
      if (!res.ok) throw new Error("Không tải được danh sách lớp");
      const data = await res.json();
      setClasses((data || []).map((item: any) => ({ id: item.id, name: item.name, faculty: item.faculty, cohort: item.cohort })));
    } catch (e) {
      console.error(e);
      toast.error("Không tải được danh sách lớp");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_URL}/transcripts/`, { headers: getTokenHeaders() });
      if (!res.ok) throw new Error("Không tải được lịch sử import");
      const data = await res.json();
      setHistory((data || []).map((item: any) => mapRecord(item)));
    } catch (e) {
      console.error(e);
      toast.error("Không tải được lịch sử import");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { fetchClasses(); fetchHistory(); }, []);

  const loadRecordDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/transcripts/${id}/`, { headers: getTokenHeaders() });
      if (!res.ok) throw new Error("Không tải được chi tiết import");
      const data = await res.json();
      setActiveRecord(mapRecord(data));
      setSearch("");
      setPage(1);
    } catch (e) {
      console.error(e);
      toast.error("Không tải được chi tiết import");
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return toast.error("Hãy chọn file PDF trước");
    if (!selectedClassId) return toast.error("Hãy chọn lớp học");
    if (!schoolYear) return toast.error("Hãy chọn năm học");
    if (!semester) return toast.error("Hãy chọn học kỳ");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("class_id", selectedClassId);
    formData.append("school_year", schoolYear);
    formData.append("semester", semester);

    try {
      setValidating(true);
      const res = await fetch(`${API_URL}/transcripts/validate/`, {
        method: "POST",
        headers: getTokenHeaders(true),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validate thất bại");
      setActiveRecord(mapRecord({ ...data, validation_session: data.validation_session, selected_class: data.selected_class, class_name: data.selected_class, pdf_class: data.pdf_class, students: data.students, valid: data.valid, class_match: data.class_match }, selectedFile.name));
      setSearch("");
      setPage(1);
      await fetchHistory();
      if (data.class_match) {
        toast.success("Đã validate PDF thành công");
      } else {
        toast.warning("PDF parse được nhưng không khớp lớp đang chọn");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Validate thất bại");
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!activeRecord) return toast.error("Hãy validate file trước");
    if (!activeRecord.valid || activeRecord.class_match === false) return toast.error("Validation chưa đạt điều kiện import");

    try {
      setImporting(true);
      const res = await fetch(`${API_URL}/transcripts/import/`, {
        method: "POST",
        headers: getTokenHeaders(),
        body: JSON.stringify({ validation_session: activeRecord.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import thất bại");
      setActiveRecord(mapRecord({ ...data, import_id: data.import_id, class_name: data.class_name, selected_class: data.class_name, students: data.students, status: data.status }, data.source_file_name || activeRecord.source_file_name));
      await fetchHistory();
      toast.success("Import thành công");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Import thất bại");
    } finally {
      setImporting(false);
    }
  };
  const activeItems = activeRecord?.items || [];
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...activeItems].filter((item) => {
      if (!q) return true;
      return (
        item.student_code.toLowerCase().includes(q) ||
        item.full_name.toLowerCase().includes(q) ||
        normalizeDisplayName(item.full_name).toLowerCase().includes(q) ||
        item.student_id?.toLowerCase().includes(q) ||
        item.classification.toLowerCase().includes(q) ||
        item.match_status.toLowerCase().includes(q) ||
        item.remark.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "gpa": return Number(b.gpa) - Number(a.gpa);
        case "full_name": return normalizeDisplayName(a.full_name).localeCompare(normalizeDisplayName(b.full_name), "vi");
        case "classification": return SUMMARY_LABELS.indexOf(a.classification) - SUMMARY_LABELS.indexOf(b.classification);
        case "match_status": return (MATCH_STATUS_ORDER[a.match_status] ?? 99) - (MATCH_STATUS_ORDER[b.match_status] ?? 99);
        default: return a.student_code.localeCompare(b.student_code, "vi");
      }
    });
    return list;
  }, [activeItems, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const summary = activeRecord?.summary || emptySummary();
  const percent = activeRecord?.summary_percent || {};
  const canImport = Boolean(activeRecord && activeRecord.status === "VALIDATED" && activeRecord.valid !== false && activeRecord.class_match !== false);

  return (
    <div className="space-y-6 pb-16">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-white/70 text-sm uppercase tracking-[0.2em]">Academic Transcript Import</p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">Nhập bảng tổng kết điểm từ PDF</h1>
            <p className="mt-3 text-white/75 max-w-2xl">Chọn năm học, học kỳ và lớp từ database, upload file PDF text, bấm Validate để kiểm tra trước khi Import.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white border-white/20 px-3 py-2">Validate trước khi import</Badge>
            <Badge className="bg-white/15 text-white border-white/20 px-3 py-2">Lưu lịch sử</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card className="border-0 shadow-md bg-gradient-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Thông tin học vụ</CardTitle>
              <CardDescription>Chọn đúng năm học, học kỳ và lớp học trước khi upload PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-year">Năm học</Label>
                <Select value={schoolYear} onValueChange={setSchoolYear}>
                  <SelectTrigger id="school-year"><SelectValue placeholder="Chọn năm học" /></SelectTrigger>
                  <SelectContent>{academicYearOptions().map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Học kỳ</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger id="semester"><SelectValue placeholder="Chọn học kỳ" /></SelectTrigger>
                  <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-id">Lớp</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={loadingClasses}>
                  <SelectTrigger id="class-id"><SelectValue placeholder={loadingClasses ? "Đang tải lớp..." : "Chọn lớp từ database"} /></SelectTrigger>
                  <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between gap-3"><p className="font-semibold">Lớp đang chọn</p><Badge variant="outline">{selectedClassId ? "Ready" : "Chưa chọn"}</Badge></div>
                <p className="text-muted-foreground">{selectedClassId ? classes.find((item) => String(item.id) === selectedClassId)?.name : "Chưa có lớp nào được chọn"}</p>
                <p className="text-xs text-muted-foreground">{selectedClassId ? classes.find((item) => String(item.id) === selectedClassId)?.faculty || "" : "Chọn đúng lớp để hệ thống đối chiếu với lớp trên PDF."}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" />Upload PDF</CardTitle>
              <CardDescription>Chỉ hỗ trợ PDF text. Hệ thống sẽ validate trước khi import.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-background/60 p-6 text-center hover:border-primary/40">
                <FileText className="h-10 w-10 text-primary" />
                <div><p className="font-semibold">Kéo thả hoặc chọn file PDF</p><p className="text-xs text-muted-foreground mt-1">Bảng tổng kết điểm của sinh viên</p></div>
                <Input type="file" accept="application/pdf" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </label>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm"><p className="font-medium">File đang chọn</p><p className="mt-1 text-muted-foreground truncate">{selectedFile ? selectedFile.name : "Chưa có file nào"}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleValidate} disabled={validating} className="gap-2 bg-gradient-primary">
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{validating ? "Đang validate..." : "Validate"}
                </Button>
                <Button onClick={handleImport} disabled={!canImport || importing} variant="outline" className="gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{importing ? "Đang import..." : "Import"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Import chỉ được mở khi PDF đã validate thành công và lớp trong file khớp với lớp đã chọn.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Kết quả validate</CardTitle>
              <CardDescription>So sánh lớp PDF với lớp đã chọn và xem trạng thái xử lý.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeRecord ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusClass(activeRecord.status)}>{activeRecord.status}</Badge>
                    <Badge className={matchStatusClass(activeRecord.class_match === false ? "CLASS_MISMATCH" : "MATCHED")}>{activeRecord.class_match === false ? "CLASS_MISMATCH" : "MATCHED"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">Lớp đã chọn</p><p className="font-semibold">{activeRecord.selected_class || activeRecord.class_name || "-"}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">Lớp trong PDF</p><p className="font-semibold">{activeRecord.pdf_class_name || activeRecord.pdf_class || "-"}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">Năm học</p><p className="font-semibold">{activeRecord.school_year || "-"}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">Học kỳ</p><p className="font-semibold">{activeRecord.semester || "-"}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">File</p><p className="font-semibold truncate">{activeRecord.source_file_name || "-"}</p></div>
                    <div className="rounded-xl border bg-muted/30 p-3"><p className="text-muted-foreground text-xs">Bản ghi</p><p className="font-semibold">#{activeRecord.id}</p></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Chưa có kết quả validate nào. Hãy chọn file và bấm Validate.</div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SUMMARY_LABELS.map((label) => (
              <Card key={label} className="border-0 shadow-md bg-gradient-card"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold">{summary[label] ?? 0}</p></div><Badge variant="outline">{percent[label] ?? 0}%</Badge></div></CardContent></Card>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="font-display">Preview Table</CardTitle>
                <CardDescription>Xem dữ liệu parse, trạng thái khớp và ghi chú ngay trên web.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search MSSV, họ tên, trạng thái..." className="pl-9" />
                </div>
                <Select value={sortKey} onValueChange={(value) => setSortKey(value as typeof sortKey)}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Sắp xếp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student_code">MSSV</SelectItem>
                    <SelectItem value="full_name">Họ tên</SelectItem>
                    <SelectItem value="gpa">TBCTK</SelectItem>
                    <SelectItem value="classification">Xếp loại</SelectItem>
                    <SelectItem value="match_status">Match status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>STT</TableHead><TableHead>MSSV</TableHead><TableHead>Họ tên</TableHead><TableHead>TBCTK</TableHead><TableHead>Classification</TableHead><TableHead>Match Status</TableHead><TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedItems.map((item, index) => (
                      <TableRow key={`${item.student_code}-${index}`}>
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{item.student_code}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{normalizeDisplayName(item.full_name)}</TableCell>
                        <TableCell className="font-semibold">{Number(item.gpa).toFixed(2)}</TableCell>
                        <TableCell><Badge className="bg-primary/10 text-primary border-primary/20">{item.classification}</Badge></TableCell>
                        <TableCell><Badge className={matchStatusClass(item.match_status)}>{item.match_status}</Badge></TableCell>
                        <TableCell className="max-w-[280px] truncate text-muted-foreground">{item.remark || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {pagedItems.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Chưa có dữ liệu để hiển thị.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">Đang xem {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredItems.length)} trong {filteredItems.length} dòng</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((cur) => Math.max(1, cur - 1))} disabled={page === 1}>Trước</Button>
                  <Badge variant="secondary">Trang {page}/{totalPages}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setPage((cur) => Math.min(totalPages, cur + 1))} disabled={page === totalPages}>Sau</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display">History</CardTitle>
                <CardDescription>Danh sách các lần validate/import đã lưu trong hệ thống.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2"><RefreshCw className="h-4 w-4" />Tải lại</Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải lịch sử...</div>
              ) : history.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">Chưa có lịch sử import nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[920px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40"><TableHead>ID</TableHead><TableHead>Lớp</TableHead><TableHead>File</TableHead><TableHead>Số SV</TableHead><TableHead>Trạng thái</TableHead><TableHead>Người tạo</TableHead><TableHead>Thời gian</TableHead><TableHead className="text-right">Xem</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => loadRecordDetail(item.id)}>
                          <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                          <TableCell><div className="font-medium">{item.class_name || item.selected_class || "-"}</div><div className="text-xs text-muted-foreground">{(item.semester || "-") + " • " + (item.school_year || "-")}</div></TableCell>
                          <TableCell className="max-w-[220px] truncate">{item.source_file_name}</TableCell>
                          <TableCell>{item.item_count}</TableCell>
                          <TableCell><Badge className={statusClass(item.status)}>{item.status}</Badge></TableCell>
                          <TableCell>{item.uploaded_by_name || "-"}</TableCell>
                          <TableCell>{formatDate(item.uploaded_at)}</TableCell>
                          <TableCell className="text-right"><Button variant="ghost" size="sm" className="gap-1" onClick={(event) => { event.stopPropagation(); loadRecordDetail(item.id); }}><ArrowUpRight className="h-4 w-4" />Mở</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {activeRecord?.items && activeRecord.items.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-display">Chi tiết bản ghi đang chọn</CardTitle>
                <CardDescription>{activeRecord.class_name || activeRecord.selected_class || "-"} • {activeRecord.source_file_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Số bản ghi</p><p className="mt-1 font-bold">{activeRecord.item_count}</p></div>
                  <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Đã lưu lúc</p><p className="mt-1 font-bold">{formatDate(activeRecord.uploaded_at)}</p></div>
                  <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Tệp</p><p className="mt-1 font-bold truncate">{activeRecord.source_file_name}</p></div>
                </div>
                <Separator />
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40"><TableHead>MSSV</TableHead><TableHead>Họ tên</TableHead><TableHead>TBCTK</TableHead><TableHead>Xếp loại</TableHead><TableHead>Match</TableHead><TableHead>Remark</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRecord.items.map((item) => (
                        <TableRow key={`${item.student_code}-${item.id ?? item.student_db_id ?? "x"}`}>
                          <TableCell className="font-mono">{item.student_code}</TableCell>
                          <TableCell className="max-w-[260px] truncate">{normalizeDisplayName(item.full_name)}</TableCell>
                          <TableCell className="font-semibold">{Number(item.gpa).toFixed(2)}</TableCell>
                          <TableCell>{item.classification}</TableCell>
                          <TableCell><Badge className={matchStatusClass(item.match_status)}>{item.match_status}</Badge></TableCell>
                          <TableCell className="max-w-[260px] truncate text-muted-foreground">{item.remark || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

