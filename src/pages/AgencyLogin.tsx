import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, LogIn, ArrowLeft, Globe, Star, Users, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AgencyLogin = () => {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        description: "مرحباً بك في نظام إدارة الوكالات"
      });
      navigate("/admin");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">العودة للرئيسية</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div className="text-right">
                <h1 className="text-xl font-bold text-foreground">نظام إدارة وكالات الدعاية والإعلان</h1>
                <p className="text-sm text-muted-foreground">حلول متقدمة لإدارة أعمالك</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <LogIn className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">تسجيل دخول الوكالة</CardTitle>
                <CardDescription className="text-base mt-2">
                  ادخل إلى نظام إدارة وكالتك
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="أدخل بريدك الإلكتروني"
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-2 focus:border-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="أدخل كلمة المرور"
                    disabled={loading}
                    className="h-12 text-base rounded-xl border-2 focus:border-primary"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={loading}
                >
                  {loading ? "جاري تسجيل الدخول..." : "دخول"}
                </Button>
              </form>
              
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  ليس لديك حساب؟
                </p>
                <Link to="/subscription">
                  <Button variant="outline" className="w-full h-11 rounded-xl border-2 hover:bg-primary/5">
                    اشترك الآن واحصل على حسابك
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Features */}
        <div className="flex-1 bg-gradient-to-br from-primary/10 to-accent/10 p-6 flex flex-col justify-center">
          <div className="max-w-lg mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-foreground">
                مميزات نظام إدارة الوكالات
              </h2>
              <p className="text-lg text-muted-foreground">
                كل ما تحتاجه لإدارة وكالتك بكفاءة عالية
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">إدارة متعددة الوكالات</h3>
                  <p className="text-sm text-muted-foreground">إدارة عدة وكالات من حساب واحد مع نظام صلاحيات متقدم</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">أمان وحماية عالية</h3>
                  <p className="text-sm text-muted-foreground">حماية بيانات العملاء والمشاريع بأحدث معايير الأمان</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">تقارير وإحصائيات متقدمة</h3>
                  <p className="text-sm text-muted-foreground">تقارير شاملة ومفصلة لمتابعة أداء وكالتك</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl backdrop-blur-sm">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">واجهة سهلة الاستخدام</h3>
                  <p className="text-sm text-muted-foreground">تصميم عصري وسهل التنقل يناسب جميع المستخدمين</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link to="/subscription">
                <Button className="bg-gradient-to-r from-primary to-accent text-white px-8 py-3 rounded-xl text-lg font-semibold hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl">
                  تصفح باقات الاشتراك
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyLogin;