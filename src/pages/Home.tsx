import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Globe, LogIn, Play, Star, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Home = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "وكالة ابداع واحتراف للدعاية والاعلان",
    tagline: "نبني الأحلام بالإبداع والاحتراف",
    logo: "https://gcuqfxacnbxdldsbmgvf.supabase.co/storage/v1/object/public/logos/logo-1754189656106.jpg"
  });
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // جلب بيانات الشركة من قاعدة البيانات
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const { data } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'website_content')
          .maybeSingle();

        if (data?.setting_value && typeof data.setting_value === 'object') {
          const settingValue = data.setting_value as any;
          const company = settingValue.companyInfo;
          
          if (company) {
            setCompanyInfo({
              name: company.name || "وكالة ابداع واحتراف للدعاية والاعلان",
              tagline: company.tagline || "نبني الأحلام بالإبداع والاحتراف",
              logo: company.logo || "https://gcuqfxacnbxdldsbmgvf.supabase.co/storage/v1/object/public/logos/logo-1754189656106.jpg"
            });
          }
        }
      } catch (error) {
        console.error('خطأ في تحميل بيانات الشركة:', error);
      }
    };

    loadCompanyData();
  }, []);

  // إعادة توجيه المستخدم المسجل دخوله
  useEffect(() => {
    if (user) {
      getUserRole();
    }
  }, [user]);

  const getUserRole = async () => {
    if (!user) return;
    
    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!userRoles || userRoles.length === 0) {
        navigate('/user');
        return;
      }

      // فحص الأدوار بترتيب الأولوية
      const roles = userRoles.map(r => r.role);
      
      if (roles.includes('admin') || roles.includes('manager')) {
        navigate('/admin');
      } else if (roles.includes('employee')) {
        navigate('/employee');
      } else {
        navigate('/user');
      }
    } catch (error) {
      // إذا لم يكن للمستخدم دور محدد، توجيهه إلى لوحة المستخدم العادي
      navigate('/user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("خطأ في تسجيل الدخول. يرجى التحقق من البيانات");
      } else {
        toast.success("تم تسجيل الدخول بنجاح");
        // التوجيه سيتم تلقائياً من خلال useEffect
      }
    } catch (error) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20" dir="rtl">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <img 
                src={companyInfo.logo} 
                alt="شعار الشركة" 
                className="w-24 h-24 object-contain drop-shadow-lg rounded-lg"
                onError={(e) => {
                  // في حالة فشل تحميل الصورة، استخدم الشعار الافتراضي
                  e.currentTarget.src = logo;
                }}
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-amiri font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight text-center whitespace-nowrap px-1">
                {companyInfo.name}
              </h1>
              <p className="text-lg font-cairo font-medium text-muted-foreground">
                {companyInfo.tagline}
              </p>
              <p className="text-sm text-muted-foreground">
                نظام إدارة شامل ومتطور
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-cairo font-semibold text-foreground flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                تسجيل الدخول
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-cairo font-medium">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="font-cairo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-cairo font-medium">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="font-cairo pl-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full font-cairo font-semibold text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
                </Button>
              </form>

              {/* Customer Portal and Agency Links */}
              <div className="pt-4 border-t space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full font-cairo font-medium"
                  asChild
                >
                  <Link to="/customer-portal" className="flex items-center justify-center gap-2">
                    <Star className="w-4 h-4" />
                    استكشف النظام والباقات
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full font-cairo font-medium text-sm"
                  asChild
                >
                  <Link to="/agency-login" className="flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" />
                    دخول الوكالة
                  </Link>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="w-full font-cairo font-medium text-xs"
                  asChild
                >
                  <Link to="/system/auth" className="flex items-center justify-center gap-2">
                    <Shield className="w-3 h-3" />
                    إدارة النظام
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground font-cairo">
              © 2024 {companyInfo.name}
            </p>
            <p className="text-xs text-muted-foreground">
              جميع الحقوق محفوظة
            </p>
            <p className="text-xs text-muted-foreground/80 font-cairo mt-2">
              تصميم وفكرة عبدالمحسن الميلبي
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;