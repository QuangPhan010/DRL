import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Filter, Users as UsersIcon, GraduationCap, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { facultiesList, Student, ClassInfo } from "@/lib/mock-data";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Classes() {
  const { user, allUsers, fetchUsers } = useAuth();
  
  // State for Classes, Students
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("all");
  
  // Dialog controls
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [classForm, setClassForm] = useState<Omit<ClassInfo, "id">>({
    name: "",
    faculty: facultiesList[0],
    cohort: "K20",
    advisorId: "",
  });

  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [isViewStudentsOpen, setIsViewStudentsOpen] = useState(false);
  
  // Student dialog inside Class
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");

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

  // Role permissions checks
  const isAdmin = user?.role === "admin";
  const isAcademicAffairs = user?.role === "academic_affairs" || isAdmin;
  const isStudentAffairs = user?.role === "student_affairs" || isAdmin;
  const canCreateClass = isAcademicAffairs;
  const canModifyStudentsInClass = isAcademicAffairs;
  const canAssignAdvisor = isStudentAffairs || isAcademicAffairs;

  // Filter advisors from users
  const advisors = useMemo(() => allUsers.filter(u => u.role === "advisor"), [allUsers]);

  const isAdvisor = user?.role === "advisor";

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (isAdvisor && c.advisorId !== user?.id?.toString()) {
        return false;
      }
      const q = search.toLowerCase();
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.faculty.toLowerCase().includes(q);
      const matchF = facultyFilter === "all" || c.faculty === facultyFilter;
      return matchQ && matchF;
    });
  }, [classes, search, facultyFilter, isAdvisor, user]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass.name);
  }, [students, selectedClass]);

  // Candidates for adding to class (students not in any class or in different class)
  const addStudentCandidates = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className !== selectedClass.name);
  }, [students, selectedClass]);

  // Whether current user is the advisor for the selected class (or admin/affairs)
  const canAppointMonitor = useMemo(() => {
    if (!selectedClass || !user) return false;
    return selectedClass.advisorId === user.id?.toString() || user.role === "admin" || user.role === "student_affairs";
  }, [selectedClass, user]);

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
      advisorId: c.advisorId || "",
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
        toast.success(editingClass ? "Đã cập nhật lớp học thành công" : "Đã tạo lớp học mới thành công");
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

  const handleRemoveStudentFromClass = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`${API_URL}/classes/${selectedClass.id}/students/${studentId}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa sinh viên khỏi lớp");
        fetchStudents();
      } else {
        toast.error("Không thể xóa sinh viên khỏi lớp");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  const handleAddStudentToClass = async () => {
    if (!newStudentId || !selectedClass) {
      toast.error("Vui lòng chọn sinh viên");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/classes/${selectedClass.id}/students/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: newStudentId })
      });
      if (res.ok) {
        toast.success("Đã thêm sinh viên vào lớp thành công");
        setIsAddStudentOpen(false);
        setNewStudentId("");
        fetchStudents();
      } else {
        toast.error("Không thể thêm sinh viên vào lớp");
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

  const handleAssignMonitor = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`${API_URL}/classes/${selectedClass.id}/assign-monitor/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId })
      });
      if (res.ok) {
        toast.success(`Đã gán chức vụ Lớp trưởng cho sinh viên ${studentId}`);
        fetchUsers();
        fetchStudents();
      } else {
        toast.error("Không thể gán chức vụ Lớp trưởng");
      }
    } catch (err) {
      toast.error("Lỗi kết nối máy chủ");
    }
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
        toast.success(`Đã bổ nhiệm chức vụ ${positionName} thành công`);
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




  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-primary" /> Quản lý lớp học
          </h1>
          <p className="text-muted-foreground mt-1">Danh sách lớp học, phân công cố vấn học tập và quản lý thành viên lớp.</p>
        </div>
        {canCreateClass && (
          <Button onClick={openCreateClass} className="gap-2 bg-gradient-primary shadow-md">
            <Plus className="h-4 w-4" /> Tạo lớp học
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo tên lớp, khoa..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
            <div className="flex gap-3">
              <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                <SelectTrigger className="w-full lg:w-56">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Khoa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khoa</SelectItem>
                  {facultiesList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Tên lớp</TableHead>
                <TableHead>Khoa</TableHead>
                <TableHead>Khóa</TableHead>
                <TableHead>Sĩ số</TableHead>
                <TableHead>Cố vấn học tập</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map(c => {
                const classSize = students.filter(s => s.className === c.name).length;
                const advisor = advisors.find(a => a.id === c.advisorId);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell>{c.faculty}</TableCell>
                    <TableCell><Badge variant="secondary">{c.cohort}</Badge></TableCell>
                    <TableCell className="font-medium">{classSize} sinh viên</TableCell>
                    <TableCell>
                      {canAssignAdvisor ? (
                        <div className="w-60">
                          <Select 
                            value={c.advisorId || "unassigned"} 
                            onValueChange={val => handleQuickAssignAdvisor(c.id, val === "unassigned" ? "" : val)}
                          >
                            <SelectTrigger className="h-8 border-dashed hover:border-solid">
                              <SelectValue placeholder="Chưa phân công" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Chưa phân công</SelectItem>
                              {advisors.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        advisor ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{advisor.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Chưa phân công</span>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-primary hover:text-primary-glow"
                          onClick={() => { setSelectedClass(c); setIsViewStudentsOpen(true); }}
                        >
                          <UsersIcon className="h-4 w-4" /> Xem sinh viên
                        </Button>
                        {isAcademicAffairs && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEditClass(c)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Xóa lớp học?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bạn có chắc chắn muốn xóa lớp <strong>{c.name}</strong>? Các sinh viên trong lớp sẽ cần được phân bổ vào các lớp khác. Hành động này không thể hoàn tác.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteClass(c.id)} className="bg-destructive hover:bg-destructive/90">
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
              {filteredClasses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Không tìm thấy lớp học nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                placeholder="Ví dụ: CNTT-K20C" 
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
                placeholder="Ví dụ: K20"
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

      {/* Dialog: View Students in Class */}
      <Dialog open={isViewStudentsOpen} onOpenChange={setIsViewStudentsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-6">
              <span>Danh sách sinh viên lớp {selectedClass?.name}</span>
              {canModifyStudentsInClass && (
                <Button 
                  onClick={() => setIsAddStudentOpen(true)} 
                  size="sm" 
                  className="gap-2 bg-gradient-primary"
                >
                  <Plus className="h-4 w-4" /> Thêm sinh viên vào lớp
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Khoa: {selectedClass?.faculty} • Khóa: {selectedClass?.cohort}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-4 border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Mã SV</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Giới tính</TableHead>
                  {(canModifyStudentsInClass || canAppointMonitor) && <TableHead className="text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map(s => {
                  const studentUserObj = allUsers.find(u => u.studentId === s.studentId);
                  const isStudentMonitor = studentUserObj?.role === "class_monitor";
                  return (
                    <TableRow key={s.id}>
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
                            <span className="text-muted-foreground text-sm">Sinh viên</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                      <TableCell>{s.gender}</TableCell>
                      {(canModifyStudentsInClass || canAppointMonitor) && (
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
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveStudentFromClass(s.studentId)}
                                title="Xóa khỏi lớp"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canModifyStudentsInClass || canAppointMonitor ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      Chưa có sinh viên nào trong lớp này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setIsViewStudentsOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Student to Class */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm sinh viên vào lớp {selectedClass?.name}</DialogTitle>
            <DialogDescription>Chọn sinh viên từ danh sách chưa thuộc lớp này</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sinh viên</Label>
              <Select value={newStudentId} onValueChange={setNewStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn sinh viên để thêm..." />
                </SelectTrigger>
                <SelectContent>
                  {addStudentCandidates.map(s => (
                    <SelectItem key={s.id} value={s.studentId}>
                      {s.fullName} ({s.studentId}) {s.className ? `[Lớp hiện tại: ${s.className}]` : "[Chưa xếp lớp]"}
                    </SelectItem>
                  ))}
                  {addStudentCandidates.length === 0 && (
                    <SelectItem value="none" disabled>Không có sinh viên khả dụng</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>Hủy</Button>
            <Button onClick={handleAddStudentToClass} className="bg-gradient-primary">
              Xác nhận thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
