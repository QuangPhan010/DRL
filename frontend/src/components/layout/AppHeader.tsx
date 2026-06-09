import { Bell, LogOut, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const roleLabels = { admin: "Quản trị viên", advisor: "Cố vấn học tập", student: "Sinh viên" };

const notifications = [
  { id: 1, title: "Có 3 phiếu đánh giá mới chờ duyệt", time: "5 phút trước", unread: true },
  { id: 2, title: "Điểm rèn luyện HK1 đã được công bố", time: "2 giờ trước", unread: true },
  { id: 3, title: "Cập nhật tiêu chí đánh giá mới", time: "Hôm qua", unread: false },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.fullName.split(" ").slice(-2).map(n => n[0]).join("") ?? "U";
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 backdrop-blur-md px-4 md:px-6">
      <SidebarTrigger className="text-foreground" />

      <div className="hidden md:flex items-center gap-2 max-w-md flex-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm sinh viên, phiếu đánh giá..." className="pl-9 bg-muted/40 border-0 focus-visible:ring-1" />
        </div>
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
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { logout(); toast.success("Đã đăng xuất"); navigate("/login"); }}>
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
