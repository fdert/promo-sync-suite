import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeliveryTimeIndicatorProps {
  deliveryDate: string;
  deliveryTime?: string;
  orderNumber: string;
  compact?: boolean;
}

export const DeliveryTimeIndicator = ({ 
  deliveryDate, 
  deliveryTime, 
  orderNumber,
  compact = false 
}: DeliveryTimeIndicatorProps) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    isOverdue: boolean;
    isUrgent: boolean;
  } | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (!deliveryDate) return null;

      // تحويل التاريخ والوقت إلى كائن Date
      const now = new Date();
      const deliveryDateTime = new Date(deliveryDate);
      
      // إضافة الوقت إذا كان موجوداً
      if (deliveryTime) {
        const [hours, minutes] = deliveryTime.split(':').map(Number);
        deliveryDateTime.setHours(hours, minutes, 0, 0);
      } else {
        // إذا لم يكن هناك وقت محدد، نفترض نهاية يوم العمل (5 مساءً)
        deliveryDateTime.setHours(17, 0, 0, 0);
      }

      // حساب الفرق بالمللي ثانية
      const diff = deliveryDateTime.getTime() - now.getTime();
      
      // تحويل إلى ساعات ودقائق
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      const minutes = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60));
      
      const isOverdue = diff < 0;
      const isUrgent = !isOverdue && diff <= 2 * 60 * 60 * 1000; // خلال ساعتين

      return { hours, minutes, isOverdue, isUrgent };
    };

    const updateTime = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // تحديث كل دقيقة

    return () => clearInterval(interval);
  }, [deliveryDate, deliveryTime]);

  if (!timeRemaining) return null;

  const { hours, minutes, isOverdue, isUrgent } = timeRemaining;

  // العرض المختصر
  if (compact) {
    return (
      <Badge 
        variant={isOverdue ? 'destructive' : isUrgent ? 'default' : 'secondary'}
        className="flex items-center gap-1"
      >
        <Clock className="h-3 w-3" />
        {isOverdue ? (
          <span>متأخر {hours > 0 ? `${hours}س` : ''} {minutes}د</span>
        ) : (
          <span>باقي {hours > 0 ? `${hours}س` : ''} {minutes}د</span>
        )}
      </Badge>
    );
  }

  // العرض الكامل مع التنبيه
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          <strong>موعد التسليم:</strong>{' '}
          {new Date(deliveryDate).toLocaleDateString('ar-SA')}
          {deliveryTime && ` الساعة ${deliveryTime}`}
        </span>
      </div>

      {isUrgent && !isOverdue && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>تنبيه:</strong> يتبقى {hours > 0 ? `${hours} ساعة و` : ''} {minutes} دقيقة على موعد التسليم للطلب {orderNumber}
          </AlertDescription>
        </Alert>
      )}

      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>متأخر:</strong> الطلب {orderNumber} تأخر {hours > 0 ? `${hours} ساعة و` : ''} {minutes} دقيقة
          </AlertDescription>
        </Alert>
      )}

      {!isOverdue && !isUrgent && (
        <div className="text-sm text-muted-foreground">
          يتبقى {hours > 0 ? `${hours} ساعة و` : ''} {minutes} دقيقة على موعد التسليم
        </div>
      )}
    </div>
  );
};
