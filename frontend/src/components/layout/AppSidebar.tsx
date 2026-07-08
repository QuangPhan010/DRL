import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileCheck, Settings, GraduationCap, User as UserIcon, Sparkles,
  CalendarDays, ClipboardCheck, ShieldAlert, Award, Clock, FileUp, ListChecks, Building2, FileText,
  ChevronDown, Home
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface NavItem { title: string; url: string; icon: any; roles: Role[]; }

const navItems: NavItem[] = [
  // 1. Tổng quan & Cá nhân
  { title: "Tổng quan", url: "/", icon: LayoutDashboard, roles: ["admin", "advisor", "student", "organizer", "class_monitor", "student_affairs", "academic_affairs"] },
  { title: "Điểm của tôi", url: "/my-scores", icon: UserIcon, roles: ["student"] },

  // 2. Tiêu chí & Phiên đánh giá (Cấu hình đợt đánh giá)
  { title: "Tiêu chí đánh giá", url: "/criteria", icon: Sparkles, roles: ["admin", "student_affairs", "student", "class_monitor", "advisor", "organizer", "academic_affairs"] },
  { title: "Tạo phiên đánh giá", url: "/evaluation-sessions/create", icon: ListChecks, roles: ["student_affairs", "admin"] },

  // 3. Xét duyệt & Rà soát (Workflow duyệt điểm)
  { title: "Rà soát lớp", url: "/class-review", icon: ClipboardCheck, roles: ["class_monitor"] },
  { title: "Xét duyệt", url: "/approvals", icon: FileCheck, roles: ["advisor", "student_affairs", "admin"] },

  // 4. Quản lý hoạt động
  { title: "Quản lý hoạt động", url: "/activities", icon: CalendarDays, roles: ["student", "organizer", "class_monitor", "advisor", "student_affairs", "admin"] },

  // 5. Nhập & Đồng bộ điểm học tập (Dữ liệu học lực)
  { title: "Nhập dữ liệu", url: "/academic-transcript-import", icon: FileUp, roles: ["academic_affairs", "admin"] },

  // 6. Báo cáo & cấu hình
  { title: "Báo cáo", url: "/reports", icon: FileText, roles: ["admin", "advisor", "student_affairs", "academic_affairs", "class_monitor"] },
  { title: "Cấu hình hệ thống", url: "/settings", icon: Settings, roles: ["admin"] },
];

const managementItems: NavItem[] = [
  { title: "Quản lý đơn vị", url: "/organizations", icon: Building2, roles: ["admin", "student_affairs", "organizer"] },
  { title: "Quản lý phòng", url: "/rooms", icon: Home, roles: ["admin", "student_affairs", "organizer", "advisor"] },
  { title: "Quản lý lớp & SV", url: "/classes", icon: GraduationCap, roles: ["admin", "advisor", "student_affairs", "academic_affairs"] },
];

function SystemClock({ collapsed }: { collapsed: boolean }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = time.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const currentDate = time.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  if (!collapsed) {
    return (
      <div className="mt-auto p-4 border-t border-sidebar-border bg-sidebar-accent/5">
        <div className="flex flex-col gap-1 items-center justify-center text-center">
          <span className="text-[9px] uppercase font-extrabold tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">Hệ thống (UTC+7)</span>
          <span className="font-mono text-base font-bold text-sidebar-foreground/90 mt-1">{currentTime}</span>
          <span className="text-[10px] text-sidebar-foreground/50">{currentDate}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto p-3 border-t border-sidebar-border flex justify-center text-sidebar-foreground/40" title={`Hệ thống (UTC+7): ${currentTime}`}>
      <Clock className="h-4 w-4" />
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user } = useAuth();
  
  // Set expanded by default if currently visiting any management URL
  const isCurrentlyInManagement = pathname.startsWith("/organizations") || pathname.startsWith("/rooms") || pathname.startsWith("/classes");
  const [isManagementExpanded, setIsManagementExpanded] = useState(isCurrentlyInManagement);

  useEffect(() => {
    if (isCurrentlyInManagement) {
      setIsManagementExpanded(true);
    }
  }, [pathname, isCurrentlyInManagement]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const items = navItems
    .filter(i => user && i.roles.some(r => userRoles.includes(r)))
    .map(i => {
      if (i.url === "/students" && userRoles.includes("class_monitor")) {
        return { ...i, title: "Thành viên lớp" };
      }
      return i;
    });

  const allowedManagementItems = managementItems.filter(
    i => user && i.roles.some(r => userRoles.includes(r))
  );

  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn("border-b border-sidebar-border transition-all duration-200", collapsed ? "p-1 flex justify-center h-[73px] items-center" : "p-4")}>
        <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "gap-3")}>
          <div className={cn("flex shrink-0 items-center justify-center rounded-xl overflow-hidden bg-background border shadow-sm transition-all duration-200", collapsed ? "h-8 w-8" : "h-10 w-10")}>
            <img src="/logo.jpg" alt="ITC Logo" className="h-full w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-sidebar-foreground leading-tight">ITC Point</p>
              <p className="text-xs text-sidebar-foreground/60">Quản lý điểm rèn luyện</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">Điều hướng</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="h-10 data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-medium hover:bg-sidebar-accent">
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && isActive(item.url) && <span className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {allowedManagementItems.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setIsManagementExpanded(!isManagementExpanded)}
                    className={cn(
                      "h-10 w-full flex items-center justify-between hover:bg-sidebar-accent data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-medium",
                      isCurrentlyInManagement && "bg-sidebar-accent/50 text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {!collapsed && <span>Quản lý</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isManagementExpanded ? "rotate-180" : "")} />
                    )}
                  </SidebarMenuButton>
                  
                  {isManagementExpanded && !collapsed && (
                    <div className="pl-4 mt-1 flex flex-col gap-1 border-l border-sidebar-border ml-4">
                      {allowedManagementItems.map((subItem) => (
                        <SidebarMenuButton 
                          key={subItem.url} 
                          asChild 
                          isActive={isActive(subItem.url)} 
                          className="h-9 data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-medium hover:bg-sidebar-accent"
                        >
                          <NavLink to={subItem.url}>
                            <subItem.icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{subItem.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SystemClock collapsed={collapsed} />
    </Sidebar>
  );
}
