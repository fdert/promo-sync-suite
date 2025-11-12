import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";

export default function WhatsAppQRLogin() {
  const [phoneNumber, setPhoneNumber] = useState("+966532709980");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
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

  const generatePairingCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-qr-login', {
        body: { 
          action: 'generate_pairing_code',
          phone_number: phoneNumber 
        }
      });

      if (error) throw error;

      if (data.pairing_code) {
        setPairingCode(data.pairing_code);
        setInstructions(data.instructions || []);
        toast({
          title: "✅ تم إنشاء كود الربط",
          description: "أدخل الكود في تطبيق الواتساب على هاتفك",
        });
        
        // Start polling for connection status
        startPollingConnection();
      }
    } catch (error: any) {
      console.error('Error generating pairing code:', error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل إنشاء كود الربط",
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
          setPairingCode(null);
          setInstructions([]);
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
      setPairingCode(null);
      setInstructions([]);

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
          قم بإدخال كود الربط لربط حساب الواتساب وجلب جميع الرسائل
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
                onClick={generatePairingCode}
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
                    <Smartphone className="w-4 h-4 ml-2" />
                    إنشاء كود الربط
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

        {pairingCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                كود الربط
              </CardTitle>
              <CardDescription>
                أدخل هذا الكود في تطبيق الواتساب على هاتفك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">كود الربط الخاص بك</AlertTitle>
                <AlertDescription className="space-y-3">
                  <div className="text-4xl font-bold text-center py-6 text-green-700 dark:text-green-300 tracking-widest" dir="ltr">
                    {pairingCode}
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1.5 pr-4">
                    {instructions.map((instruction, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400">•</span>
                        <span>{instruction}</span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ملاحظة هامة</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>• هذا النظام تجريبي حالياً</p>
                  <p>• للربط الفعلي، يحتاج النظام إلى تثبيت مكتبة WhatsApp Web</p>
                  <p>• سيتم تطوير الربط الكامل قريباً</p>
                </AlertDescription>
              </Alert>
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
