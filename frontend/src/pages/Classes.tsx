import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { 
  Plus, Search, Edit, Trash2, Filter, Users as UsersIcon, GraduationCap, 
  UserCheck, X, ArrowLeft, ArrowUpRight, UploadCloud, Download, Building2,
  FileText, Loader2, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { facultiesList, Student, ClassInfo } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  parseClassName,
} from "@/lib/filter-utils";

const emptyStudent: Omit<Student, "id"> = {
  studentId: "", fullName: "", email: "", className: "", faculty: "Công nghệ Thông tin", cohort: "K20", gender: "Nam", phone: "",
};

export default function Classes() {
  const { user, allUsers, fetchUsers } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Data State
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Resolve active selected class from URL
  const selectedClass = useMemo(() => {
    if (location.pathname === "/students") {
      const classId = searchParams.get("classId");
      if (classId) {
        return classes.find(c => c.id === classId || c.name === classId) || null;
      }
    }
    return null;
  }, [location.pathname, searchParams, classes]);

  // Class Filters State
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [heFilter, setHeFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  // Student Filter State
  const [studentSearch, setStudentSearch] = useState("");

  // Dialog Controls
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [classForm, setClassForm] = useState<Omit<ClassInfo, "id">>({
    name: "",
    faculty: "Công nghệ Thông tin",
    cohort: "K20",
    advisorId: "",
  });

  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState<Omit<Student, "id">>(emptyStudent);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch functions
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_URL}/classes/`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          faculty: c.faculty,
          cohort: c.cohort,
          advisorId: c.advisor ? c.advisor.toString() : undefined
        }));
        setClasses(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách lớp học");
    }
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
          className: s.class_name || "",
          faculty: s.faculty,
          cohort: s.cohort,
          gender: s.gender,
          phone: s.phone,
          positions: s.positions || []
        }));
        setStudents(mapped);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách sinh viên");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClasses(), fetchStudents(), fetchUsers()]);
      setLoading(false);
    };
    init();
  }, []);

  // Role Permissions
  const isAdmin = user?.role === "admin";
  const isAcademicAffairs = user?.role === "academic_affairs" || isAdmin;
  const isStudentAffairs = user?.role === "student_affairs" || isAdmin;
  const canCreateClass = isAcademicAffairs;
  const canModifyStudentsInClass = isAcademicAffairs;
  const canAssignAdvisor = isStudentAffairs || isAcademicAffairs;
  const advisors = useMemo(() => allUsers.filter(u => u.role === "advisor"), [allUsers]);
  const isAdvisor = user?.role === "advisor";

  // Dynamic filter helpers for Classes
  const dynamicFaculties = useMemo(() => {
    return Array.from(new Set(classes.map(c => c.faculty).filter(Boolean)));
  }, [classes]);

  const availableMajors = useMemo(() => {
    const filtered = classes.filter(c => facultyFilter === "all" || c.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim());
    return Array.from(new Set(filtered.map(c => parseClassName(c.name).major).filter(Boolean)));
  }, [classes, facultyFilter]);

  const availablePrograms = useMemo(() => {
    const filtered = classes.filter(c => {
      const matchF = facultyFilter === "all" || c.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim();
      const parsed = parseClassName(c.name);
      const matchM = majorFilter === "all" || parsed.major.toLowerCase().trim() === majorFilter.toLowerCase().trim();
      return matchF && matchM;
    });
    return Array.from(new Set(filtered.map(c => parseClassName(c.name).program).filter(Boolean)));
  }, [classes, facultyFilter, majorFilter]);

  const cohortsList = useMemo(() => {
    return Array.from(new Set(classes.map(c => c.cohort).filter(Boolean))).sort();
  }, [classes]);

  const levelsList = useMemo(() => {
    return Array.from(new Set(classes.map(c => parseClassName(c.name).level).filter(Boolean)));
  }, [classes]);

  const handleFacultyChange = (val: string) => {
    setFacultyFilter(val);
    setMajorFilter("all");
    setHeFilter("all");
  };

  const handleMajorChange = (val: string) => {
    setMajorFilter(val);
    setHeFilter("all");
  };

  // Filtered Classes list
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (isAdvisor && c.advisorId !== user?.id?.toString()) {
        return false;
      }
      const q = search.toLowerCase();
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.faculty.toLowerCase().includes(q);
      const matchF = facultyFilter === "all" || (c.faculty && c.faculty.toLowerCase().trim() === facultyFilter.toLowerCase().trim());
      
      const parsed = parseClassName(c.name);
      
      const major = parsed.major;
      const matchMajor = majorFilter === "all" || major.toLowerCase().trim() === majorFilter.toLowerCase().trim();

      const program = parsed.program;
      const matchHe = heFilter === "all" || program.toLowerCase().trim() === heFilter.toLowerCase().trim();

      const matchCohort = cohortFilter === "all" || c.cohort === cohortFilter;

      const level = parsed.level;
      const matchLevel = levelFilter === "all" || level.toLowerCase().trim() === levelFilter.toLowerCase().trim();

      return matchQ && matchF && matchMajor && matchHe && matchCohort && matchLevel;
    });
  }, [classes, search, facultyFilter, majorFilter, heFilter, cohortFilter, levelFilter, isAdvisor, user]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass.name);
  }, [students, selectedClass]);

  // Filtered students inside selected class
  const filteredClassStudents = useMemo(() => {
    return classStudents.filter(s => {
      const q = studentSearch.toLowerCase();
      return !q || s.fullName.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [classStudents, studentSearch]);

  const canAppointMonitor = useMemo(() => {
    if (!selectedClass || !user) return false;
    return selectedClass.advisorId === user.id?.toString() || user.role === "admin" || user.role === "student_affairs";
  }, [selectedClass, user]);

  // Class actions
  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm({
      name: "",
      faculty: facultiesList[0],
      cohort: "K20",
      advisorId: "",
    });
    setIsClassDialogOpen(true);
  };

  const openEditClass = (c: ClassInfo) => {
    setEditingClass(c);
    setClassForm({
      name: c.name,
      faculty: c.faculty,
      cohort: c.cohort,
      advisorId: c.advisorId || "none",
    });
    setIsClassDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name) {
      toast.error("Vui lòng nhập tên lớp");
      return;
    }
    
    if (!editingClass && classes.some(c => c.name.toLowerCase() === classForm.name.toLowerCase())) {
      toast.error("Tên lớp học đã tồn tại");
      return;
    }

    try {
      const url = editingClass 
        ? `${API_URL}/classes/${editingClass.id}/` 
        : `${API_URL}/classes/`;
      const method = editingClass ? "PATCH" : "POST";
      
      const payload = {
        name: classForm.name,
        faculty: classForm.faculty,
        cohort: classForm.cohort,
        advisor: classForm.advisorId && classForm.advisorId !== "none" ? parseInt(classForm.advisorId) : null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingClass ? "Đã cập nhật lớp học" : "Đã tạo lớp học mới");
        setIsClassDialogOpen(false);
        fetchClasses();
      } else {
        toast.error("Không thể lưu lớp học");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/classes/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa lớp học");
        fetchClasses();
      } else {
        toast.error("Không thể xóa lớp học");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleQuickAssignAdvisor = async (classId: string, advisorId: string) => {
    try {
      const res = await fetch(`${API_URL}/classes/${classId}/assign-advisor/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisorId: advisorId && advisorId !== "unassigned" ? parseInt(advisorId) : null })
      });
      if (res.ok) {
        toast.success("Đã phân công cố vấn học tập");
        fetchClasses();
      } else {
        toast.error("Không thể phân công cố vấn");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  // Student actions within selected class
  const openCreateStudent = () => {
    if (!selectedClass) return;
    setEditingStudent(null);
    setStudentForm({
      studentId: "",
      fullName: "",
      email: "",
      className: selectedClass.name,
      faculty: selectedClass.faculty,
      cohort: selectedClass.cohort,
      gender: "Nam",
      phone: "",
    });
    setIsStudentDialogOpen(true);
  };

  const openEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      className: s.className,
      faculty: s.faculty,
      cohort: s.cohort,
      gender: s.gender,
      phone: s.phone || "",
    });
    setIsStudentDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!studentForm.studentId || !studentForm.fullName) {
      toast.error("Vui lòng nhập đầy đủ mã sinh viên và họ tên");
      return;
    }

    try {
      const url = editingStudent 
        ? `${API_URL}/students/${editingStudent.id}/` 
        : `${API_URL}/students/`;
      const method = editingStudent ? "PATCH" : "POST";
      
      const payload = {
        student_id: studentForm.studentId,
        full_name: studentForm.fullName,
        email: studentForm.email,
        class_name: studentForm.className,
        faculty: studentForm.faculty,
        cohort: studentForm.cohort,
        gender: studentForm.gender,
        phone: studentForm.phone,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingStudent ? "Cập nhật sinh viên thành công" : "Thêm sinh viên mới thành công");
        setIsStudentDialogOpen(false);
        fetchStudents();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || errData.error || "Không thể lưu thông tin sinh viên");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/students/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa sinh viên khỏi hệ thống");
        fetchStudents();
      } else {
        toast.error("Không thể xóa sinh viên");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsImporting(true);
    const toastId = toast.loading("Đang đọc và phân tích file Excel sinh viên...");

    try {
      const res = await fetch(`${API_URL}/students/import-excel/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const createdCount = data.created_count !== undefined ? data.created_count : 0;
        toast.success(`Nhập thành công ${createdCount} sinh viên mới!`, { id: toastId });
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
    if (!selectedClass) return;
    window.location.href = `${API_URL}/students/export-excel/?faculty=${selectedClass.faculty}&className=${selectedClass.name}`;
  };

  const handleAssignPosition = async (studentId: string, positionName: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`${API_URL}/classes/${selectedClass.id}/assign-position/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, position_name: positionName })
      });
      if (res.ok) {
        toast.success(`Đã bổ nhiệm chức vụ ${positionName}`);
        await Promise.all([fetchStudents(), fetchUsers()]);
      } else {
        toast.error(`Không thể bổ nhiệm chức vụ ${positionName}`);
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleRevokePosition = async (studentId: string, positionName: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`${API_URL}/classes/${selectedClass.id}/revoke-position/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, position_name: positionName })
      });
      if (res.ok) {
        toast.success(`Đã thu hồi chức vụ ${positionName}`);
        await Promise.all([fetchStudents(), fetchUsers()]);
      } else {
        toast.error(`Không thể thu hồi chức vụ ${positionName}`);
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  if (loading) {
    return <Loading message="Đang tải dữ liệu lớp học và sinh viên..." />;
  }

  // --- RENDERING VIEWS ---

  // VIEW 1: Grid of Class Cards
  const renderClassGrid = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" /> Quản lý lớp & sinh viên
          </h1>
          <p className="text-muted-foreground mt-1">Danh sách các lớp học của trường. Hãy chọn 1 lớp để quản lý sinh viên của lớp đó.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {isAcademicAffairs && (
            <>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="gap-1.5 h-10 border-dashed"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Nhập Excel
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleExcelUpload} 
              />
            </>
          )}
          <Button 
            variant="outline" 
            onClick={() => {
              window.location.href = `${API_URL}/students/export-excel/?faculty=${facultyFilter}&className=all`;
            }}
            className="gap-1.5 h-10"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
          {canCreateClass && (
            <Button onClick={openCreateClass} className="gap-2 bg-gradient-primary shadow-md h-10">
              <Plus className="h-4 w-4" /> Tạo lớp học
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b bg-muted/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo tên lớp, khoa..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9 bg-background" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Khoa</Label>
              <Select value={facultyFilter} onValueChange={handleFacultyChange}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Tất cả khoa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khoa</SelectItem>
                  {dynamicFaculties.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Ngành</Label>
              <Select value={majorFilter} onValueChange={handleMajorChange}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Tất cả ngành" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngành</SelectItem>
                  {availableMajors.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Hệ</Label>
              <Select value={heFilter} onValueChange={setHeFilter}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Tất cả hệ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hệ</SelectItem>
                  {availablePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Khóa</Label>
              <Select value={cohortFilter} onValueChange={setCohortFilter}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Tất cả khóa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khóa</SelectItem>
                  {cohortsList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Bậc</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Tất cả bậc" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bậc</SelectItem>
                  {levelsList.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed rounded-2xl bg-muted/10">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Không tìm thấy lớp học nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredClasses.map((cls) => {
                const classSize = students.filter(s => s.className === cls.name).length;
                return (
                  <Card
                    key={cls.id}
                    className="border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden bg-background"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all duration-200" />
                    
                    {isAcademicAffairs && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 bg-background/80 p-0.5 rounded-md border">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => { e.stopPropagation(); openEditClass(cls); }}
                          title="Sửa lớp"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => e.stopPropagation()}
                              title="Xóa lớp"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa lớp học?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa lớp <strong>{cls.name}</strong>? Dữ liệu sinh viên lớp này sẽ không còn thuộc lớp này nữa.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteClass(cls.id)} className="bg-destructive hover:bg-destructive/90">
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    <div onClick={() => navigate(`/students?classId=${cls.id}`)} className="p-4 flex flex-col h-full justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                            {cls.cohort || "K-ITC"}
                          </span>
                          <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">
                          {cls.name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">{cls.faculty}</p>
                      </div>

                      <div className="pt-4 border-t mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground/80">{classSize} sinh viên</span>
                        <span className="text-[10px] text-primary font-semibold flex items-center gap-1 group-hover:underline">
                          Chọn lớp <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // VIEW 2: Detail view for Selected Class (Student List & CRUD)
  const renderClassDetail = (cls: ClassInfo) => {
    const advisor = advisors.find(a => a.id === cls.advisorId);
    
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-10 w-10 rounded-full shrink-0"
                onClick={() => { navigate("/classes"); setStudentSearch(""); }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <GraduationCap className="h-3 w-3" /> Quản lý lớp & SV • {cls.name}
                </p>
                <h1 className="font-display text-xl md:text-2xl font-bold mt-0.5">Danh sách sinh viên lớp {cls.name}</h1>
                <p className="text-white/70 text-xs mt-0.5">
                  Khoa: {cls.faculty} • Cố vấn: {advisor ? advisor.fullName : <span className="italic opacity-80">Chưa phân công</span>}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 shrink-0">
              {canAssignAdvisor && (
                <div className="w-48 bg-white/10 text-white rounded-md border border-white/15">
                  <Select 
                    value={cls.advisorId || "unassigned"} 
                    onValueChange={val => handleQuickAssignAdvisor(cls.id, val === "unassigned" ? "" : val)}
                  >
                    <SelectTrigger className="h-9 bg-transparent border-0 text-white text-xs placeholder-white/50">
                      <SelectValue placeholder="Chọn cố vấn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Chưa phân công cố vấn</SelectItem>
                      {advisors.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canModifyStudentsInClass && (
                <Button 
                  onClick={openCreateStudent} 
                  className="bg-primary hover:bg-primary-glow text-white text-xs h-9 gap-1.5 rounded-lg font-semibold"
                >
                  <Plus className="h-4 w-4" /> Thêm sinh viên
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-0 bg-muted/10 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md pb-4 md:pb-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Tìm theo MSSV, Họ tên, Email..." 
                  value={studentSearch} 
                  onChange={e => setStudentSearch(e.target.value)} 
                  className="pl-9 bg-background h-10" 
                />
              </div>

              <div className="flex gap-2 pb-4 md:pb-0">
                {isAcademicAffairs && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="gap-1.5 h-10 border-dashed"
                    >
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      Nhập Excel
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".xlsx, .xls" 
                      onChange={handleExcelUpload} 
                    />
                  </>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel}
                  className="gap-1.5 h-10"
                >
                  <Download className="h-4 w-4" />
                  Xuất Excel
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Mã SV</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Vai trò/Chức vụ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Giới tính</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassStudents.map(s => {
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/10">
                        <TableCell className="font-mono font-medium">{s.studentId}</TableCell>
                        <TableCell>{s.fullName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {s.positions && s.positions.length > 0 ? (
                              s.positions.map(p => (
                                <Badge key={p.id} className="bg-success/15 text-success hover:bg-success/20 border-0 text-xs">
                                  {p.position_name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">Sinh viên</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                        <TableCell>{s.gender}</TableCell>
                        <TableCell>{s.phone || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">
                            {canAppointMonitor && (
                              <Select
                                value={s.positions && s.positions.length > 0 ? s.positions[0].position_name : "none"}
                                onValueChange={async (newVal) => {
                                  if (newVal === "none") {
                                    if (s.positions) {
                                      for (const pos of s.positions) {
                                        await handleRevokePosition(s.studentId, pos.position_name);
                                      }
                                    }
                                  } else {
                                    if (s.positions) {
                                      for (const pos of s.positions) {
                                        await handleRevokePosition(s.studentId, pos.position_name);
                                      }
                                    }
                                    await handleAssignPosition(s.studentId, newVal);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue placeholder="Chọn chức vụ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sinh viên</SelectItem>
                                  <SelectItem value="Lớp trưởng">Lớp trưởng</SelectItem>
                                  <SelectItem value="Lớp phó">Lớp phó</SelectItem>
                                  <SelectItem value="Bí thư">Bí thư</SelectItem>
                                </SelectContent>
                              </Select>
                            )}

                            {canModifyStudentsInClass && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary"
                                  onClick={() => openEditStudent(s)}
                                  title="Sửa thông tin"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive"
                                      title="Xóa sinh viên"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Xóa sinh viên?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bạn có chắc muốn xóa sinh viên <strong>{s.fullName} ({s.studentId})</strong> khỏi hệ thống? Dữ liệu này không thể khôi phục.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteStudent(s.id)} className="bg-destructive hover:bg-destructive/90">
                                        Xóa
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredClassStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Không tìm thấy sinh viên nào trong lớp học này.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedClass === null ? renderClassGrid() : renderClassDetail(selectedClass)}

      {/* Dialog: Create/Edit Class */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Cập nhật lớp học" : "Tạo lớp học mới"}</DialogTitle>
            <DialogDescription>Điền thông tin lớp học</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tên lớp *</Label>
              <Input 
                value={classForm.name} 
                onChange={e => setClassForm({ ...classForm, name: e.target.value })} 
                placeholder="Ví dụ: CD24CM1" 
              />
            </div>
            <div className="space-y-2">
              <Label>Khoa</Label>
              <Select 
                value={classForm.faculty} 
                onValueChange={val => setClassForm({ ...classForm, faculty: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {facultiesList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Khóa học</Label>
              <Input 
                value={classForm.cohort} 
                onChange={e => setClassForm({ ...classForm, cohort: e.target.value })} 
                placeholder="Ví dụ: K24"
              />
            </div>
            {canAssignAdvisor && (
              <div className="space-y-2">
                <Label>Cố vấn học tập</Label>
                <Select 
                  value={classForm.advisorId} 
                  onValueChange={val => setClassForm({ ...classForm, advisorId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cố vấn học tập (không bắt buộc)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân công</SelectItem>
                    {advisors.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveClass} className="bg-gradient-primary">
              {editingClass ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create/Edit Student */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Sửa thông tin sinh viên" : "Thêm sinh viên mới"}</DialogTitle>
            <DialogDescription>Nhập chi tiết thông tin sinh viên</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mã SV *</Label>
                <Input 
                  value={studentForm.studentId}
                  disabled={editingStudent !== null}
                  onChange={e => setStudentForm({ ...studentForm, studentId: e.target.value })}
                  placeholder="Ví dụ: 24102001"
                />
              </div>
              <div className="space-y-2">
                <Label>Họ và tên *</Label>
                <Input 
                  value={studentForm.fullName}
                  onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={studentForm.email}
                onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                placeholder="email@itc.edu.vn"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Giới tính</Label>
                <Select 
                  value={studentForm.gender} 
                  onValueChange={val => setStudentForm({ ...studentForm, gender: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input 
                  value={studentForm.phone}
                  onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })}
                  placeholder="0901234567"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveStudent} className="bg-gradient-primary">
              Lưu thông tin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple fallback Loading component locally to avoid import mismatches
function Loading({ message = "Đang tải dữ liệu..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
