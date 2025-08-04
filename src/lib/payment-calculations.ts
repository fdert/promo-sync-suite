import { supabase } from '@/integrations/supabase/client';

// دالة لحساب المبالغ المدفوعة للفاتورة
export const calculateInvoicePaidAmount = async (invoiceId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId);
  
  if (error || !data) return 0;
  
  return data.reduce((sum, payment) => sum + payment.amount, 0);
};

// دالة لحساب المبالغ المدفوعة للطلب
export const calculateOrderPaidAmount = async (orderId: string): Promise<number> => {
  // البحث عن الفواتير المرتبطة بالطلب
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('order_id', orderId);
  
  if (!invoices?.length) return 0;
  
  const invoiceIds = invoices.map(inv => inv.id);
  
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .in('invoice_id', invoiceIds);
  
  if (!payments) return 0;
  
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
};

// دالة لجلب بيانات الفواتير مع المبالغ المحسوبة
export const getInvoicesWithCalculatedAmounts = async () => {
  const { data: invoices, error } = await supabase
    .from('invoice_payment_summary')
    .select('*');
  
  if (error) throw error;
  
  return invoices?.map(invoice => ({
    ...invoice,
    paid_amount: invoice.calculated_paid_amount || 0,
    remaining_amount: invoice.remaining_amount || 0
  })) || [];
};

// دالة لجلب بيانات الطلبات مع المبالغ المحسوبة
export const getOrdersWithCalculatedAmounts = async () => {
  const { data: orders, error } = await supabase
    .from('order_payment_summary')
    .select('*');
  
  if (error) throw error;
  
  return orders?.map(order => ({
    ...order,
    paid_amount: order.calculated_paid_amount || 0,
    remaining_amount: order.remaining_amount || 0
  })) || [];
};