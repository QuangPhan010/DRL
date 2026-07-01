import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

type TranscriptItem = {
  id?: number;
  student?: number | null;
  student_id?: string | null;
  student_code: string;
  full_name: string;
  resolved_full_name?: string;
  gpa: number;
  classification: string;
  status: "MATCHED" | "NOT_FOUND";
};

type TranscriptImport = {
  id: number;
  class_name: string;
  semester: string | null;
  source_file_name: string;
  item_count: number;
  uploaded_by_name?: string;
  uploaded_at: string;
  summary: Record<string, number>;
  summary_percent: Record<string, number>;
  items?: TranscriptItem[];
};

const EMPTY_SUMMARY = {
  "Xuất sắc": 0,
  "Giỏi": 0,
  "Khá": 0,
  "TB Khá": 0,
  "TB": 0,
  "Yếu": 0,
};

const CATEGORIES = ["Xuất sắc", "Giỏi", "Khá", "TB Khá", "TB", "Yếu"];

function getTokenHeaders(isMultipart = false) {
  const token = localStorage.getItem("drl_token");
  const headers: Record<string, string> = {};
  if (!isMultipart) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
}

function normalizeDisplayName(value?: string) {
  if (!value) return "-";

  const tokens = value.trim().split(/\s+/);
  const nameTokens: string[] = [];

  for (const token of tokens) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(token)) {
      break;
    }
    if (/^\d+(?:[.,]\d+)?$/.test(token)) {
      break;
    }
    nameTokens.push(token);
  }

  return nameTokens.length > 0 ? nameTokens.join(" ") : value.trim();
}

function BadgeStatus({ status }: { status: TranscriptItem["status"] }) {
  if (status === "MATCHED") {
    return <Badge className="bg-success/15 text-success border-success/20">MATCHED</Badge>;
  }
  return <Badge className="bg-destructive/15 text-destructive border-destructive/20">NOT_FOUND</Badge>;
}

