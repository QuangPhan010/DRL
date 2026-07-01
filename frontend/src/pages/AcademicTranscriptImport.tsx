import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
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
import { parseClassName } from "@/lib/filter-utils";

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

const SUMMARY_LABELS = ["Xuất sắc", "Giỏi", "Khá", "Trung bình", "Yếu/Kém"];

const getClassificationFromGPA = (gpa: number): string => {
  if (gpa >= 3.6) return "Xuất sắc";
  if (gpa >= 3.2) return "Giỏi";
  if (gpa >= 2.5) return "Khá";
  if (gpa >= 2.0) return "Trung bình";
  return "Yếu/Kém";
};

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
    case "Chưa nhập điểm": return "bg-muted text-muted-foreground border-border";
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
  classification: item.classification === "Chưa xếp loại" ? "Chưa xếp loại" : getClassificationFromGPA(toNum(item.gpa)),
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

  const [activeClass, setActiveClass] = useState<SchoolClass | null>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchClassQuery, setSearchClassQuery] = useState("");

  const [filterKhoa, setFilterKhoa] = useState("all");
  const [filterNganh, setFilterNganh] = useState("all");
  const [filterHe, setFilterHe] = useState("all");
  const [filterKhoaHoc, setFilterKhoaHoc] = useState("all");
  const [filterBac, setFilterBac] = useState("all");

  const availableFaculties = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.faculty).filter(Boolean))).sort();
  }, [classes]);

  const availableCohorts = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.cohort).filter(Boolean))).sort();
  }, [classes]);

  const availableMajors = useMemo(() => {
    return Array.from(new Set(classes.map((c) => parseClassName(c.name).major).filter(Boolean))).sort();
  }, [classes]);

  const availablePrograms = useMemo(() => {
    return Array.from(new Set(classes.map((c) => parseClassName(c.name).program).filter(Boolean))).sort();
  }, [classes]);

  const availableLevels = useMemo(() => {
    return Array.from(new Set(classes.map((c) => parseClassName(c.name).level).filter(Boolean))).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const q = searchClassQuery.trim().toLowerCase();
    return classes.filter((cls) => {
      // 1. Search query filter
      const matchesSearch = !q || (
        cls.name.toLowerCase().includes(q) ||
        cls.faculty?.toLowerCase().includes(q) ||
        cls.cohort?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      // 2. Khoa filter
      if (filterKhoa !== "all" && cls.faculty !== filterKhoa) return false;

      // 3. Khóa filter
      if (filterKhoaHoc !== "all" && cls.cohort !== filterKhoaHoc) return false;

      const parsed = parseClassName(cls.name);

      // 4. Bậc filter
      if (filterBac !== "all" && parsed.level !== filterBac) return false;

      // 5. Ngành filter
      if (filterNganh !== "all" && parsed.major !== filterNganh) return false;

      // 6. Hệ filter
      if (filterHe !== "all" && parsed.program !== filterHe) return false;

      return true;
    });
  }, [classes, searchClassQuery, filterKhoa, filterNganh, filterHe, filterKhoaHoc, filterBac]);

  const fetchClassStudents = async (className: string) => {
    try {
      setLoadingStudents(true);
      const res = await fetch(`${API_URL}/students/`, { headers: getTokenHeaders() });
      if (!res.ok) throw new Error("Không tải được danh sách sinh viên");
      const data = await res.json();
      const filtered = (data || []).filter((s: any) => s.class_name === className);
      setClassStudents(filtered);
    } catch (e) {
      console.error(e);
      toast.error("Không tải được danh sách sinh viên của lớp");
    } finally {
      setLoadingStudents(false);
    }
  };

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

  useEffect(() => {
    if (!activeClass) {
      setActiveRecord(null);
      return;
    }
    if (activeRecord && activeRecord.status === "VALIDATED") {
      return;
    }

    const match = history.find(
      (h) =>
        (h.class_name === activeClass.name || h.selected_class === activeClass.name) &&
        h.school_year === schoolYear &&
        h.semester === semester &&
        h.status === "IMPORTED"
    );

    if (match) {
      if (!activeRecord || activeRecord.id !== match.id) {
        loadRecordDetail(match.id);
      }
    } else {
      if (activeRecord && activeRecord.status === "IMPORTED") {
        setActiveRecord(null);
      }
    }
  }, [activeClass, schoolYear, semester, history]);

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
  // Compute items to display in preview table (from active record or class student list)
  const activeItems = useMemo(() => {
    if (activeRecord && activeRecord.items && activeRecord.items.length > 0) {
      return activeRecord.items;
    }
    return classStudents.map((s) => ({
      student_code: s.student_id || s.studentId || "",
      full_name: s.full_name || s.fullName || "",
      gpa: 0,
      classification: "Chưa xếp loại",
      match_status: "Chưa nhập điểm",
      remark: "Chưa cập nhật dữ liệu điểm học tập học kỳ này",
    }));
  }, [activeRecord, classStudents]);
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

  const summary = useMemo(() => {
    const counts = emptySummary();
    if (activeItems.length === 0) return counts;
    
    const hasGrades = activeItems.some(item => item.match_status !== "Chưa nhập điểm");
    if (!hasGrades) return counts;

    activeItems.forEach((item) => {
      const cls = getClassificationFromGPA(item.gpa);
      if (counts[cls] !== undefined) {
        counts[cls]++;
      }
    });
    return counts;
  }, [activeItems]);

  const percent = useMemo(() => {
    const pct: Record<string, number> = {};
    const total = activeItems.length;
    if (total === 0) {
      SUMMARY_LABELS.forEach((label) => {
        pct[label] = 0;
      });
      return pct;
    }
    SUMMARY_LABELS.forEach((label) => {
      pct[label] = Math.round(((summary[label] || 0) / total) * 100);
    });
    return pct;
  }, [summary, activeItems]);
  const canImport = Boolean(activeRecord && activeRecord.status === "VALIDATED" && activeRecord.valid !== false && activeRecord.class_match !== false);

  const handleSelectClass = (cls: SchoolClass) => {
    setActiveClass(cls);
    setSelectedClassId(String(cls.id));
    fetchClassStudents(cls.name);
  };

  const handleBackToClasses = () => {
    setActiveClass(null);
    setActiveRecord(null);
    setSelectedFile(null);
  };

  if (!activeClass) {
    return (
      <div className="flex flex-col gap-6 pb-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative p-5 md:p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-white/60 text-[10px] uppercase tracking-[0.2em]">Academic Transcript Import</p>
              <h1 className="mt-1 font-display text-xl md:text-2xl font-bold">Nhập điểm từ PDF</h1>
              <p className="mt-1 text-white/70 text-xs max-w-2xl">Vui lòng chọn thông tin học vụ (năm học, học kỳ) và chọn lớp học từ danh sách để bắt đầu nhập điểm.</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Badge className="bg-white/10 text-white border-white/15 text-xs py-1 px-2.5">ITC Point System</Badge>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="border-0 shadow-sm shrink-0 bg-background/50 backdrop-blur">
          <CardContent className="p-4 flex flex-col md:grid md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Khoa</Label>
              <Select value={filterKhoa} onValueChange={setFilterKhoa}>
                <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Tất cả Khoa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Khoa</SelectItem>
                  {availableFaculties.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Ngành</Label>
              <Select value={filterNganh} onValueChange={setFilterNganh}>
                <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Tất cả Ngành" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Ngành</SelectItem>
                  {availableMajors.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Hệ</Label>
              <Select value={filterHe} onValueChange={setFilterHe}>
                <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Tất cả Hệ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Hệ</SelectItem>
                  {availablePrograms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Khóa</Label>
              <Select value={filterKhoaHoc} onValueChange={setFilterKhoaHoc}>
                <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Tất cả Khóa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Khóa</SelectItem>
                  {availableCohorts.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Bậc</Label>
              <Select value={filterBac} onValueChange={setFilterBac}>
                <SelectTrigger className="bg-background h-9"><SelectValue placeholder="Tất cả Bậc" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Bậc</SelectItem>
                  {availableLevels.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchClassQuery}
                  onChange={(e) => setSearchClassQuery(e.target.value)}
                  placeholder="Tên lớp..."
                  className="pl-8 bg-background h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid */}
        <div className="pr-1">
          {loadingClasses ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Đang tải danh sách lớp học...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed rounded-2xl bg-muted/20">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Không tìm thấy lớp học nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredClasses.map((cls) => (
                <Card
                  key={cls.id}
                  className="border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden bg-gradient-card"
                  onClick={() => handleSelectClass(cls)}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all duration-200" />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                        {cls.cohort || "K-ITC"}
                      </span>
                      <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                    </div>
                    <CardTitle className="font-display text-lg font-bold group-hover:text-primary transition-colors duration-200 mt-2">
                      {cls.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <p className="text-xs text-muted-foreground truncate">{cls.faculty || "Khoa Công nghệ thông tin"}</p>
                    <div className="mt-3 flex justify-end">
                      <span className="text-[10px] text-primary font-semibold flex items-center gap-1 group-hover:underline">
                        Chọn lớp <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg shrink-0">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-10 w-10 rounded-full shrink-0"
              onClick={handleBackToClasses}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-white/60 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> Academic Transcript Import • {activeClass.name}
              </p>
              <h1 className="font-display text-lg md:text-xl font-bold mt-0.5">Tải lên bảng điểm lớp {activeClass.name}</h1>
              <p className="text-white/70 text-xs mt-0.5">Upload file PDF text, hệ thống tự động đối chiếu MSSV, TBCTK và lưu lịch sử import.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Badge className="bg-white/10 text-white border-white/15 text-xs py-1 px-2.5">{semester} ({schoolYear})</Badge>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Upload PDF Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="font-display flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" />Upload PDF</CardTitle>
              <CardDescription>Chỉ nhận file PDF text, không dùng OCR ở bước này.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-background/60 p-6 text-center hover:border-primary/40">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Kéo thả hoặc chọn file PDF</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bảng tổng kết điểm toàn khóa của sinh viên</p>
                </div>
                <Input type="file" accept="application/pdf" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Năm học</Label>
                  <Select value={schoolYear} onValueChange={setSchoolYear}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn năm học" /></SelectTrigger>
                    <SelectContent>{academicYearOptions().map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Học kỳ</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Chọn học kỳ" /></SelectTrigger>
                    <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-xs text-muted-foreground">File đang chọn</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{selectedFile ? selectedFile.name : "Chưa có file nào"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleValidate} disabled={validating} className="gap-2 bg-gradient-primary">
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{validating ? "Đang validate..." : "Validate PDF"}
                </Button>
                <Button onClick={handleImport} disabled={!canImport || importing} variant="outline" className="gap-2">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{importing ? "Đang import..." : "Import"}
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>

        <div className="space-y-4 min-w-0">
          {/* Preview Table Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-3">
              <div>
                <CardTitle className="font-display">Preview Table</CardTitle>
                <CardDescription>
                  {activeRecord
                    ? "Xem trực tiếp kết quả parse và dữ liệu đối chiếu với Student từ PDF."
                    : "Hiển thị danh sách sinh viên hiện có trong lớp từ cơ sở dữ liệu."}
                </CardDescription>
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
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-12">STT</TableHead>
                      <TableHead className="w-32">MSSV</TableHead>
                      <TableHead>Họ tên</TableHead>
                      <TableHead className="w-24">TBCTK</TableHead>
                      <TableHead className="w-36">Xếp loại</TableHead>
                      <TableHead className="w-36">Trạng thái</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStudents ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2 text-primary" />
                          Đang tải danh sách sinh viên của lớp từ database...
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedItems.map((item, index) => (
                        <TableRow key={`${item.student_code}-${index}`}>
                          <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-mono font-medium text-xs">{item.student_code}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs font-medium">{normalizeDisplayName(item.full_name)}</TableCell>
                          <TableCell className="font-semibold text-xs">{Number(item.gpa).toFixed(2)}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${item.classification === "Chưa xếp loại" ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20"}`}>{item.classification}</Badge></TableCell>
                          <TableCell><Badge className={`${matchStatusClass(item.match_status)} text-[10px]`}>{item.match_status}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">{item.remark || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {!loadingStudents && pagedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                          Lớp chưa có sinh viên nào trong hệ thống.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                <p className="text-muted-foreground">Đang xem {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredItems.length)} trong {filteredItems.length} dòng</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((cur) => Math.max(1, cur - 1))} disabled={page === 1}>Trước</Button>
                  <Badge variant="secondary">Trang {page}/{totalPages}</Badge>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPage((cur) => Math.min(totalPages, cur + 1))} disabled={page === totalPages}>Sau</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classification Stats Cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 shrink-0">
            {SUMMARY_LABELS.map((label) => (
              <Card key={label} className="border-0 shadow-sm bg-gradient-card">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</p>
                      <p className="mt-1 font-display text-xl font-bold">{summary[label] ?? 0}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{percent[label] ?? 0}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* History Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="font-display">History</CardTitle>
                <CardDescription>Danh sách các lần validate/import của lớp {activeClass.name}.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2"><RefreshCw className="h-4 w-4" />Tải lại</Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs"><Loader2 className="h-4 w-4 animate-spin" />Đang tải lịch sử...</div>
              ) : history.filter(h => h.class_name === activeClass.name || h.selected_class === activeClass.name).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">Chưa có lịch sử import nào cho lớp này.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px] text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40"><TableHead className="w-16">ID</TableHead><TableHead>File</TableHead><TableHead className="w-20">Số SV</TableHead><TableHead className="w-28">Trạng thái</TableHead><TableHead>Người tạo</TableHead><TableHead className="w-36">Thời gian</TableHead><TableHead className="text-right w-20">Xem</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {history
                        .filter(h => h.class_name === activeClass.name || h.selected_class === activeClass.name)
                        .map((item) => (
                          <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => loadRecordDetail(item.id)}>
                            <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                            <TableCell className="max-w-[200px] truncate font-medium">{item.source_file_name}</TableCell>
                            <TableCell>{item.item_count} SV</TableCell>
                            <TableCell><Badge className={`${statusClass(item.status)} text-[10px]`}>{item.status}</Badge></TableCell>
                            <TableCell>{item.uploaded_by_name || "-"}</TableCell>
                            <TableCell>{formatDate(item.uploaded_at)}</TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={(event) => { event.stopPropagation(); loadRecordDetail(item.id); }}><ArrowUpRight className="h-4 w-4" />Mở</Button></TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

