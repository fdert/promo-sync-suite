import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

interface SendAgencyLoginButtonProps {
  agencyId: string;
  agencyName: string;
  userEmail: string;
}

export const SendAgencyLoginButton = ({ agencyId, agencyName, userEmail }: SendAgencyLoginButtonProps) => {
  const [loading, setLoading] = useState(false);

  const sendLoginDetails = async () => {
    setLoading(true);
    try {
      console.log('🚀 إرسال بيانات دخول الوكالة:', { agencyId, agencyName, userEmail });

      // استخدام edge function موجود
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          subject: `🎉 مرحباً بك! تم إنشاء وكالة "${agencyName}" بنجاح`,
          type: 'agency_login_details',
          data: {
            agencyId,
            agencyName,
            userEmail
          }
        }
      });

      if (error) {
        console.error('❌ خطأ في إرسال بيانات الدخول:', error);
        throw error;
      }

      if (data?.success) {
        toast.success(`تم إرسال بيانات الدخول لوكالة "${agencyName}" على الإيميل ${userEmail}`);
      } else {
        throw new Error(data?.error || 'حدث خطأ غير معروف');
      }

    } catch (error: any) {
      console.error('❌ خطأ في إرسال بيانات الدخول:', error);
      toast.error(error.message || 'حدث خطأ في إرسال بيانات الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={sendLoginDetails}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
      {loading ? 'جاري الإرسال...' : 'إرسال بيانات الدخول'}
    </Button>
  );
};