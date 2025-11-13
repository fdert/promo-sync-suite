import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";

type ConnectionStatus = "disconnected" | "initializing" | "generating_qr" | "waiting_for_scan" | "connecting" | "connected" | "error";

export default function WhatsAppQRConnect() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qrData, setQrData] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWhatsApp = () => {
    setStatus("initializing");
    setQrData(null);
    setErrorMessage(null);

    // CORRECT WebSocket URL format for Supabase Edge Functions
    const wsUrl = `wss://pqrzkfpowjutylegdcxj.functions.supabase.co/functions/v1/whatsapp-qr-connect`;
    
    console.log("Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ 
        action: "start",
        phone_number: `session_${Date.now()}`
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        switch (data.type) {
          case "ready":
            setStatus("initializing");
            break;

          case "status":
            setStatus(data.status);
            break;

          case "qr":
            setQrData(data.qr);
            setStatus("waiting_for_scan");
            toast({
              title: "رمز QR جاهز",
              description: "امسح الرمز بكاميرا واتساب على جوالك",
            });
            break;

          case "connected":
            setStatus("connected");
            setConnectedPhone(data.phoneNumber);
            toast({
              title: "✅ تم الاتصال بنجاح!",
              description: `الرقم: ${data.phoneNumber}`,
              duration: 5000,
            });
            break;

          case "message":
            toast({
              title: "رسالة جديدة",
              description: `من: ${data.from}\n${data.text.substring(0, 50)}`,
            });
            break;

          case "error":
            setStatus("error");
            setErrorMessage(data.message);
            toast({
              title: "حدث خطأ",
              description: data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.error("WebSocket URL was:", wsUrl);
      setStatus("error");
      setErrorMessage("فشل الاتصال بالخادم - تأكد من نشر Edge Function");
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بخادم واتساب. جرب مرة أخرى بعد قليل.",
        variant: "destructive",
      });
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      if (status !== "connected") {
        setStatus("disconnected");
      }
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: "disconnect" }));
      wsRef.current.close();
    }
    setStatus("disconnected");
    setQrData(null);
    setConnectedPhone(null);
    toast({
      title: "تم قطع الاتصال",
      description: "تم فصل الواتساب بنجاح",
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case "error":
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case "initializing":
      case "generating_qr":
      case "connecting":
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
      case "waiting_for_scan":
        return <QrCode className="h-12 w-12 text-blue-500" />;
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
      case "generating_qr":
        return "جاري إنشاء رمز QR...";
      case "waiting_for_scan":
        return "في انتظار المسح";
      case "connecting":
        return "جاري الاتصال...";
      case "connected":
        return "متصل";
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
            ربط واتساب عبر QR Code
          </CardTitle>
          <CardDescription>
            اربط حساب واتساب الخاص بك باستخدام رمز QR - أسرع وأسهل طريقة!
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

          {/* QR Code Display */}
          {qrData && status === "waiting_for_scan" && (
            <Card className="border-2 border-primary">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCode value={qrData} size={256} />
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
                          <li>وجّه كاميرا جوالك نحو رمز QR أعلاه</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>
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

          {/* Connection Info */}
          {status === "connected" && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <div className="space-y-2">
                  <p className="font-semibold">✅ تم الاتصال بنجاح!</p>
                  <p className="text-sm">يمكنك الآن استقبال وإرسال الرسائل عبر واتساب</p>
                  {connectedPhone && (
                    <p className="text-sm font-mono">الرقم: {connectedPhone}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {status === "disconnected" || status === "error" ? (
              <Button
                onClick={connectWhatsApp}
                size="lg"
                className="w-full sm:w-auto"
              >
                <QrCode className="mr-2 h-4 w-4" />
                ربط واتساب
              </Button>
            ) : status === "connected" ? (
              <Button
                onClick={disconnect}
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto"
              >
                قطع الاتصال
              </Button>
            ) : (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                إعادة المحاولة
              </Button>
            )}
          </div>

          {/* Instructions */}
          <Card className="bg-muted">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">💡 نصائح مهمة:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>تأكد من تحديث واتساب لآخر إصدار</li>
                <li>احتفظ بهذه الصفحة مفتوحة أثناء عملية الربط</li>
                <li>رمز QR صالح لمدة دقيقتين فقط</li>
                <li>يجب أن يكون الجوال متصلاً بالإنترنت</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
