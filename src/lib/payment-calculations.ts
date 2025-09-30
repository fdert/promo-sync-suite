import { supabase } from '@/integrations/supabase/client';

// دالة لحساب المبالغ المدفوعة للطلب المحدد
export const calculateOrderPaidAmountDirect = async (orderId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', orderId);
  
  if (error || !data) return 0;
  
  return data.reduce((sum, payment) => sum + Number((payment as any)?.amount ?? 0), 0);
};

// دالة لحساب المبالغ المدفوعة للطلب (مباشرة من جدول المدفوعات)
export const calculateOrderPaidAmount = async (orderId: string): Promise<number> => {
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', orderId);
  
  if (!payments) return 0;
  
  return payments.reduce((sum, payment) => sum + Number((payment as any)?.amount ?? 0), 0);
};

// دالة لجلب بيانات الطلبات مع المبالغ المحسوبة من قاعدة البيانات
export const getOrdersWithCalculatedAmounts = async () => {
  const { data: orders, error } = await supabase
    .from('order_payment_summary')
    .select('*');
  
  if (error) throw error;
  
  return orders?.map(order => ({
    ...order,
    paid_amount: Number((order as any).paid_amount ?? 0),
    remaining_amount: Number((order as any).balance ?? 0)
  })) || [];
};

// دالة لجلب بيانات أرصدة العملاء من الطلبات
export const getCustomerOrderBalances = async () => {
  const { data: balances, error } = await supabase
    .from('customer_order_balances')
    .select('*');
  
  if (error) throw error;
  
  return balances || [];
};