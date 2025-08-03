import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, LogIn, UserPlus, AlertCircle, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "", 
    fullName: "" 
  });
  const [adminForm, setAdminForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "", 
    fullName: "",
    role: "admin"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyInfo, setCompanyInfo] = useState({
    name: "وكالة الإبداع للدعاية والإعلان",
    tagline: "نبني الأحلام بالإبداع والاحتراف",
    logo: null
  });

  const { signIn, signUp, signUpAdmin, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // جلب بيانات الشركة
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        console.log('جاري جلب بيانات الشركة...');
        const { data, error } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'website_content')
          .single();

        console.log('استجابة قاعدة البيانات:', { data, error });

        if (!error && data?.setting_value && typeof data.setting_value === 'object') {
          const settingValue = data.setting_value as any;
          const companyData = settingValue.companyInfo;
          
          console.log('بيانات الشركة المستخرجة:', companyData);
          
          if (companyData) {
            const newCompanyInfo = {
              name: companyData.name || "وكالة ابداع واحتراف للدعاية والاعلان",
              tagline: companyData.tagline || "نبني الأحلام بالإبداع والاحتراف",
              logo: companyData.logo || null
            };
            
            console.log('بيانات الشركة الجديدة:', newCompanyInfo);
            setCompanyInfo(newCompanyInfo);
          }
        }
      } catch (error) {
        console.error('خطأ في جلب بيانات الشركة:', error);
        // في حالة الخطأ، استخدم البيانات الافتراضية
        setCompanyInfo({
          name: "وكالة ابداع واحتراف للدعاية والاعلان",
          tagline: "نبني الأحلام بالإبداع والاحتراف",
          logo: null
        });
      }
    };

    fetchCompanyInfo();
  }, []);

  // إعادة توجيه المستخدمين المسجلين إلى لوحة الإدارة
  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!loginForm.email || !loginForm.password) {
      setError("يرجى ملء جميع الحقول");
      setLoading(false);
      return;
    }

    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (error) {
      setError("بيانات تسجيل الدخول غير صحيحة");
    } else {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في النظام"
      });
      navigate("/admin");
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!signupForm.email || !signupForm.password || !signupForm.fullName) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      setLoading(false);
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقتان");
      setLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setLoading(false);
      return;
    }

    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    
    if (error) {
      if (error.message.includes("User already registered")) {
        setError("البريد الإلكتروني مسجل مسبقاً");
      } else {
        setError("حدث خطأ أثناء التسجيل");
      }
    } else {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "يرجى تفعيل حسابك من البريد الإلكتروني"
      });
      // سيتم توجيه المستخدم تلقائياً بعد تأكيد البريد
    }
    
    setLoading(false);
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!adminForm.email || !adminForm.password || !adminForm.fullName || !adminForm.role) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      setLoading(false);
      return;
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقتان");
      setLoading(false);
      return;
    }

    if (adminForm.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setLoading(false);
      return;
    }

    const { error } = await signUpAdmin(adminForm.email, adminForm.password, adminForm.fullName, adminForm.role);
    
    if (error) {
      if (error.message.includes("User already registered")) {
        setError("البريد الإلكتروني مسجل مسبقاً");
      } else {
        setError("حدث خطأ أثناء التسجيل");
      }
    } else {
      toast({
        title: "تم إنشاء حساب الموظف بنجاح",
        description: `تم إنشاء حساب ${adminForm.role === 'admin' ? 'مدير' : adminForm.role === 'manager' ? 'مسؤول' : 'موظف'} بنجاح`
      });
      setAdminForm({ 
        email: "", 
        password: "", 
        confirmPassword: "", 
        fullName: "",
        role: "admin"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-2 sm:p-4 md:p-6">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg shadow-2xl border-0 bg-card/50 backdrop-blur-sm mx-2">
        <CardHeader className="text-center pb-4 sm:pb-6 md:pb-8 px-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            {companyInfo.logo ? (
              <div className="relative">
                <img 
                  src={companyInfo.logo} 
                  alt="شعار الشركة"
                  className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 object-contain rounded-xl sm:rounded-2xl bg-white p-2 sm:p-3 shadow-xl sm:shadow-2xl ring-2 sm:ring-4 ring-primary/10"
                  onError={(e) => {
                    console.error('خطأ في تحميل الشعار:', e);
                  }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-r from-primary to-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl sm:shadow-2xl ring-2 sm:ring-4 ring-primary/10">
                <Palette className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-white" />
              </div>
            )}
            
            <div className="text-center space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground leading-tight px-2" style={{ fontFamily: 'Cairo, Tajawal, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                {companyInfo.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-semibold leading-relaxed px-2" style={{ fontFamily: 'Cairo, Tajawal, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                {companyInfo.tagline}
              </p>
              <div className="w-12 sm:w-14 md:w-16 h-0.5 sm:h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto"></div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6" style={{ fontFamily: 'Cairo, Tajawal, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg sm:rounded-xl h-auto">
              <TabsTrigger value="login" className="gap-1 sm:gap-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md py-2 sm:py-2.5 flex-col sm:flex-row">
                <LogIn className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
                <span className="sm:hidden">دخول</span>
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-1 sm:gap-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md py-2 sm:py-2.5 flex-col sm:flex-row">
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">إنشاء حساب</span>
                <span className="sm:hidden">حساب</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-1 sm:gap-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md py-2 sm:py-2.5 flex-col sm:flex-row">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">تسجيل موظف</span>
                <span className="sm:hidden">موظف</span>
              </TabsTrigger>
            </TabsList>
            
            {error && (
              <Alert variant="destructive" className="mt-4 sm:mt-6 border-destructive/20 bg-destructive/5 mx-2 sm:mx-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <AlertDescription className="text-xs sm:text-sm font-medium leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login" className="space-y-6 mt-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl font-bold text-right">تسجيل الدخول</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground text-right font-medium leading-relaxed">
                    أدخل بيانات حسابك للوصول إلى النظام
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-sm font-semibold text-right block">البريد الإلكتروني</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="أدخل بريدك الإلكتروني"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="login-password" className="text-sm font-semibold text-right block">كلمة المرور</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl" disabled={loading}>
                  {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6 mt-6">
              <form onSubmit={handleSignup} className="space-y-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl font-bold text-right">إنشاء حساب جديد</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground text-right font-medium leading-relaxed">
                    أنشئ حسابك الجديد للانضمام إلى النظام
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-3">
                  <Label htmlFor="signup-name" className="text-sm font-semibold text-right block">الاسم الكامل</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-right block">البريد الإلكتروني</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="أدخل بريدك الإلكتروني"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-right block">كلمة المرور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="signup-confirm" className="text-sm font-semibold text-right block">تأكيد كلمة المرور</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl" disabled={loading}>
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-6 mt-6">
              <form onSubmit={handleAdminSignup} className="space-y-6">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-xl font-bold text-right">تسجيل موظف إداري</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground text-right font-medium leading-relaxed">
                    إنشاء حساب جديد للموظفين والإدارة
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-3">
                  <Label htmlFor="admin-name" className="text-sm font-semibold text-right block">الاسم الكامل</Label>
                  <Input
                    id="admin-name"
                    type="text"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    placeholder="أدخل اسم الموظف الكامل"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="admin-email" className="text-sm font-semibold text-right block">البريد الإلكتروني</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="أدخل بريد الموظف الإلكتروني"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="admin-role" className="text-sm font-semibold text-right block">نوع الحساب</Label>
                  <Select 
                    value={adminForm.role} 
                    onValueChange={(value) => setAdminForm({ ...adminForm, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors">
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                      <SelectItem value="manager">مدير</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="admin-password" className="text-sm font-semibold text-right block">كلمة المرور</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="admin-confirm" className="text-sm font-semibold text-right block">تأكيد كلمة المرور</Label>
                  <Input
                    id="admin-confirm"
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                    disabled={loading}
                    className="h-12 text-base font-medium rounded-xl border-2 focus:border-primary transition-colors"
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl" disabled={loading}>
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب موظف"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;