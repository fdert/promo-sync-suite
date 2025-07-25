import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  ClipboardList,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
  Palette,
  ChevronLeft,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: "الرئيسية",
    icon: Home,
    href: "/admin",
  },
  {
    title: "العملاء",
    icon: Users,
    href: "/admin/customers",
  },
  {
    title: "الطلبات",
    icon: ClipboardList,
    href: "/admin/orders",
  },
  {
    title: "الفواتير",
    icon: FileText,
    href: "/admin/invoices",
  },
  {
    title: "الحسابات",
    icon: DollarSign,
    href: "/admin/accounts",
  },
  {
    title: "التقارير",
    icon: BarChart3,
    href: "/admin/reports",
  },
  {
    title: "رسائل WhatsApp",
    icon: MessageSquare,
    href: "/admin/whatsapp",
  },
  {
    title: "موقع الوكالة",
    icon: Building2,
    href: "/admin/website",
  },
  {
    title: "الإعدادات",
    icon: Settings,
    href: "/admin/settings",
  },
];

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <aside
      className={cn(
        "bg-white border-r border-border shadow-sm transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">وكالة الإبداع</h2>
                <p className="text-xs text-muted-foreground">للدعاية والإعلان</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground",
                    collapsed && "justify-center"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="text-xs text-muted-foreground text-center">
            نظام إدارة الوكالة v1.0
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;