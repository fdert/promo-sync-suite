import { supabase } from '@/integrations/supabase/client';

export const sendAgencyLoginDetails = async (agencyId: string, userEmail: string) => {
  try {
    console.log('🚀 إرسال بيانات دخول الوكالة:', { agencyId, userEmail });

    const { data, error } = await supabase.functions.invoke('send-agency-login-details', {
      body: {
        agencyId,
        userEmail
      }
    });

    if (error) {
      console.error('❌ خطأ في إرسال بيانات الدخول:', error);
      throw error;
    }

    if (data?.success) {
      return {
        success: true,
        message: `تم إرسال بيانات الدخول على الإيميل ${userEmail}`,
        emailId: data.emailId
      };
    } else {
      throw new Error(data?.error || 'حدث خطأ غير معروف');
    }

  } catch (error: any) {
    console.error('❌ خطأ في إرسال بيانات الدخول:', error);
    throw new Error(error.message || 'حدث خطأ في إرسال بيانات الدخول');
  }
};

// إرسال مباشر لوكالة مبدع
export const sendMubdaaLoginDetails = async () => {
  return await sendAgencyLoginDetails(
    '5b6c28ae-557e-4516-b6a7-367e8a9bd383', 
    'fdert1@icloud.com'
  );
};