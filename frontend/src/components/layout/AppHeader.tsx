import { useEffect, useState } from "react";
import { Bell, FileCheck, Loader2, LogOut, Search, User as UserIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { API_URL, useAuth } from "@/contexts/AuthContext";
import { normalizeSearch } from "@/lib/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const roleLabels = {
  admin: "Quản trị hệ thống",
  advisor: "Cố vấn học tập",
  student: "Sinh viên",
  organizer: "Đơn vị tổ chức",
  class_monitor: "Ban cán sự lớp",
  student_affairs: "Phòng Công tác SV",
  academic_affairs: "Phòng Đào tạo"
};

const notifications = [
  { id: 1, title: "Có 3 phiếu đánh giá mới chờ duyệt", time: "5 phút trước", unread: true },
  { id: 2, title: "Điểm rèn luyện HK1 đã được công bố", time: "2 giờ trước", unread: true },
  { id: 3, title: "Cập nhật tiêu chí đánh giá mới", time: "Hôm qua", unread: false },
];

interface GlobalSearchResult {
  id: string;
  kind: "student" | "evaluation";
  title: string;
  subtitle: string;
  target: string;
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.fullName.split(" ").slice(-2).map(n => n[0]).join("") ?? "U";
  const unreadCount = notifications.filter(n => n.unread).length;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const query = normalizeSearch(searchQuery);
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const token = localStorage.getItem("drl_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const evaluationUrl = user?.role === "student" && user.studentId
          ? `${API_URL}/evaluations/?studentId=${encodeURIComponent(user.studentId)}`
          : `${API_URL}/evaluations/`;
        const [studentsResponse, evaluationsResponse] = await Promise.all([
          fetch(`${API_URL}/students/`, { headers, signal: controller.signal }),
          fetch(evaluationUrl, { headers, signal: controller.signal }),
        ]);
        const students = studentsResponse.ok ? await studentsResponse.json() : [];
        const evaluations = evaluationsResponse.ok ? await evaluationsResponse.json() : [];
        const roles = user?.roles || (user?.role ? [user.role] : []);
        const ownStudent = (students || []).find(
          (student: any) => student.student_id === user?.studentId,
        );
        const scopedStudents = roles.includes("student") && !roles.includes("class_monitor")
          ? (students || []).filter((student: any) => student.student_id === user?.studentId)
          : roles.includes("class_monitor") && ownStudent?.class_name
            ? (students || []).filter((student: any) => student.class_name === ownStudent.class_name)
            : roles.includes("organizer") && roles.length === 1
              ? []
              : students;

        const studentResults: GlobalSearchResult[] = (scopedStudents || [])
          .filter((student: any) => normalizeSearch([
            student.student_id,
            student.full_name,
            student.class_name,
            student.email,
          ].join(" ")).includes(query))
          .slice(0, 5)
          .map((student: any) => ({
            id: `student-${student.id}`,
            kind: "student",
            title: `${student.student_id} · ${student.full_name}`,
            subtitle: student.class_name || student.email || "Sinh viên",
            target: roles.includes("student") && !roles.includes("class_monitor")
              ? "/profile"
              : roles.includes("academic_affairs")
                ? `/data-sync?search=${encodeURIComponent(student.student_id)}`
                : `/students?search=${encodeURIComponent(student.student_id)}`,
          }));

        const canSearchEvaluations = roles.some(role =>
          ["student", "advisor", "student_affairs", "admin"].includes(role)
        );
        const evaluationResults: GlobalSearchResult[] = canSearchEvaluations ? (evaluations || [])
          .filter((evaluation: any) => normalizeSearch([
            evaluation.student_id,
            evaluation.student_name,
            evaluation.class_name,
            evaluation.semester,
            evaluation.year,
            evaluation.classification,
          ].join(" ")).includes(query))
          .slice(0, 5)
          .map((evaluation: any) => ({
            id: `evaluation-${evaluation.id}`,
            kind: "evaluation",
            title: `${evaluation.semester} ${evaluation.year} · ${evaluation.total_score} điểm`,
            subtitle: `${evaluation.student_id} · ${evaluation.student_name}`,
            target: user?.role === "student"
              ? "/my-scores"
              : `/approvals?search=${encodeURIComponent(evaluation.student_id)}`,
          })) : [];

        setSearchResults([...studentResults, ...evaluationResults]);
        setSearchOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, user]);

  const openSearchResult = (result: GlobalSearchResult) => {
    setSearchOpen(false);
    navigate(result.target);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchResults.length > 0) {
      openSearchResult(searchResults[0]);
    } else if (searchQuery.trim()) {
      setSearchOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 backdrop-blur-md px-4 md:px-6">
      <SidebarTrigger className="text-foreground" />

      <div className="hidden md:flex items-center gap-2 max-w-md flex-1">
        <form className="relative w-full" onSubmit={submitSearch}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Tìm sinh viên, phiếu đánh giá..."
            className="pl-9 pr-9 bg-muted/40 border-0 focus-visible:ring-1"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[380px] overflow-hidden rounded-xl border bg-popover shadow-lg">
              {searching ? (
                <p className="p-4 text-sm text-muted-foreground">Đang tìm kiếm...</p>
              ) : searchResults.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openSearchResult(result)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {result.kind === "student"
                          ? <UserIcon className="h-4 w-4" />
                          : <FileCheck className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{result.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <p className="font-semibold">Thông báo</p>
              <p className="text-xs text-muted-foreground">{unreadCount} thông báo chưa đọc</p>
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${n.unread ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    {n.unread && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                {user?.avatar && <AvatarImage src={user.avatar} className="object-cover" />}
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground leading-tight">{user && roleLabels[user.role]}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
                <Badge variant="secondary" className="mt-1.5 text-xs">{user && roleLabels[user.role]}</Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserIcon className="mr-2 h-4 w-4" /> Trang cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { logout(); toast.success("Đã đăng xuất"); navigate("/login"); }}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
