import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Filter, Download, Users as UsersIcon, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { facultiesList, Student } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  FACULTY_HIERARCHY,
  ALL_COHORTS,
  ALL_LEVELS,
  ALL_CLUBS,
  getStudentMajor,
  getStudentProgram,
  getStudentLevel,
  getStudentClub,
  getFacultyData
} from "@/lib/filter-utils";

const empty: Omit<Student, "id"> = {
  studentId: "", fullName: "", email: "", className: "none", faculty: "Công nghệ Thông tin", cohort: "K20", gender: "Nam", phone: "",
};

export default function Students() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isImporting, setIsImporting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [heFilter, setHeFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [clbFilter, setClbFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Omit<Student, "id">>(empty);

  const [currentPage, setCurrentPage] = useState(1);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const ITEMS_PER_PAGE = 20;

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, facultyFilter, majorFilter, heFilter, cohortFilter, levelFilter, clbFilter]);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const isMonitor = user?.role === "class_monitor";

  // Dynamically extract unique values from database records
  const dynamicFaculties = useMemo(() => {
    return Array.from(new Set(students.map(s => s.faculty).filter(Boolean)));
  }, [students]);

  const availableMajors = useMemo(() => {
    const filteredStudents = students.filter(s => facultyFilter === "all" || s.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim());
    return Array.from(new Set(filteredStudents.map(s => getStudentMajor(s.studentId, s.faculty, s.className)).filter(Boolean)));
  }, [students, facultyFilter]);

  const availablePrograms = useMemo(() => {
    const filteredStudents = students.filter(s => {
      const matchF = facultyFilter === "all" || s.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim();
      const major = getStudentMajor(s.studentId, s.faculty, s.className);
      const matchM = majorFilter === "all" || major.toLowerCase().trim() === majorFilter.toLowerCase().trim();
      return matchF && matchM;
    });
    return Array.from(new Set(filteredStudents.map(s => getStudentProgram(s.studentId, s.faculty, getStudentMajor(s.studentId, s.faculty, s.className), s.className)).filter(Boolean)));
  }, [students, facultyFilter, majorFilter]);

  const cohortsList = useMemo(() => {
    return Array.from(new Set(students.map(s => s.cohort).filter(Boolean))).sort();
  }, [students]);

  const levelsList = useMemo(() => {
    return Array.from(new Set(students.map(s => {
      const major = getStudentMajor(s.studentId, s.faculty, s.className);
      const program = getStudentProgram(s.studentId, s.faculty, major, s.className);
      return getStudentLevel(s.studentId, program, s.className);
    }).filter(Boolean)));
  }, [students]);

  const clubsList = useMemo(() => {
    return Array.from(new Set(students.map(s => getStudentClub(s.studentId)).filter(Boolean)));
  }, [students]);

  const handleFacultyChange = (val: string) => {
    setFacultyFilter(val);
    setMajorFilter("all");
    setHeFilter("all");
  };

  const handleMajorChange = (val: string) => {
    setMajorFilter(val);
    setHeFilter("all");
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students/`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((s: any) => ({
          id: s.id.toString(),
          studentId: s.student_id,
          fullName: s.full_name,
          email: s.email,
          className: s.class_name || "none",
          faculty: s.faculty,
          cohort: s.cohort,
          gender: s.gender,
          phone: s.phone,
          password: s.password
        }));
        setStudents(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách sinh viên");
    }
  };

  const [dbClasses, setDbClasses] = useState<any[]>([]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_URL}/classes/`);
      if (res.ok) {
        const data = await res.json();
        setDbClasses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const canImportExcel = user?.role === "student_affairs" || user?.role === "admin";

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsImporting(true);
    const toastId = toast.loading("Đang đọc và phân tích file Excel sinh viên, vui lòng đợi...");

    try {
      const res = await fetch(`${API_URL}/students/import-excel/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const createdCount = data.created_count !== undefined ? data.created_count : 0;
        if (createdCount === 0) {
          toast.warning("File xử lý thành công nhưng không có sinh viên mới nào được thêm. Vui lòng kiểm tra tiêu đề cột hoặc dữ liệu trùng.", { id: toastId });
        } else {
          toast.success(`Nhập thành công ${createdCount} sinh viên mới!`, { id: toastId });
        }
        fetchStudents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Không thể nhập danh sách sinh viên", { id: toastId });
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ", { id: toastId });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleExportExcel = () => {
    window.location.href = `${API_URL}/students/export-excel/?faculty=${facultyFilter}&className=${classFilter}`;
  };

  // Find className of the monitor student
  const monitorStudent = useMemo(() => {
    if (!isMonitor || !user?.studentId) return null;
    return students.find(s => s.studentId === user.studentId);
  }, [students, isMonitor, user]);

  const monitorClassName = monitorStudent?.className || "";

  const filtered = useMemo(() => students.filter(s => {
    if (isMonitor) {
      // Monitor can only see classmates
      if (s.className !== monitorClassName) return false;
    }
    const q = search.toLowerCase();
    const matchQ = !q || s.fullName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchF = facultyFilter === "all" || (s.faculty && s.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim());
    const matchC = classFilter === "all" || s.className === classFilter;
    
    const major = getStudentMajor(s.studentId, s.faculty || "", s.className);
    const matchMajor = majorFilter === "all" || major.toLowerCase().trim() === majorFilter.toLowerCase().trim();

    const program = getStudentProgram(s.studentId, s.faculty || "", major, s.className);
    const matchHe = heFilter === "all" || program.toLowerCase().trim() === heFilter.toLowerCase().trim();

    const matchCohort = cohortFilter === "all" || s.cohort === cohortFilter;

    const level = getStudentLevel(s.studentId, program, s.className);
    const matchLevel = levelFilter === "all" || level.toLowerCase().trim() === levelFilter.toLowerCase().trim();

    const club = getStudentClub(s.studentId);
    const matchCLB = clbFilter === "all" || club.toLowerCase().trim() === clbFilter.toLowerCase().trim();

    return matchQ && matchF && matchC && matchMajor && matchHe && matchCohort && matchLevel && matchCLB;
  }), [students, search, facultyFilter, classFilter, majorFilter, heFilter, cohortFilter, levelFilter, clbFilter, isMonitor, monitorClassName]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Student) => { setEditing(s); setForm(s); setOpen(true); };

  const save = async () => {
    if (!form.studentId || !form.fullName) { toast.error("Vui lòng nhập đầy đủ mã SV và họ tên"); return; }
    
    const matchedClass = dbClasses.find(c => c.name === form.className);
    const payload = {
      student_id: form.studentId,
      full_name: form.fullName,
      email: form.email,
      faculty: form.faculty,
      cohort: form.cohort,
      gender: form.gender,
      phone: form.phone,
      class_info: matchedClass ? matchedClass.id : null
    };

    if (editing) {
      try {
        const res = await fetch(`${API_URL}/students/${editing.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success("Đã cập nhật sinh viên");
          fetchStudents();
        } else {
          toast.error("Không thể cập nhật sinh viên");
        }
      } catch (err) {
        toast.error("Lỗi kết nối máy chủ");
      }
    } else {
      try {
        const res = await fetch(`${API_URL}/students/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          toast.success("Đã thêm sinh viên mới");
          fetchStudents();
        } else {
          toast.error("Không thể thêm sinh viên");
        }
      } catch (err) {
        toast.error("Lỗi kết nối máy chủ");
      }
    }
    setOpen(false);
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/students/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa sinh viên");
        fetchStudents();
      } else {
        toast.error("Không thể xóa sinh viên");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <UsersIcon className="h-7 w-7 text-primary" /> {isMonitor ? `Thành viên lớp ${monitorClassName}` : "Quản lý sinh viên"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isMonitor 
              ? `Xem danh sách thành viên trong lớp ${monitorClassName}.` 
              : `Quản lý thông tin ${students.length} sinh viên trong hệ thống.`}
          </p>
        </div>
        {!isMonitor && (
          <div className="flex flex-wrap gap-2">
            {canImportExcel && (
              <>
                <input
                  type="file"
                  id="excel-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleExcelUpload}
                />
                <Button 
                  variant="outline" 
                  className="gap-2 border-primary/20"
                  onClick={() => document.getElementById("excel-upload")?.click()}
                >
                  <Download className="h-4 w-4 rotate-180" /> Nhập Excel
                </Button>
              </>
            )}
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}><Download className="h-4 w-4" />Xuất Excel</Button>
            <Button onClick={openCreate} className="gap-2 bg-gradient-primary shadow-md"><Plus className="h-4 w-4" />Thêm sinh viên</Button>
          </div>
        )}
      </div>

      <Card className="border-0 shadow-md relative overflow-hidden">
        {isImporting && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-semibold text-primary">Đang tải và xử lý dữ liệu Excel...</p>
          </div>
        )}
        <CardHeader className="border-b bg-muted/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tên, mã SV, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
          </div>
          
          {!isMonitor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {/* Khoa */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Khoa</Label>
                <Select value={facultyFilter} onValueChange={handleFacultyChange}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Khoa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả khoa</SelectItem>
                    {dynamicFaculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Ngành */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Ngành</Label>
                <Select value={majorFilter} onValueChange={handleMajorChange}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Ngành" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả ngành</SelectItem>
                    {availableMajors.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Hệ */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Hệ đào tạo</Label>
                <Select value={heFilter} onValueChange={setHeFilter}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Hệ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả hệ</SelectItem>
                    {availablePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Khóa */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Khóa</Label>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Khóa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả khóa</SelectItem>
                    {cohortsList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Bậc */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Bậc đào tạo</Label>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Bậc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả bậc</SelectItem>
                    {levelsList.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* CLB */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold">Câu lạc bộ</Label>
                <Select value={clbFilter} onValueChange={setClbFilter}>
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Câu lạc bộ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả CLB</SelectItem>
                    {clubsList.map(club => <SelectItem key={club} value={club}>{club}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        {/* Table View for Large Screens */}
        <div className="hidden lg:block">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Mã SV</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead className="hidden md:table-cell">Lớp</TableHead>
                  <TableHead className="hidden lg:table-cell">Khoa</TableHead>
                  <TableHead className="hidden md:table-cell">Giới tính</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  {!isMonitor && <TableHead className="hidden lg:table-cell">Mật khẩu</TableHead>}
                  {!isMonitor && <TableHead className="text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map(s => {
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">{s.studentId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                            {s.fullName.split(" ").slice(-1)[0][0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{s.fullName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.className ? <Badge variant="secondary">{s.className}</Badge> : <span className="text-muted-foreground text-xs italic">Chưa xếp lớp</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{s.faculty}</TableCell>
                      <TableCell className="hidden md:table-cell">{s.gender}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{s.email}</TableCell>
                      {!isMonitor && (
                        <TableCell className="hidden lg:table-cell font-mono text-sm">
                          {s.password ? (
                            <div className="flex items-center gap-1.5">
                              <span className="min-w-[70px] inline-block">
                                {visiblePasswords[s.id] ? s.password : "••••••••"}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={() => togglePasswordVisibility(s.id)}
                              >
                                {visiblePasswords[s.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Đã đổi mật khẩu</span>
                          )}
                        </TableCell>
                      )}
                      {!isMonitor && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Xóa sinh viên?</AlertDialogTitle>
                                  <AlertDialogDescription>Bạn có chắc muốn xóa {s.fullName} ({s.studentId})? Hành động này không thể hoàn tác.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={isMonitor ? 6 : 8} className="text-center py-12 text-muted-foreground">Không tìm thấy sinh viên nào</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </div>

        {/* Card View for Mobile/Tablet Screens */}
        <div className="lg:hidden p-4 space-y-4">
          {paginatedStudents.map(s => {
            return (
              <div key={s.id} className="p-4 rounded-xl border bg-card hover:bg-muted/10 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                      {s.fullName.split(" ").slice(-1)[0][0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{s.fullName}</h4>
                      <p className="font-mono text-xs text-muted-foreground">{s.studentId}</p>
                    </div>
                  </div>
                  {!isMonitor && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa sinh viên?</AlertDialogTitle>
                            <AlertDialogDescription>Bạn có chắc muốn xóa {s.fullName} ({s.studentId})? Hành động này không thể hoàn tác.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground block">Lớp:</span>
                    {s.className ? <Badge variant="secondary" className="mt-0.5">{s.className}</Badge> : <span className="text-muted-foreground italic">Chưa xếp lớp</span>}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Giới tính:</span>
                    <span className="font-medium">{s.gender}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Khoa:</span>
                    <span className="font-medium">{s.faculty}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Email:</span>
                    <span className="font-medium text-primary truncate block" title={s.email}>{s.email}</span>
                  </div>
                  {!isMonitor && (
                    <div className="col-span-2 pt-1 border-t">
                      <span className="text-muted-foreground block mb-0.5">Mật khẩu:</span>
                      {s.password ? (
                        <div className="flex items-center gap-1.5 font-mono text-sm">
                          <span className="min-w-[70px] inline-block font-medium">
                            {visiblePasswords[s.id] ? s.password : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => togglePasswordVisibility(s.id)}
                          >
                            {visiblePasswords[s.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Đã đổi mật khẩu</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center py-6 text-muted-foreground text-sm">Không tìm thấy sinh viên nào</p>
          )}
        </div>
        <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground bg-muted/5">
          <span>Hiển thị <span className="font-semibold text-foreground">{filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-semibold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> trong số <span className="font-semibold text-foreground">{filtered.length}</span> sinh viên</span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs"
              >
                Trước
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                  return (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className={`h-8 w-8 text-xs p-0 ${currentPage === p ? "bg-gradient-primary border-0 text-white shadow-sm font-semibold" : ""}`}
                    >
                      {p}
                    </Button>
                  );
                }
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className="text-muted-foreground px-1 text-xs select-none">...</span>;
                }
                return null;
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs"
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!isMonitor && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Cập nhật sinh viên" : "Thêm sinh viên mới"}</DialogTitle>
              <DialogDescription>Nhập thông tin chi tiết của sinh viên</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2"><Label>Mã sinh viên *</Label><Input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} /></div>
              <div className="space-y-2"><Label>Họ và tên *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Số điện thoại</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Khoa</Label>
                <Select value={form.faculty} onValueChange={v => setForm({ ...form, faculty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{facultiesList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Lớp</Label>
                <Select value={form.className} onValueChange={v => setForm({ ...form, className: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa xếp lớp</SelectItem>
                    {dbClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Giới tính</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Nam">Nam</SelectItem><SelectItem value="Nữ">Nữ</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Khóa</Label><Input value={form.cohort} onChange={e => setForm({ ...form, cohort: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={save} className="bg-gradient-primary">{editing ? "Cập nhật" : "Thêm mới"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
