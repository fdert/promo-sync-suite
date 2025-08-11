import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Send, Loader2 } from 'lucide-react';

const EmailTest = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const testEmail = async () => {
    if (!email) {
      toast.error('يرجى إدخال بريد إلكتروني');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 اختبار إرسال بريد إلى:', email);

      // استدعاء مباشر مع معالجة أخطاء مفصلة
      const response = await supabase.functions.invoke('send-email', {
        body: { 
          to: email,
          subject: '🧪 اختبار إرسال البريد الإلكتروني من النظام',
          type: 'welcome',
          data: {
            fullName: 'عزيزنا العميل',
            loginUrl: window.location.origin
          }
        }
      });

      console.log('📧 استجابة كاملة:', response);

      if (response.error) {
        console.error('❌ خطأ في الاستدعاء:', response.error);
        
        // التحقق من نوع الخطأ
        if (response.error.message?.includes('Failed to send a request')) {
          toast.error('فشل في الاتصال بخدمة البريد الإلكتروني. تحقق من اتصال الإنترنت.');
        } else if (response.error.message?.includes('Function not found')) {
          toast.error('وظيفة إرسال البريد غير متاحة حالياً.');
        } else {
          toast.error(`خطأ في النظام: ${response.error.message}`);
        }
        return;
      }

      const data = response.data;
      console.log('📧 بيانات الاستجابة:', data);

      if (data?.success) {
        toast.success(`✅ تم إرسال بريد اختبار بنجاح إلى ${email}`);
        console.log('✅ تفاصيل الإرسال:', data.details);
      } else {
        console.error('❌ فشل الإرسال:', data);
        toast.error(data?.error || 'فشل في إرسال البريد - سبب غير معروف');
        
        // عرض تفاصيل إضافية للمطور
        if (data?.details) {
          console.error('📋 تفاصيل الخطأ:', data.details);
        }
      }

    } catch (error: any) {
      console.error('💥 خطأ عام:', error);
      
      if (error.message?.includes('Failed to send a request')) {
        toast.error('لا يمكن الوصول لخدمة البريد الإلكتروني. تحقق من الإنترنت أو أعد المحاولة لاحقاً.');
      } else if (error.message?.includes('network')) {
        toast.error('مشكلة في الشبكة - تحقق من اتصال الإنترنت');
      } else {
        toast.error(`خطأ غير متوقع: ${error.message || 'خطأ غير معروف'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">اختبار إرسال البريد الإلكتروني</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="أدخل بريدك الإلكتروني للاختبار"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <Button 
            onClick={testEmail}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                إرسال بريد اختبار
              </>
            )}
          </Button>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ في حالة استمرار الخطأ:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• تأكد من اتصال الإنترنت</li>
              <li>• تحقق من صحة مفتاح Resend API</li>
              <li>• تأكد من تفعيل النطاق في Resend</li>
              <li>• أعد تحميل الصفحة وحاول مرة أخرى</li>
            </ul>
          </div>

          <div className="text-sm text-gray-600 text-center">
            <p>هذا الاختبار يتحقق من:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>اتصال Edge Functions</li>
              <li>اتصال Resend API</li>
              <li>إعدادات Domain</li>
              <li>وصول الإيميلات</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTest;