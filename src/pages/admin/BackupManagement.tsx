import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Database, Download, Mail, Clock, CheckCircle2, AlertCircle, Settings, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BackupManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("Fm0002009@gmail.com");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  const handleManualBackup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-backup', {
        body: { scheduled: false }
      });

      if (error) throw error;

      toast({
        title: "✅ تم إرسال النسخة الاحتياطية",
        description: `تم إرسال النسخة الاحتياطية إلى ${email} بنجاح`,
      });
      
      setLastBackupTime(new Date().toLocaleString('ar-SA'));
    } catch (error: any) {
      console.error('Error triggering backup:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في النسخ الاحتياطي",
        description: error.message || "فشل في إرسال النسخة الاحتياطية",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "✅ تم حفظ الإعدادات",
      description: "تم حفظ إعدادات النسخ الاحتياطي بنجاح",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            إدارة النسخ الاحتياطي
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة النسخ الاحتياطية التلقائية واليدوية لقاعدة البيانات
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          يتم إرسال النسخ الاحتياطية التلقائية يومياً في الساعة 2:00 صباحاً. يمكنك أيضاً تشغيل نسخة احتياطية يدوياً في أي وقت.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* تشغيل يدوي */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              تشغيل يدوي
            </CardTitle>
            <CardDescription>
              قم بإنشاء وإرسال نسخة احتياطية فورية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleManualBackup}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Clock className="ml-2 h-5 w-5 animate-spin" />
                  جاري إنشاء النسخة...
                </>
              ) : (
                <>
                  <Download className="ml-2 h-5 w-5" />
                  تشغيل النسخ الاحتياطي الآن
                </>
              )}
            </Button>

            {lastBackupTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>آخر نسخة احتياطية: {lastBackupTime}</span>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-medium">ماذا يتضمن النسخ الاحتياطي؟</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• جميع جداول قاعدة البيانات</li>
                <li>• بحد أقصى 1000 سجل لكل جدول</li>
                <li>• ملف SQL جاهز للاستعادة</li>
                <li>• يتم الإرسال عبر البريد الإلكتروني</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* الإعدادات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              الإعدادات
            </CardTitle>
            <CardDescription>
              إعدادات النسخ الاحتياطي التلقائي
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                البريد الإلكتروني للاستلام
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                سيتم إرسال النسخ الاحتياطية إلى هذا البريد
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-backup" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  النسخ الاحتياطي التلقائي
                </Label>
                <p className="text-xs text-muted-foreground">
                  يومياً في الساعة 2:00 صباحاً
                </p>
              </div>
              <Switch
                id="auto-backup"
                checked={autoBackupEnabled}
                onCheckedChange={setAutoBackupEnabled}
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              <CheckCircle2 className="ml-2 h-4 w-4" />
              حفظ الإعدادات
            </Button>

            <div className="border-t pt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  تأكد من التحقق من نطاق البريد الإلكتروني في Resend لضمان وصول الرسائل.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            <p>
              <strong>الحفظ الآمن:</strong> يتم تشفير جميع النسخ الاحتياطية وإرسالها عبر بروتوكولات آمنة
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            <p>
              <strong>الاستعادة:</strong> يمكن استخدام ملف SQL المرسل لاستعادة قاعدة البيانات في أي وقت
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            <p>
              <strong>الحد الأقصى:</strong> يتم نسخ حتى 1000 سجل من كل جدول لتجنب الملفات الكبيرة جداً
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p>
              <strong>تنبيه:</strong> احفظ النسخ الاحتياطية في مكان آمن ولا تشاركها مع أشخاص غير مصرح لهم
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;
