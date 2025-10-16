import { useState, useEffect } from "react";
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
  Cog,
  Printer,
  Calculator,
  CreditCard,
  Star,
  MapPin,
  Tags,
  Activity,
  Send,
  Database as DatabaseIcon,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

type UserRole = Database['public']['Enums']['app_role'];

const menuItems = [
  {
    title: "الرئيسية",
    icon: Home,
    href: "/admin",
    allowedRoles: ['admin', 'manager', 'employee', 'accountant'] as UserRole[],
  },
  {
    title: "المستخدمين",
    icon: Users,
    href: "/admin/users",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "العملاء",
    icon: Users,
    href: "/admin/customers",
    allowedRoles: ['admin', 'manager', 'employee'] as UserRole[],
  },
  {
    title: "الطلبات",
    icon: ClipboardList,
    href: "/admin/orders",
    allowedRoles: ['admin', 'manager', 'employee'] as UserRole[],
  },
  {
    title: "الفواتير",
    icon: FileText,
    href: "/admin/invoices",
    allowedRoles: ['admin', 'manager', 'employee'] as UserRole[],
  },
  {
    title: "الحسابات",
    icon: DollarSign,
    href: "/admin/accounts",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "مراجعة الحسابات",
    icon: Calculator,
    href: "/admin/accounts-review",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "الحركة المالية للطلبات",
    icon: CreditCard,
    href: "/admin/financial-movements",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "العملاء المدينون",
    icon: Users,
    href: "/admin/accounts-receivable",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "المدفوعات حسب النوع",
    icon: CreditCard,
    href: "/admin/payments-by-type",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "التقارير",
    icon: BarChart3,
    href: "/admin/reports",
    allowedRoles: ['admin', 'manager', 'accountant'] as UserRole[],
  },
  {
    title: "التقييمات",
    icon: MessageSquare,
    href: "/admin/evaluations",
    allowedRoles: ['admin', 'manager', 'employee'] as UserRole[],
  },
  {
    title: "أنواع الخدمات",
    icon: Cog,
    href: "/admin/services",
    allowedRoles: ['admin'] as UserRole[],
  },
  {
    title: "قوالب الرسائل",
    icon: MessageSquare,
    href: "/admin/message-templates",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "إدارة التقييمات",
    icon: Star,
    href: "/admin/reviews-management",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "ربط خرائط جوجل",
    icon: MapPin,
    href: "/admin/google-maps-integration",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "إدارة الطباعة",
    icon: Printer,
    href: "/admin/print-management",
    allowedRoles: ['admin', 'manager', 'employee'] as UserRole[],
  },
  {
    title: "طباعة العملاء",
    icon: Users,
    href: "/admin/customer-print-orders",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "إدارة المتابعة",
    icon: MessageSquare,
    href: "/admin/follow-up-settings",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "ويب هوك",
    icon: Settings,
    href: "/admin/webhooks",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "موقع الوكالة",
    icon: Building2,
    href: "/admin/website",
    allowedRoles: ['admin'] as UserRole[],
  },
  {
    title: "إدارة الواتساب",
    icon: MessageSquare,
    href: "/admin/whatsapp",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "مراقب الواتساب",
    icon: MessageSquare,
    href: "/admin/whatsapp-monitor",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "إرسال جماعي",
    icon: Send,
    href: "/admin/bulk-whatsapp",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "مجموعات العملاء",
    icon: Users,
    href: "/admin/customer-groups",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "الإعدادات",
    icon: Settings,
    href: "/admin/settings",
    allowedRoles: ['admin'] as UserRole[],
  },
  {
    title: "إعدادات الملصق",
    icon: Tags,
    href: "/admin/barcode-settings",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "الفواتير الإلكترونية",
    icon: FileText,
    href: "/admin/electronic-invoice-settings",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
  {
    title: "النسخ الاحتياطي",
    icon: DatabaseIcon,
    href: "/admin/backup-management",
    allowedRoles: ['admin'] as UserRole[],
  },
  {
    title: "إعدادات نظام الولاء",
    icon: Gift,
    href: "/admin/loyalty-settings",
    allowedRoles: ['admin', 'manager'] as UserRole[],
  },
];

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState(menuItems);
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
        const filtered = menuItems.filter(item => {
          return item.allowedRoles.some(role => roles.includes(role));
        });
        setFilteredMenuItems(filtered);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    const fetchCompanyInfo = async () => {
      try {
        const { data } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', 'website_content')
          .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
          const websiteContent = data.value as any;
          setCompanyInfo(websiteContent.companyInfo);
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
            <div className="flex items-center gap-2">
              {companyInfo?.logo ? (
                <img src={companyInfo.logo} alt="شعار الشركة" className="w-8 h-8 object-contain rounded" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                  <Palette className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {companyInfo?.name || "وكالة الإبداع"}
                </h2>
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

export default Sidebar;