import { Bell, Search, User, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuClick?: () => void;
  title: string;
}

const Header = ({ onMenuClick, title }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const { data } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'website_content')
          .maybeSingle();

        if (data?.setting_value && typeof data.setting_value === 'object') {
          const websiteContent = data.setting_value as any;
          setCompanyInfo(websiteContent.companyInfo);
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchCompanyInfo();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {companyInfo?.logo ? (
              <img src={companyInfo.logo} alt="شعار الشركة" className="h-8 w-8 object-contain rounded" />
            ) : (
              <img src="/logo.png" alt="شعار الوكالة" className="h-8 w-8 object-contain rounded" />
            )}
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {companyInfo?.name && (
                <span className="text-xs text-muted-foreground">{companyInfo.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.user_metadata?.full_name || "المستخدم"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
              <DropdownMenuItem>الإعدادات</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;