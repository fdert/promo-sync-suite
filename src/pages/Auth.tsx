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
        const { data, error } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'website_content')
          .single();

        if (!error && data?.setting_value && typeof data.setting_value === 'object') {
          const settingValue = data.setting_value as any;
          const companyData = settingValue.companyInfo;
          
          if (companyData) {
            setCompanyInfo({
              name: companyData.name || "وكالة الإبداع للدعاية والإعلان",
              tagline: companyData.tagline || "نبني الأحلام بالإبداع والاحتراف",
              logo: companyData.logo || null
            });
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex flex-col items-center gap-4 mb-4">
            {companyInfo.logo ? (
              <div className="relative">
                <img 
                  src={companyInfo.logo} 
                  alt="شعار الشركة"
                  className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-lg"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <Palette className="h-8 w-8 text-white" />
              </div>
            )}
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {companyInfo.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {companyInfo.tagline}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="h-4 w-4" />
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-2">
                <UserPlus className="h-4 w-4" />
                إنشاء حساب
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                تسجيل موظف
              </TabsTrigger>
            </TabsList>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <CardHeader className="px-0 pb-4">
                  <CardTitle>تسجيل الدخول</CardTitle>
                  <CardDescription>
                    أدخل بيانات حسابك للوصول إلى النظام
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-2">
                  <Label htmlFor="login-email">البريد الإلكتروني</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="أدخل بريدك الإلكتروني"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">كلمة المرور</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور"
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <CardHeader className="px-0 pb-4">
                  <CardTitle>إنشاء حساب جديد</CardTitle>
                  <CardDescription>
                    أنشئ حسابك الجديد للانضمام إلى النظام
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-name">الاسم الكامل</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="أدخل بريدك الإلكتروني"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">كلمة المرور</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">تأكيد كلمة المرور</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminSignup} className="space-y-4">
                <CardHeader className="px-0 pb-4">
                  <CardTitle>تسجيل موظف إداري</CardTitle>
                  <CardDescription>
                    إنشاء حساب جديد للموظفين والإدارة
                  </CardDescription>
                </CardHeader>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-name">الاسم الكامل</Label>
                  <Input
                    id="admin-name"
                    type="text"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    placeholder="أدخل اسم الموظف الكامل"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-email">البريد الإلكتروني</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="أدخل بريد الموظف الإلكتروني"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-role">نوع الحساب</Label>
                  <Select 
                    value={adminForm.role} 
                    onValueChange={(value) => setAdminForm({ ...adminForm, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                      <SelectItem value="manager">مدير</SelectItem>
                      <SelectItem value="employee">موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password">كلمة المرور</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-confirm">تأكيد كلمة المرور</Label>
                  <Input
                    id="admin-confirm"
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    placeholder="أعد إدخال كلمة المرور"
                    disabled={loading}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
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