export default function AcademicTranscriptImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [semester, setSemester] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<TranscriptImport[]>([]);
  const [activeImport, setActiveImport] = useState<TranscriptImport | null>(null);
  const [previewItems, setPreviewItems] = useState<TranscriptItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"student_code" | "full_name" | "gpa" | "classification" | "status">("student_code");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_URL}/transcripts/`, {
        headers: getTokenHeaders(),
      });
      if (!res.ok) throw new Error("Không tải được lịch sử import");
      const data = await res.json();
      setHistory(
        (data || []).map((item: any) => ({
          id: item.id,
          class_name: item.class_name,
          semester: item.semester,
          source_file_name: item.source_file_name,
          item_count: item.item_count ?? item.total_students ?? 0,
          uploaded_by_name: item.uploaded_by_name,
          uploaded_at: item.uploaded_at,
          summary: item.summary || EMPTY_SUMMARY,
          summary_percent: item.summary_percent || {},
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error("Không tải được lịch sử import");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const loadImportDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/transcripts/${id}/`, {
        headers: getTokenHeaders(),
      });
      if (!res.ok) throw new Error("Không tải được chi tiết import");
      const data = await res.json();
      const detail: TranscriptImport = {
        id: data.id,
        class_name: data.class_name,
        semester: data.semester,
        source_file_name: data.source_file_name,
        item_count: data.item_count ?? data.total_students ?? 0,
        uploaded_by_name: data.uploaded_by_name,
        uploaded_at: data.uploaded_at,
        summary: data.summary || EMPTY_SUMMARY,
        summary_percent: data.summary_percent || {},
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          student: item.student,
          student_id: item.student_id,
          student_code: item.student_code,
          full_name: item.full_name,
          resolved_full_name: item.resolved_full_name,
          gpa: Number(item.gpa),
          classification: item.classification,
          status: item.status,
        })),
      };
      setActiveImport(detail);
      setPreviewItems(detail.items || []);
      setSearch("");
      setPage(1);
      toast.success("Đã tải chi tiết import");
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết import");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Hãy chọn một file PDF trước");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (semester.trim()) {
      formData.append("semester", semester.trim());
    }

    try {
      setUploading(true);
      const res = await fetch(`${API_URL}/transcripts/import/`, {
        method: "POST",
        headers: getTokenHeaders(true),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import thất bại");
      }

      const mapped: TranscriptItem[] = (data.students || []).map((item: any) => ({
        id: item.id,
        student: item.student,
        student_id: item.student_id ?? null,
        student_code: item.student_code,
        full_name: item.full_name,
        resolved_full_name: item.resolved_full_name,
        gpa: Number(item.gpa),
        classification: item.classification,
        status: item.status,
      }));

      setActiveImport({
        id: data.import_id,
        class_name: data.class_name,
        semester: data.semester || null,
        source_file_name: data.source_file_name || selectedFile.name,
        item_count: data.total_students || mapped.length,
        uploaded_at: new Date().toISOString(),
        summary: data.summary || EMPTY_SUMMARY,
        summary_percent: data.summary_percent || {},
        items: mapped,
      });
      setPreviewItems(mapped);
      setSearch("");
      setPage(1);
      setSelectedFile(null);
      await fetchHistory();
      toast.success("Import bảng tổng kết thành công");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Import thất bại");
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = [...previewItems].filter((item) => {
      if (!q) return true;
      return (
        item.student_code.toLowerCase().includes(q) ||
        item.full_name.toLowerCase().includes(q) ||
        item.resolved_full_name?.toLowerCase().includes(q) ||
        item.classification.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortKey === "gpa") return Number(bVal) - Number(aVal);
      return String(aVal ?? "").localeCompare(String(bVal ?? ""), "vi");
    });

    return list;
  }, [previewItems, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const activeSummary = activeImport?.summary || EMPTY_SUMMARY;
  const activePercent = activeImport?.summary_percent || {};

  return (
    <div className="space-y-6 pb-16">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-white/70 text-sm uppercase tracking-[0.2em]">Academic Transcript Import</p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">Nhập bảng tổng kết điểm toàn khóa từ PDF</h1>
            <p className="mt-3 text-white/75 max-w-2xl">
              Upload file PDF text, hệ thống tự đọc mã lớp, MSSV, TBCTK, lưu lịch sử import và cho phép xem lại trực tiếp trên web.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-white/15 text-white border-white/20 px-3 py-2">PDF text</Badge>
            <Badge className="bg-white/15 text-white border-white/20 px-3 py-2">History saved</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card className="border-0 shadow-md bg-gradient-card">
            <CardHeader>
              <CardTitle className="font-display">Upload PDF</CardTitle>
              <CardDescription>Chỉ nhận file PDF text, không dùng OCR ở bước đầu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-background/60 p-6 text-center hover:border-primary/40">
                <UploadCloud className="h-10 w-10 text-primary" />
                <div>
                  <p className="font-semibold">Kéo thả hoặc chọn file PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">Bảng tổng kết điểm toàn khóa của sinh viên</p>
                </div>
                <Input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="space-y-2">
                <Label htmlFor="semester">Học kỳ</Label>
                <Input
                  id="semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="VD: HK1 2025-2026"
                />
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="font-medium">File đang chọn</p>
                <p className="mt-1 text-muted-foreground">{selectedFile ? selectedFile.name : "Chưa có file nào"}</p>
              </div>

              <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2 bg-gradient-primary">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {uploading ? "Đang import..." : "Import PDF"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Thông tin lần import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeImport ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs">Tên lớp</p>
                      <p className="font-semibold">{activeImport.class_name}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs">Số sinh viên</p>
                      <p className="font-semibold">{activeImport.item_count}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs">File</p>
                      <p className="font-semibold truncate">{activeImport.source_file_name}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs">Lưu lúc</p>
                      <p className="font-semibold">{formatDate(activeImport.uploaded_at)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((label) => (
                      <Badge key={label} variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {label}: {activeSummary[label] ?? 0}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu import nào. Hãy upload một file PDF để bắt đầu.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="font-display">Preview Table</CardTitle>
                <CardDescription>Xem trực tiếp kết quả parse và dữ liệu đối chiếu với Student.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search MSSV, họ tên, trạng thái..."
                    className="pl-9"
                  />
                </div>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student_code">MSSV</SelectItem>
                    <SelectItem value="full_name">Họ tên</SelectItem>
                    <SelectItem value="gpa">TBCTK</SelectItem>
                    <SelectItem value="classification">Xếp loại</SelectItem>
                    <SelectItem value="status">Trạng thái</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>STT</TableHead>
                      <TableHead>MSSV</TableHead>
                      <TableHead>Họ tên</TableHead>
                      <TableHead>TBCTK</TableHead>
                      <TableHead>Xếp loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedItems.map((item, index) => (
                      <TableRow key={`${item.student_code}-${index}`}>
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="font-mono font-medium">{item.student_code}</TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {normalizeDisplayName(item.resolved_full_name || item.full_name)}
                        </TableCell>
                        <TableCell className="font-semibold">{Number(item.gpa).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary border-primary/20">{item.classification}</Badge>
                        </TableCell>
                        <TableCell>
                          <BadgeStatus status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {pagedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Chưa có dữ liệu để hiển thị.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Đang xem {filteredItems.length === 0 ? 0 : (page - 1) * pageSize + 1}
                  {" "}
                  - {Math.min(page * pageSize, filteredItems.length)} trong {filteredItems.length} dòng
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Trước
                  </Button>
                  <Badge variant="secondary">Trang {page}/{totalPages}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Sau
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CATEGORIES.map((label) => (
              <Card key={label} className="border-0 shadow-md bg-gradient-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-1 font-display text-3xl font-bold">{activeSummary[label] ?? 0}</p>
                    </div>
                    <Badge variant="outline">{activePercent[label] ?? 0}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display">History</CardTitle>
                <CardDescription>Danh sách các lần import đã lưu trong hệ thống.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2">
                <Download className="h-4 w-4" />
                Tải lại
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải lịch sử...
                </div>
              ) : history.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Chưa có lịch sử import nào.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>ID</TableHead>
                        <TableHead>Lớp</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Số SV</TableHead>
                        <TableHead>Người upload</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Xem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => loadImportDetail(item.id)}>
                          <TableCell className="font-mono text-xs">#{item.id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.class_name}</div>
                            <div className="text-xs text-muted-foreground">{item.semester || "Chưa có học kỳ"}</div>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">{item.source_file_name}</TableCell>
                          <TableCell>{item.item_count}</TableCell>
                          <TableCell>{item.uploaded_by_name || "-"}</TableCell>
                          <TableCell>{formatDate(item.uploaded_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); loadImportDetail(item.id); }}>
                              <ArrowUpRight className="h-4 w-4" />
                              Mở
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {activeImport?.items && activeImport.items.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-display">Chi tiết lần import đang chọn</CardTitle>
                <CardDescription>{activeImport.class_name} • {activeImport.source_file_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Số bản ghi</p>
                    <p className="mt-1 font-bold">{activeImport.item_count}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Đã lưu lúc</p>
                    <p className="mt-1 font-bold">{formatDate(activeImport.uploaded_at)}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Tệp</p>
                    <p className="mt-1 font-bold truncate">{activeImport.source_file_name}</p>
                  </div>
                </div>
                <Separator />
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>MSSV</TableHead>
                        <TableHead>Họ tên</TableHead>
                        <TableHead>TBCTK</TableHead>
                        <TableHead>Xếp loại</TableHead>
                        <TableHead>Đối chiếu Student</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeImport.items.map((item) => (
                        <TableRow key={`${item.student_code}-${item.id ?? Math.random()}`}>
                          <TableCell className="font-mono">{item.student_code}</TableCell>
                          <TableCell className="max-w-[260px] truncate">
                            {normalizeDisplayName(item.resolved_full_name || item.full_name)}
                          </TableCell>
                          <TableCell className="font-semibold">{Number(item.gpa).toFixed(2)}</TableCell>
                          <TableCell>{item.classification}</TableCell>
                          <TableCell><BadgeStatus status={item.status} /></TableCell>
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
