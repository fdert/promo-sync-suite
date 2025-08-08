import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, RefreshCw, CheckCircle } from "lucide-react";

const WhatsAppMessageProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);

  // جلب عدد الرسائل المعلقة
  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  // معالجة الرسائل المعلقة
  const processMessages = async () => {
    setProcessing(true);
    try {
      console.log('🚀 بدء معالجة الرسائل المعلقة...');
      
      const { data, error } = await supabase.functions.invoke('process-whatsapp-queue');
      
      if (error) {
        console.error('خطأ في معالجة الرسائل:', error);
        throw error;
      }

      console.log('نتائج المعالجة:', data);
      
      toast({
        title: "تم بنجاح",
        description: `تم معالجة ${data?.processed_count || 0} رسالة`,
      });

      setLastProcessedAt(new Date());
      await fetchPendingCount();
      
    } catch (error) {
      console.error('Error processing messages:', error);
      toast({
        title: "خطأ",
        description: "فشل في معالجة الرسائل",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // معالجة تلقائية لجميع الرسائل
  const processAllMessages = async () => {
    if (pendingCount === 0) {
      toast({
        title: "لا توجد رسائل",
        description: "لا توجد رسائل معلقة للمعالجة",
      });
      return;
    }

    setProcessing(true);
    try {
      let totalProcessed = 0;
      
      // معالجة دفعات من 10 رسائل حتى تنتهي جميع الرسائل المعلقة
      while (pendingCount > 0) {
        const { data, error } = await supabase.functions.invoke('process-whatsapp-queue');
        
        if (error) throw error;
        
        const processedCount = data?.processed_count || 0;
        totalProcessed += processedCount;
        
        if (processedCount === 0) break; // لا توجد المزيد من الرسائل للمعالجة
        
        // تحديث العدد المعلق
        await fetchPendingCount();
        
        // تأخير قصير بين الدفعات
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      toast({
        title: "اكتملت المعالجة",
        description: `تم معالجة ${totalProcessed} رسالة بنجاح`,
      });

      setLastProcessedAt(new Date());
      
    } catch (error) {
      console.error('Error processing all messages:', error);
      toast({
        title: "خطأ",
        description: "فشل في المعالجة التلقائية",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  React.useEffect(() => {
    fetchPendingCount();
    // تحديث العدد كل 30 ثانية
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          معالج رسائل الواتساب
        </CardTitle>
        <CardDescription>
          معالجة الرسائل المعلقة وإرسالها إلى الويب هوك المحدد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">الرسائل المعلقة:</span>
            <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
              {pendingCount}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingCount}
            disabled={processing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            تحديث
          </Button>
        </div>

        {lastProcessedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            آخر معالجة: {lastProcessedAt.toLocaleString('ar-SA')}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={processMessages}
            disabled={processing || pendingCount === 0}
            className="flex-1"
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            معالجة 10 رسائل
          </Button>
          
          <Button
            onClick={processAllMessages}
            disabled={processing || pendingCount === 0}
            variant="outline"
            className="flex-1"
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            معالجة الكل تلقائياً
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• سيتم إرسال الرسائل إلى الويب هوك المفعل</p>
          <p>• المعالجة تتم بدفعات من 10 رسائل لتجنب التحميل الزائد</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppMessageProcessor;