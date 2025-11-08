import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface UrgentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  estimated_delivery_time: string;
  minutes_remaining: number;
}

export const OrderDeliveryAlert = () => {
  const { user } = useAuth();
  const [urgentOrders, setUrgentOrders] = useState<UrgentOrder[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<UrgentOrder | null>(null);
  const [alertedOrders, setAlertedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkUrgentOrders = async () => {
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            delivery_date,
            estimated_delivery_time,
            status,
            customers (name)
          `)
          .eq('created_by', user.id)
          .neq('status', 'مكتمل')
          .neq('status', 'جاهز للتسليم')
          .not('delivery_date', 'is', null);

        if (error) throw error;

        const now = new Date();
        const urgent: UrgentOrder[] = [];

        orders?.forEach((order: any) => {
          const deliveryDateTime = new Date(order.delivery_date);
          
          if (order.estimated_delivery_time) {
            const [hours, minutes] = order.estimated_delivery_time.split(':').map(Number);
            deliveryDateTime.setHours(hours, minutes, 0, 0);
          } else {
            deliveryDateTime.setHours(17, 0, 0, 0);
          }

          const diffMs = deliveryDateTime.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));

          // إذا كان متبقي 60 دقيقة أو أقل (وليس متأخر بالفعل)
          if (diffMinutes > 0 && diffMinutes <= 60) {
            urgent.push({
              id: order.id,
              order_number: order.order_number,
              customer_name: order.customers?.name || 'غير محدد',
              delivery_date: order.delivery_date,
              estimated_delivery_time: order.estimated_delivery_time || '17:00',
              minutes_remaining: diffMinutes,
            });
          }
        });

        setUrgentOrders(urgent);

        // عرض تنبيه للطلبات التي لم يتم التنبيه عنها بعد
        urgent.forEach((order) => {
          if (!alertedOrders.has(order.id)) {
            setCurrentAlert(order);
            setShowAlert(true);
            setAlertedOrders((prev) => new Set(prev).add(order.id));
          }
        });
      } catch (error) {
        console.error('خطأ في فحص الطلبات العاجلة:', error);
      }
    };

    // فحص فوري عند التحميل
    checkUrgentOrders();

    // فحص كل دقيقة
    const interval = setInterval(checkUrgentOrders, 60000);

    return () => clearInterval(interval);
  }, [user, alertedOrders]);

  const handleClose = () => {
    setShowAlert(false);
    setCurrentAlert(null);
  };

  if (!currentAlert) return null;

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    }
    return `ساعة واحدة`;
  };

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <AlertDialogTitle className="text-xl">تحذير: موعد التسليم قريب</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3 pt-4">
            <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">
                🔔 يتبقى <span className="text-destructive font-bold">{formatTime(currentAlert.minutes_remaining)}</span> على موعد تسليم الطلب
              </p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">رقم الطلب:</span> {currentAlert.order_number}</p>
                <p><span className="font-medium">العميل:</span> {currentAlert.customer_name}</p>
                <p><span className="font-medium">موعد التسليم:</span> {new Date(currentAlert.delivery_date).toLocaleDateString('ar-SA')} - الساعة {currentAlert.estimated_delivery_time}</p>
              </div>
            </div>
            <p className="text-foreground font-medium">
              يرجى التأكد من استكمال الطلب وجاهزيته للتسليم في الموعد المحدد.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose} className="w-full">
            تم الاطلاع
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
