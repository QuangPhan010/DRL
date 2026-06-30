import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Filter, Download, Users as UsersIcon } from "lucide-react";
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
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
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

  const isMonitor = user?.role === "class_monitor";

  // Dynamically extract unique values from database records
  const dynamicFaculties = useMemo(() => {
    return Array.from(new Set(students.map(s => s.faculty).filter(Boolean)));
  }, [students]);

  const availableMajors = useMemo(() => {
    const allUniqueMajors = Array.from(new Set(students.map(s => getStudentMajor(s.studentId, s.faculty, s.className)).filter(Boolean)));
    if (facultyFilter === "all") {
      return allUniqueMajors;
    }
    const facultyData = getFacultyData(facultyFilter);
    if (!facultyData) return [];
    const allowed = facultyData.majors.map(m => m.name.toLowerCase().trim());
    return allUniqueMajors.filter(m => allowed.includes(m.toLowerCase().trim()));
  }, [students, facultyFilter]);

  const availablePrograms = useMemo(() => {
    const allUniquePrograms = Array.from(new Set(students.map(s => {
      const major = getStudentMajor(s.studentId, s.faculty, s.className);
      return getStudentProgram(s.studentId, s.faculty, major, s.className);
    }).filter(Boolean)));

    if (majorFilter === "all") {
      if (facultyFilter !== "all") {
        const facultyData = getFacultyData(facultyFilter);
        if (facultyData) {
          const allowedProgs: string[] = [];
          facultyData.majors.forEach(m => {
            m.programs.forEach(p => {
              if (!allowedProgs.includes(p)) allowedProgs.push(p);
            });
          });
          return allUniquePrograms.filter(p => allowedProgs.map(ap => ap.toLowerCase().trim()).includes(p.toLowerCase().trim()));
        }
      }
      return allUniquePrograms;
    }

    let foundMajor: any = null;
    for (const f of FACULTY_HIERARCHY) {
      const m = f.majors.find(maj => maj.name.toLowerCase().trim() === majorFilter.toLowerCase().trim());
      if (m) {
        foundMajor = m;
        break;
      }
    }
    if (!foundMajor) return [];
    const allowed = foundMajor.programs.map((p: string) => p.toLowerCase().trim());
    return allUniquePrograms.filter(p => allowed.includes(p.toLowerCase().trim()));
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
          phone: s.phone
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

    try {
      const res = await fetch(`${API_URL}/students/import-excel/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const createdCount = data.created_count !== undefined ? data.created_count : 0;
        if (createdCount === 0) {
          toast.warning("File xử lý thành công nhưng không có sinh viên mới nào được thêm. Vui lòng kiểm tra xem tiêu đề các cột (Mã SV, Họ và tên, Email) đã khớp chưa hoặc dữ liệu đã tồn tại.");
        } else {
          toast.success(`Nhập thành công ${createdCount} sinh viên mới!`);
        }
        fetchStudents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Không thể nhập danh sách sinh viên");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
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
          <div className="flex gap-2">
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

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-muted/10 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm theo tên, mã SV, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
          </div>
          
          {!isMonitor && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
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
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Mã SV</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead className="hidden md:table-cell">Lớp</TableHead>
                <TableHead className="hidden lg:table-cell">Khoa</TableHead>
                <TableHead className="hidden md:table-cell">Giới tính</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                {!isMonitor && <TableHead className="text-right">Thao tác</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const major = getStudentMajor(s.studentId, s.faculty || "", s.className);
                const program = getStudentProgram(s.studentId, s.faculty || "", major, s.className);
                const level = getStudentLevel(s.studentId, program, s.className);
                const club = getStudentClub(s.studentId);

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
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0 bg-transparent border-dashed">
                              {major}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0 bg-transparent border-dashed">
                              {program}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0 bg-transparent border-dashed">
                              {level}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0 bg-transparent border-dashed">
                              {club}
                            </Badge>
                          </div>
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
                <TableRow><TableCell colSpan={isMonitor ? 6 : 7} className="text-center py-12 text-muted-foreground">Không tìm thấy sinh viên nào</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>Hiển thị {filtered.length} / {isMonitor ? filtered.length : students.length} sinh viên</span>
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
