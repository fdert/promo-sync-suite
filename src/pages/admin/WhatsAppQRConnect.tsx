import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from "lucide-react";

type ConnectionStatus = "disconnected" | "initializing" | "waiting_for_pairing" | "connected" | "error";

export default function WhatsAppQRConnect() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phoneNumber, setPhoneNumber] = useState("+9665");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check status periodically after generating code
  useEffect(() => {
    if (status === "waiting_for_pairing" && phoneNumber) {
      const interval = setInterval(async () => {
        await checkConnectionStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, phoneNumber]);

  const generatePairingCode = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال رقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setPairingCode(null);
    setStatus("initializing");

    try {
      const res = await fetch("https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/whatsapp-qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_pairing_code",
          phone_number: phoneNumber.trim()
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "فشل توليد كود الربط");
      }

      setPairingCode(data.pairing_code);
      setSessionId(data.session_id);
      setStatus("waiting_for_pairing");
      
      toast({
        title: "✅ تم توليد الكود",
        description: `الكود: ${data.pairing_code}`,
        duration: 8000,
      });

    } catch (error: any) {
      console.error("Error generating code:", error);
      setStatus("error");
      setErrorMessage(error?.message || "فشل الاتصال بالخادم");
      toast({
        title: "خطأ",
        description: error?.message || "فشل توليد كود الربط",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!phoneNumber) return;

    try {
      const res = await fetch("https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/whatsapp-qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_status",
          phone_number: phoneNumber.trim()
        })
      });

      const data = await res.json();
      
      if (data.connected || data.status === "connected") {
        setStatus("connected");
        setConnectedPhone(phoneNumber);
        toast({
          title: "🎉 تم الاتصال بنجاح!",
          description: "واتساب متصل الآن",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const disconnect = async () => {
    if (!phoneNumber) return;
    
    setIsLoading(true);
    try {
      await fetch("https://pqrzkfpowjutylegdcxj.supabase.co/functions/v1/whatsapp-qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          phone_number: phoneNumber.trim()
        })
      });

      setStatus("disconnected");
      setPairingCode(null);
      setSessionId(null);
      setConnectedPhone(null);
      
      toast({
        title: "تم قطع الاتصال",
        description: "تم فصل الواتساب بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل قطع الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStatus("disconnected");
    setPairingCode(null);
    setSessionId(null);
    setConnectedPhone(null);
    setErrorMessage(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case "error":
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case "initializing":
      case "waiting_for_pairing":
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
      default:
        return <Smartphone className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "disconnected":
        return "غير متصل";
      case "initializing":
        return "جاري التهيئة...";
      case "waiting_for_pairing":
        return "في انتظار الربط - أدخل الكود في جوالك";
      case "connected":
        return "متصل ✅";
      case "error":
        return "خطأ";
      default:
        return "غير معروف";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            ربط واتساب
          </CardTitle>
          <CardDescription>
            اربط حساب واتساب باستخدام كود الربط - سريع وسهل!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
            {getStatusIcon()}
            <div className="text-center">
              <p className="text-lg font-semibold">{getStatusText()}</p>
              {connectedPhone && (
                <p className="text-sm text-muted-foreground mt-1">
                  الرقم: {connectedPhone}
                </p>
              )}
            </div>
          </div>

          {/* Phone Input */}
          {(status === "disconnected" || status === "error") && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم واتساب</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="مثال: +966501234567"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={generatePairingCode}
                  disabled={isLoading || !phoneNumber.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التوليد...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      توليد كود الربط
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pairing Code Display */}
          {pairingCode && status === "waiting_for_pairing" && (
            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      كود الربط الخاص بك:
                    </p>
                    <p className="text-5xl font-bold tracking-widest text-primary">
                      {pairingCode}
                    </p>
                  </div>

                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">خطوات الربط:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>افتح واتساب على جوالك</li>
                          <li>اذهب إلى: الإعدادات &gt; الأجهزة المرتبطة</li>
                          <li>اضغط على "ربط جهاز"</li>
                          <li>اختر "ربط باستخدام رقم الهاتف بدلاً من ذلك"</li>
                          <li>أدخل الكود: <strong>{pairingCode}</strong></li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={reset}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    إلغاء وإعادة المحاولة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {status === "error" && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Connected State */}
          {status === "connected" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <div className="space-y-2">
                  <p className="font-semibold">✅ تم الاتصال بنجاح!</p>
                  <p className="text-sm">واتساب متصل الآن ويمكنك استقبال وإرسال الرسائل</p>
                  {connectedPhone && (
                    <p className="text-sm font-mono">الرقم: {connectedPhone}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {status === "connected" && (
            <div className="flex gap-3 justify-center">
              <Button
                onClick={disconnect}
                variant="destructive"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري قطع الاتصال...
                  </>
                ) : (
                  "قطع الاتصال"
                )}
              </Button>
            </div>
          )}

          {/* Instructions */}
          <Card className="bg-muted">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">💡 نصائح مهمة:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>تأكد من تحديث واتساب لآخر إصدار</li>
                <li>الرقم المدخل يجب أن يكون نفس رقم حساب واتساب على الجوال</li>
                <li>الكود صالح لمدة دقيقة واحدة - أدخله بسرعة</li>
                <li>يجب أن يكون الجوال متصلاً بالإنترنت</li>
                <li>بعد إدخال الكود، انتظر بضع ثوانٍ للاتصال التلقائي</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
