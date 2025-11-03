import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  ClipboardList,
  FileText,
  MessageSquare,
  ChevronLeft,
  Palette,
  Printer,
  TrendingUp,
  Archive,
  Settings,
  Calculator,
  Send,
  CreditCard,
  Gift,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['app_role'];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const employeeMenuItems = [
  {
    title: "الرئيسية",
    icon: Home,
    href: "/employee",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "العملاء",
    icon: Users,
    href: "/employee/customers",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "الطلبات",
    icon: ClipboardList,
    href: "/employee/orders",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "المهام اليومية",
    icon: CheckSquare,
    href: "/employee/daily-tasks",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "أنواع الخدمات",
    icon: Settings,
    href: "/employee/service-types",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "الفواتير",
    icon: FileText,
    href: "/employee/invoices",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "طلبات الطباعة",
    icon: Printer,
    href: "/employee/print-orders",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "التقييمات",
    icon: MessageSquare,
    href: "/employee/evaluations",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "أرشيف الطباعة",
    icon: Archive,
    href: "/employee/print-archive",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "التقارير المالية",
    icon: TrendingUp,
    href: "/employee/financial-reports",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "العملاء المدينون",
    icon: TrendingUp,
    href: "/employee/accounts-overview",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "الحركة المالية للطلبات",
    icon: TrendingUp,
    href: "/employee/financial-movements",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "إدارة مدفوعات الطلبات",
    icon: CreditCard,
    href: "/employee/order-payments",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "إرسال جماعي",
    icon: Send,
    href: "/employee/bulk-whatsapp",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "حاسبة التسعيرات الأولية",
    icon: Calculator,
    href: "/employee/pricing-calculator",
    allowedRoles: ['employee'] as UserRole[],
  },
  {
    title: "نظام الولاء",
    icon: Gift,
    href: "/employee/loyalty",
    allowedRoles: ['employee'] as UserRole[],
  },
];

const EmployeeSidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState(employeeMenuItems);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roles = data?.map(r => r.role as UserRole) || [];
        setUserRoles(roles);

        // فلترة عناصر القائمة حسب الأدوار
        const filtered = employeeMenuItems.filter(item => {
          return item.allowedRoles.some(role => roles.includes(role));
        });
        setFilteredMenuItems(filtered);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    const fetchCompanyInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', 'website_content')
          .maybeSingle();

        if (error) {
          console.error('Error fetching company info:', error);
          return;
        }

        if (data?.value) {
          // تحويل النص إلى JSON إذا كانت القيمة نص
          const websiteContent = typeof data.value === 'string'
            ? JSON.parse(data.value)
            : data.value;
          
          setCompanyInfo(websiteContent?.companyInfo || {
            name: "وكالة الإبداع",
            logo: "",
            subtitle: "للدعاية والإعلان"
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchUserRoles();
    fetchCompanyInfo();
  }, [user]);

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
            <div className="flex items-center gap-3">
              {companyInfo?.logo ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shadow-sm p-1">
                  <img 
                    src={companyInfo.logo} 
                    alt="شعار الشركة" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center shadow-sm">
                  <Palette className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-foreground leading-tight">
                  {companyInfo?.name || "وكالة الإبداع"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {companyInfo?.subtitle || "للدعاية والإعلان"}
                </p>
              </div>
            </div>
          )}
          {collapsed && companyInfo?.logo && (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm p-1 mx-auto">
              <img 
                src={companyInfo.logo} 
                alt="شعار الشركة" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
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
          {filteredMenuItems.map((item) => (
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

export default EmployeeSidebar;