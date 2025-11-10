import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, QrCode, CheckCircle2 } from "lucide-react";

export default function WhatsAppQRLogin() {
  const [phoneNumber, setPhoneNumber] = useState("+966532709980");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const { toast } = useToast();

  // Check for existing session
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'check_status',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      if (data?.connected) {
        setIsConnected(true);
        setSessionInfo(data.session);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'generate_qr',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      if (data.qr_code) {
        setQrCode(data.qr_code);
        toast({
          title: "✅ تم إنشاء رمز QR",
          description: "قم بمسح الرمز من تطبيق الواتساب على هاتفك",
        });
        
        // Start polling for connection status
        startPollingConnection();
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل إنشاء رمز QR",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startPollingConnection = () => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
          body: { 
            action: 'check_status',
            phone_number: phoneNumber 
          }
        });

        if (data?.connected) {
          setIsConnected(true);
          setSessionInfo(data.session);
          setQrCode(null);
          clearInterval(interval);
          
          toast({
            title: "🎉 تم الاتصال بنجاح!",
            description: "يتم الآن جلب الرسائل...",
          });

          // Fetch messages after connection
          fetchAllMessages();
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const fetchAllMessages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'fetch_messages',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      toast({
        title: "✅ تم جلب الرسائل",
        description: `تم جلب ${data.messages_count || 0} رسالة`,
      });
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: "⚠️ تنبيه",
        description: "حدث خطأ أثناء جلب الرسائل",
        variant: "destructive",
      });
    }
  };

  const disconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'disconnect',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      setIsConnected(false);
      setSessionInfo(null);
      setQrCode(null);

      toast({
        title: "✅ تم قطع الاتصال",
        description: "تم قطع الاتصال بالواتساب",
      });
    } catch (error: any) {
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل قطع الاتصال",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">تسجيل الدخول للواتساب</h1>
        <p className="text-muted-foreground">
          قم بمسح رمز QR لربط حساب الواتساب وجلب جميع الرسائل
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              إعدادات الرقم
            </CardTitle>
            <CardDescription>
              أدخل رقم الواتساب الذي تريد ربطه
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الواتساب</Label>
              <Input
                id="phone"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+966XXXXXXXXX"
                disabled={isConnected}
                dir="ltr"
                className="text-left"
              />
            </div>

            {!isConnected && (
              <Button
                onClick={generateQRCode}
                disabled={isLoading || !phoneNumber}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 ml-2" />
                    إنشاء رمز QR
                  </>
                )}
              </Button>
            )}

            {isConnected && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">متصل بنجاح</span>
                </div>
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  className="w-full"
                >
                  قطع الاتصال
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {qrCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                رمز QR
              </CardTitle>
              <CardDescription>
                امسح هذا الرمز من تطبيق الواتساب على هاتفك
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="bg-white p-4 rounded-lg shadow-lg mb-4">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>📱 افتح الواتساب على هاتفك</p>
                <p>⚙️ اذهب إلى الإعدادات &gt; الأجهزة المرتبطة</p>
                <p>📷 اضغط على "ربط جهاز" وامسح الرمز</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isConnected && sessionInfo && (
          <Card>
            <CardHeader>
              <CardTitle>معلومات الجلسة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرقم:</span>
                <span className="font-mono" dir="ltr">{sessionInfo.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وقت الاتصال:</span>
                <span>{new Date(sessionInfo.connected_at).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة:</span>
                <span className="text-green-600 dark:text-green-400">نشط</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}