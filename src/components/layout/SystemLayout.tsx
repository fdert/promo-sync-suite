import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Building2, Users, CreditCard, Settings, BarChart3, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const SystemLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SystemSidebar />
        <div className="flex-1 flex flex-col">
          <SystemHeader onMenuClick={toggleSidebar} />
          <main className="flex-1 p-6 bg-gray-50">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const SystemSidebar = () => {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    {
      title: "لوحة التحكم",
      url: "/system",
      icon: BarChart3
    },
    {
      title: "إدارة الوكالات",
      url: "/system/agencies",
      icon: Building2
    },
    {
      title: "إدارة المستخدمين",
      url: "/system/users",
      icon: Users
    },
    {
      title: "خطط الاشتراك",
      url: "/system/subscription-plans",
      icon: CreditCard
    },
    {
      title: "إعدادات النظام",
      url: "/system/settings",
      icon: Settings
    }
  ];

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (path: string) =>
    isActive(path)
      ? "bg-primary text-primary-foreground font-medium"
      : "hover:bg-muted/50";

  return (
    <Sidebar className={open ? "w-60" : "w-14"}>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-6 w-6 text-red-600" />
            {!open && (
              <div>
                <h2 className="text-lg font-bold">إدارة النظام</h2>
                <Badge variant="destructive" className="text-xs">
                  مدير عام
                </Badge>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!open && <span>{item.title}</span>}
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
};

interface SystemHeaderProps {
  onMenuClick: () => void;
}

const SystemHeader = ({ onMenuClick }: SystemHeaderProps) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger onClick={onMenuClick} />
        <div>
          <h1 className="text-xl font-semibold">نظام إدارة الوكالات الإعلانية</h1>
          <p className="text-sm text-muted-foreground">لوحة تحكم المدير العام</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Badge variant="destructive">
          <Shield className="h-3 w-3 mr-1" />
          مدير النظام
        </Badge>
        <Button variant="outline" onClick={handleSignOut}>
          تسجيل الخروج
        </Button>
      </div>
    </header>
  );
};

export default SystemLayout;