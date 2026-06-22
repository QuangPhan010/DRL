import { useState, useMemo } from "react";
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
import { mockClasses, mockStudents, mockUsers, facultiesList, Student, ClassInfo } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Classes() {
  const { user } = useAuth();
  
  // State for Classes and Students
  const [classes, setClasses] = useState<ClassInfo[]>(mockClasses);
  const [students, setStudents] = useState<Student[]>(mockStudents);
  
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

  // Role permissions checks
  const isAdmin = user?.role === "admin";
  const isAcademicAffairs = user?.role === "academic_affairs" || isAdmin;
  const isStudentAffairs = user?.role === "student_affairs" || isAdmin;
  const canCreateClass = isAcademicAffairs;
  const canModifyStudentsInClass = isAcademicAffairs;
  const canAssignAdvisor = isStudentAffairs || isAcademicAffairs;

  // Filter advisors from users
  const advisors = useMemo(() => mockUsers.filter(u => u.role === "advisor"), []);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.faculty.toLowerCase().includes(q);
      const matchF = facultyFilter === "all" || c.faculty === facultyFilter;
      return matchQ && matchF;
    });
  }, [classes, search, facultyFilter]);

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

  const handleSaveClass = () => {
    if (!classForm.name) {
      toast.error("Vui lòng nhập tên lớp");
      return;
    }
    
    if (editingClass) {
      setClasses(classes.map(c => c.id === editingClass.id ? { ...c, ...classForm, advisorId: classForm.advisorId || undefined } : c));
      toast.success("Đã cập nhật lớp học thành công");
    } else {
      // Check duplicate
      if (classes.some(c => c.name.toLowerCase() === classForm.name.toLowerCase())) {
        toast.error("Tên lớp học đã tồn tại");
        return;
      }
      const newClass: ClassInfo = {
        id: `c-${Date.now()}`,
        ...classForm,
        advisorId: classForm.advisorId || undefined,
      };
      setClasses([...classes, newClass]);
      toast.success("Đã tạo lớp học mới thành công");
    }
    setIsClassDialogOpen(false);
  };

  const handleDeleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    toast.success("Đã xóa lớp học");
  };

  const handleRemoveStudentFromClass = (studentId: string) => {
    setStudents(students.map(s => s.studentId === studentId ? { ...s, className: "" } : s));
    toast.success("Đã xóa sinh viên khỏi lớp");
  };

  const handleAddStudentToClass = () => {
    if (!newStudentId || !selectedClass) {
      toast.error("Vui lòng chọn sinh viên");
      return;
    }
    setStudents(students.map(s => s.studentId === newStudentId ? { ...s, className: selectedClass.name } : s));
    toast.success("Đã thêm sinh viên vào lớp thành công");
    setIsAddStudentOpen(false);
    setNewStudentId("");
  };

  const handleQuickAssignAdvisor = (classId: string, advisorId: string) => {
    setClasses(classes.map(c => c.id === classId ? { ...c, advisorId: advisorId || undefined } : c));
    toast.success("Đã phân công cố vấn học tập");
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
                  <TableHead>Email</TableHead>
                  <TableHead>Giới tính</TableHead>
                  {canModifyStudentsInClass && <TableHead className="text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.studentId}</TableCell>
                    <TableCell>{s.fullName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                    <TableCell>{s.gender}</TableCell>
                    {canModifyStudentsInClass && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveStudentFromClass(s.studentId)}
                          title="Xóa khỏi lớp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canModifyStudentsInClass ? 5 : 4} className="text-center py-8 text-muted-foreground">
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
