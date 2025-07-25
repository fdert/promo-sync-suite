import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Settings, Users, Bot, CheckCircle } from "lucide-react";

const WhatsApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [businessHours, setBusinessHours] = useState(true);

  // Mock data for WhatsApp integration
  const recentMessages = [
    {
      id: 1,
      customer: "أحمد محمد",
      message: "مرحباً، أريد الاستفسار عن خدمات تطوير المواقع",
      time: "منذ 5 دقائق",
      status: "unread"
    },
    {
      id: 2,
      customer: "فاطمة علي",
      message: "شكراً لكم على الخدمة الممتازة",
      time: "منذ 15 دقيقة", 
      status: "read"
    },
    {
      id: 3,
      customer: "محمد حسن",
      message: "متى يمكنني استلام المشروع؟",
      time: "منذ ساعة",
      status: "replied"
    }
  ];

  const templates = [
    {
      id: 1,
      name: "رسالة ترحيب",
      content: "أهلاً وسهلاً بك! شكراً لتواصلك معنا. كيف يمكننا مساعدتك اليوم؟",
      usage: 45
    },
    {
      id: 2,
      name: "تأكيد الطلب",
      content: "تم استلام طلبك بنجاح. سيتم التواصل معك خلال 24 ساعة لمناقشة التفاصيل.",
      usage: 23
    },
    {
      id: 3,
      name: "تسليم المشروع",
      content: "نسعد بإعلامكم أن مشروعكم جاهز للتسليم. يرجى مراجعة الملفات المرفقة.",
      usage: 18
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge className="bg-destructive/10 text-destructive">غير مقروء</Badge>;
      case "read":
        return <Badge className="bg-warning/10 text-warning-foreground">مقروء</Badge>;
      case "replied":
        return <Badge className="bg-success/10 text-success">تم الرد</Badge>;
      default:
        return <Badge>غير محدد</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة WhatsApp Business</h1>
          <p className="text-muted-foreground">إدارة التواصل مع العملاء عبر واتساب</p>
        </div>
        <Button className="gap-2">
          <MessageCircle className="h-4 w-4" />
          إرسال رسالة جماعية
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            حالة الاتصال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">
                {isConnected ? "متصل بـ WhatsApp Business" : "غير متصل"}
              </span>
            </div>
            <Button 
              variant={isConnected ? "destructive" : "default"}
              onClick={() => setIsConnected(!isConnected)}
            >
              {isConnected ? "قطع الاتصال" : "ربط الحساب"}
            </Button>
          </div>
          {!isConnected && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning-foreground">
                لربط حساب WhatsApp Business، يرجى مسح رمز QR باستخدام تطبيق واتساب.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الرسائل اليوم</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+6 من أمس</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الرد</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground">خلال 24 ساعة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عملاء نشطين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الردود التلقائية</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">تم إرسالها اليوم</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>الرسائل الأخيرة</CardTitle>
            <CardDescription>آخر الرسائل الواردة من العملاء</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((message) => (
                <div key={message.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{message.customer}</h4>
                      {getStatusBadge(message.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{message.message}</p>
                    <p className="text-xs text-muted-foreground">{message.time}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Reply Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الرد التلقائي</CardTitle>
            <CardDescription>تخصيص الردود الآلية والرسائل المبرمجة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">تفعيل الرد التلقائي</Label>
                <p className="text-sm text-muted-foreground">رد تلقائي على الرسائل الواردة</p>
              </div>
              <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">ساعات العمل</Label>
                <p className="text-sm text-muted-foreground">رد تلقائي خارج ساعات العمل</p>
              </div>
              <Switch checked={businessHours} onCheckedChange={setBusinessHours} />
            </div>

            <div className="space-y-2">
              <Label>رسالة الترحيب</Label>
              <Textarea 
                placeholder="أدخل رسالة الترحيب التلقائية..."
                defaultValue="أهلاً وسهلاً بك! شكراً لتواصلك معنا. كيف يمكننا مساعدتك اليوم؟"
              />
            </div>

            <div className="space-y-2">
              <Label>رسالة خارج ساعات العمل</Label>
              <Textarea 
                placeholder="أدخل رسالة خارج ساعات العمل..."
                defaultValue="شكراً لتواصلك معنا. نحن خارج ساعات العمل حالياً. سنرد عليك في أقرب وقت."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle>قوالب الرسائل</CardTitle>
          <CardDescription>قوالب جاهزة للرسائل المتكررة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.content}</p>
                  <Badge variant="outline">استخدم {template.usage} مرة</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">تعديل</Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button className="w-full">إضافة قالب جديد</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsApp;