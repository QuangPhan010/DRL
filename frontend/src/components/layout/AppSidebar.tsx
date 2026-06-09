import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, ClipboardList, FileCheck, Settings, GraduationCap, User as UserIcon, Sparkles,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Role } from "@/lib/mock-data";

interface NavItem { title: string; url: string; icon: any; roles: Role[]; }

const navItems: NavItem[] = [
  { title: "Tổng quan", url: "/", icon: LayoutDashboard, roles: ["admin", "advisor", "student"] },
  { title: "Quản lý sinh viên", url: "/students", icon: Users, roles: ["admin", "advisor"] },
  { title: "Đánh giá điểm rèn luyện", url: "/evaluations", icon: ClipboardList, roles: ["admin", "advisor", "student"] },
  { title: "Xét duyệt", url: "/approvals", icon: FileCheck, roles: ["advisor", "admin"] },
  { title: "Điểm của tôi", url: "/my-scores", icon: UserIcon, roles: ["student"] },
  { title: "Tiêu chí đánh giá", url: "/criteria", icon: Sparkles, roles: ["admin"] },
  { title: "Cấu hình hệ thống", url: "/settings", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user } = useAuth();

  const items = navItems.filter(i => user && i.roles.includes(user.role));
  const isActive = (url: string) => url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-sidebar-foreground leading-tight">EduPoint</p>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
