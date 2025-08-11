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

      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { to: email }
      });

      if (error) {
        console.error('❌ خطأ في استدعاء الوظيفة:', error);
        throw error;
      }

      console.log('📧 استجابة الإرسال:', data);

      if (data?.success) {
        toast.success(`تم إرسال بريد اختبار بنجاح إلى ${email}`);
      } else {
        toast.error(data?.error || 'فشل في إرسال البريد');
      }

    } catch (error: any) {
      console.error('❌ خطأ عام:', error);
      toast.error(error.message || 'حدث خطأ في إرسال البريد');
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

          <div className="text-sm text-gray-600 text-center">
            <p>هذا الاختبار يتحقق من:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
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