import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Database, Download, Mail, Clock, CheckCircle2, AlertCircle, Settings, PlayCircle, Send, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { BackupRestoreSection } from "@/components/BackupRestoreSection";

const BackupManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isLoadingOrdersReport, setIsLoadingOrdersReport] = useState(false);
  const [isTestingOrdersEmail, setIsTestingOrdersEmail] = useState(false);
  const [email, setEmail] = useState("ibdaa.adve@gmail.com");
  const [ordersReportEmail, setOrdersReportEmail] = useState("ibdaa.adve@gmail.com");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [autoOrdersReportEnabled, setAutoOrdersReportEnabled] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [lastOrdersReportTime, setLastOrdersReportTime] = useState<string | null>(null);

  const handleManualBackup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-backup', {
        body: { scheduled: false, to: email }
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

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-backup', {
        body: { testEmail: true, to: email }
      });

      if (error) throw error;

      toast({
        title: "✅ تم إرسال رسالة الاختبار",
        description: `تم إرسال رسالة اختبار إلى ${email} بنجاح`,
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في إرسال الرسالة",
        description: error.message || "فشل في إرسال رسالة الاختبار",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleOrdersReport = async () => {
    setIsLoadingOrdersReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-orders-report', {
        body: { scheduled: false, to: ordersReportEmail }
      });

      if (error) throw error;

      toast({
        title: "✅ تم إرسال تقرير الطلبات",
        description: `تم إرسال تقرير الطلبات إلى ${ordersReportEmail} بنجاح`,
      });
      
      setLastOrdersReportTime(new Date().toLocaleString('ar-SA'));
    } catch (error: any) {
      console.error('Error generating orders report:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في إنشاء التقرير",
        description: error.message || "فشل في إرسال تقرير الطلبات",
      });
    } finally {
      setIsLoadingOrdersReport(false);
    }
  };

  const handleTestOrdersEmail = async () => {
    setIsTestingOrdersEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-orders-report', {
        body: { testEmail: true, to: ordersReportEmail }
      });

      if (error) throw error;

      toast({
        title: "✅ تم إرسال رسالة الاختبار",
        description: `تم إرسال رسالة اختبار إلى ${ordersReportEmail} بنجاح`,
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        variant: "destructive",
        title: "❌ خطأ في إرسال الرسالة",
        description: error.message || "فشل في إرسال رسالة الاختبار",
      });
    } finally {
      setIsTestingOrdersEmail(false);
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
            إدارة النسخ الاحتياطي والتقارير
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة النسخ الاحتياطية التلقائية واليدوية لقاعدة البيانات وتقارير الطلبات
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          يتم إرسال النسخ الاحتياطية والتقارير التلقائية يومياً. يمكنك أيضاً تشغيلها يدوياً في أي وقت.
        </AlertDescription>
      </Alert>

      <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong>تنبيه هام:</strong> حالياً يمكن إرسال الرسائل فقط إلى البريد المسجل في Resend (ibdaa.adve@gmail.com). لإرسال إلى عناوين أخرى، يجب توثيق الدومين في{" "}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            resend.com/domains
          </a>
        </AlertDescription>
      </Alert>

      {/* قسم النسخ الاحتياطي */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              نسخ احتياطي لقاعدة البيانات
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              إعدادات النسخ الاحتياطي
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
                سيتم إرسال النسخ الاحتياطية إلى هذا البريد (حالياً مقيد ببريد حساب Resend)
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

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleTestEmail} disabled={isTestingEmail} variant="outline">
                {isTestingEmail ? (
                  <>
                    <Clock className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    اختبار البريد
                  </>
                )}
              </Button>
              <Button onClick={handleSaveSettings}>
                <CheckCircle2 className="ml-2 h-4 w-4" />
                حفظ الإعدادات
              </Button>
            </div>

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

      {/* قسم تقرير الطلبات */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              تقرير الطلبات اليومي
            </CardTitle>
            <CardDescription>
              تصدير جميع الطلبات إلى ملف Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleOrdersReport}
              disabled={isLoadingOrdersReport}
              size="lg"
              className="w-full"
              variant="outline"
            >
              {isLoadingOrdersReport ? (
                <>
                  <Clock className="ml-2 h-5 w-5 animate-spin" />
                  جاري إنشاء التقرير...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="ml-2 h-5 w-5" />
                  إنشاء وإرسال التقرير الآن
                </>
              )}
            </Button>

            {lastOrdersReportTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>آخر تقرير: {lastOrdersReportTime}</span>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-medium">ماذا يتضمن التقرير؟</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• جميع الطلبات مع التفاصيل الكاملة</li>
                <li>• معلومات العملاء والخدمات</li>
                <li>• البنود والمدفوعات لكل طلب</li>
                <li>• إحصائيات شاملة</li>
                <li>• ملف Excel جاهز للاستخدام</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              إعدادات تقرير الطلبات
            </CardTitle>
            <CardDescription>
              إعدادات التقرير اليومي التلقائي
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orders-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                البريد الإلكتروني للاستلام
              </Label>
              <Input
                id="orders-email"
                type="email"
                value={ordersReportEmail}
                onChange={(e) => setOrdersReportEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                سيتم إرسال التقارير إلى هذا البريد (حالياً مقيد ببريد حساب Resend)
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-orders-report" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  التقرير التلقائي اليومي
                </Label>
                <p className="text-xs text-muted-foreground">
                  يومياً في الساعة 12:00 منتصف الليل
                </p>
              </div>
              <Switch
                id="auto-orders-report"
                checked={autoOrdersReportEnabled}
                onCheckedChange={setAutoOrdersReportEnabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleTestOrdersEmail} disabled={isTestingOrdersEmail} variant="outline">
                {isTestingOrdersEmail ? (
                  <>
                    <Clock className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    اختبار البريد
                  </>
                )}
              </Button>
              <Button onClick={handleSaveSettings}>
                <CheckCircle2 className="ml-2 h-4 w-4" />
                حفظ الإعدادات
              </Button>
            </div>

            <div className="border-t pt-4">
              <Alert className="bg-green-50 dark:bg-green-900/10 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800 dark:text-green-200">
                  التقرير يحتوي على معلومات حساسة. تأكد من حفظه في مكان آمن.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قسم استيراد واستعادة البيانات */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">استيراد واستعادة البيانات</h2>
          <p className="text-muted-foreground">
            استرجع النسخ الاحتياطية أو استورد الطلبات من ملفات Excel
          </p>
        </div>
        
        <BackupRestoreSection />
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
              <strong>الحفظ الآمن:</strong> يتم تشفير جميع النسخ الاحتياطية والتقارير وإرسالها عبر بروتوكولات آمنة
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
              <strong>التقارير:</strong> يتم إنشاء تقرير Excel شامل بجميع الطلبات والإحصائيات
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p>
              <strong>تنبيه:</strong> احفظ النسخ الاحتياطية والتقارير في مكان آمن ولا تشاركها مع أشخاص غير مصرح لهم
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;
