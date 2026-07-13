import { useEffect, useState } from "react";
import { Bell, FileCheck, Loader2, LogOut, Search, User as UserIcon, AlertTriangle, Award, ShieldAlert } from "lucide-react";
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
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => n.unread).length;

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("drl_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem("drl_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/${id}/mark-as-read/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("drl_token");
      if (!token) return;
      const res = await fetch(`${API_URL}/notifications/mark-all-read/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        toast.success("Đã đánh dấu đọc toàn bộ thông báo");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.action_url) {
      navigate(n.action_url);
    } else {
      const titleLower = n.title.toLowerCase();
      if (titleLower.includes("cần duyệt") || titleLower.includes("chờ phê duyệt") || titleLower.includes("chờ duyệt")) {
        if (user?.role === "class_monitor") {
          navigate("/class-review");
        } else {
          navigate("/approvals");
        }
      } else if (titleLower.includes("được duyệt") || titleLower.includes("trả lại") || titleLower.includes("công bố")) {
        navigate("/");
      }
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return date.toLocaleDateString("vi-VN");
    } catch (e) {
      return "Hôm nay";
    }
  };

  useEffect(() => {
    fetchNotifications();

    const token = localStorage.getItem("drl_token");
    if (!token) return;

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = window.location.host;
    // If backend is running on a different port/host than frontend, parse API_URL
    try {
      const url = new URL(API_URL);
      host = url.host;
    } catch (e) {
      console.warn("Invalid API_URL format, using current host.");
    }

    const wsUrl = `${wsProto}//${host}/ws/notifications/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotifications((prev) => [data, ...prev]);
        toast.info(`Thông báo mới: ${data.title}`);
      } catch (err) {
        console.error("Error parsing websocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("Notification WebSocket disconnected. Retrying in 5s...");
    };

    return () => {
      ws.close();
    };
  }, []);
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
              ? "/"
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

      <div className="flex-1" />

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
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <p className="font-semibold">Thông báo</p>
                <p className="text-xs text-muted-foreground">{unreadCount} thông báo chưa đọc</p>
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 text-xs text-primary font-bold hover:bg-transparent hover:text-primary/80" 
                  onClick={markAllAsRead}
                >
                  Đọc tất cả
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-auto">
              {notifications.map(n => {
                let IconComponent = Bell;
                let iconColor = "text-sky-500";
                let levelBg = "bg-sky-50 dark:bg-sky-950/20";
                
                if (n.type === "evaluation") {
                  IconComponent = FileCheck;
                  iconColor = "text-emerald-500";
                } else if (n.type === "activity") {
                  IconComponent = Award;
                  iconColor = "text-purple-500";
                } else if (n.type === "warning") {
                  IconComponent = ShieldAlert;
                  iconColor = "text-amber-500";
                }

                if (n.level === "success") {
                  levelBg = "bg-emerald-50/50 dark:bg-emerald-950/10";
                } else if (n.level === "warning") {
                  levelBg = "bg-amber-50/50 dark:bg-amber-950/10";
                } else if (n.level === "danger") {
                  IconComponent = AlertTriangle;
                  iconColor = "text-rose-500";
                  levelBg = "bg-rose-50/50 dark:bg-rose-950/10";
                }

                return (
                  <div 
                    key={n.id} 
                    className={`p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${n.unread ? "bg-primary/5" : ""} ${levelBg}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full shrink-0 ${n.unread ? "bg-background shadow-sm" : "bg-muted"}`}>
                        <IconComponent className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold truncate text-foreground">{n.title}</p>
                          {n.unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-2 font-medium">{formatTime(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Chưa có thông báo nào dành cho bạn.
                </div>
              )}
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
