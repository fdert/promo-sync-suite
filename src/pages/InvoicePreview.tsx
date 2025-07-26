import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  customers?: {
    name: string;
    phone?: string;
    address?: string;
  };
}

interface InvoiceItem {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

const InvoicePreview = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      // جلب بيانات الفاتورة
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, address)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        console.error('Error fetching invoice:', invoiceError);
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // جلب بنود الفاتورة
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
      }

      setInvoice(invoiceData);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في جلب بيانات الفاتورة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // تحويل الفاتورة إلى PDF (يمكن تطويرها لاحقاً)
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">فاتورة غير موجودة</h1>
          <p>لم يتم العثور على الفاتورة المطلوبة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* أزرار الطباعة والتحميل */}
        <div className="mb-6 flex gap-4 print:hidden">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تحميل PDF
          </Button>
        </div>

        {/* الفاتورة */}
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8">
            {/* رأس الفاتورة */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">شركة الخدمات المتطورة</h1>
              <p className="text-muted-foreground">المملكة العربية السعودية</p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h2 className="text-xl font-semibold">فاتورة رقم: {invoice.invoice_number}</h2>
              </div>
            </div>

            {/* معلومات الفاتورة والعميل */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-3 text-lg border-b pb-2">بيانات العميل</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">الاسم:</span> {invoice.customers?.name}</p>
                  {invoice.customers?.phone && (
                    <p><span className="font-medium">الهاتف:</span> {invoice.customers.phone}</p>
                  )}
                  {invoice.customers?.address && (
                    <p><span className="font-medium">العنوان:</span> {invoice.customers.address}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-lg border-b pb-2">تفاصيل الفاتورة</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">تاريخ الإصدار:</span> {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</p>
                  <p><span className="font-medium">تاريخ الاستحقاق:</span> {new Date(invoice.due_date).toLocaleDateString('ar-SA')}</p>
                  <p><span className="font-medium">الحالة:</span> 
                    <span className={`mr-2 px-2 py-1 rounded text-sm ${
                      invoice.status === 'مدفوع' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'قيد الانتظار' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </p>
                  {invoice.payment_date && (
                    <p><span className="font-medium">تاريخ الدفع:</span> {new Date(invoice.payment_date).toLocaleDateString('ar-SA')}</p>
                  )}
                  {invoice.payment_method && (
                    <p><span className="font-medium">طريقة الدفع:</span> {invoice.payment_method}</p>
                  )}
                </div>
              </div>
            </div>

            {/* جدول البنود */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4 text-lg border-b pb-2">تفاصيل الفاتورة</h3>
              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-right">البند</th>
                        <th className="border border-border p-3 text-right">الوصف</th>
                        <th className="border border-border p-3 text-center">الكمية</th>
                        <th className="border border-border p-3 text-center">السعر</th>
                        <th className="border border-border p-3 text-center">المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="border border-border p-3">{item.item_name}</td>
                          <td className="border border-border p-3">{item.description || '-'}</td>
                          <td className="border border-border p-3 text-center">{item.quantity}</td>
                          <td className="border border-border p-3 text-center">{item.unit_price.toFixed(2)} ر.س</td>
                          <td className="border border-border p-3 text-center">{item.total_amount.toFixed(2)} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-muted rounded-lg text-center">
                  <p className="text-lg">{invoice.notes || 'خدمات متنوعة'}</p>
                </div>
              )}
            </div>

            {/* المجاميع */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">المبلغ الفرعي:</span>
                    <span>{invoice.amount.toFixed(2)} ر.س</span>
                  </div>
                  {invoice.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">الضريبة:</span>
                      <span>{invoice.tax_amount.toFixed(2)} ر.س</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>المبلغ الإجمالي:</span>
                    <span className="text-primary">{invoice.total_amount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* الملاحظات */}
            {invoice.notes && (
              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">ملاحظات:</h4>
                <p className="text-muted-foreground">{invoice.notes}</p>
              </div>
            )}

            {/* تذييل */}
            <div className="mt-12 text-center text-muted-foreground">
              <p className="font-medium">شكراً لثقتكم بنا</p>
              <p className="text-sm mt-2">للاستفسارات يرجى التواصل معنا</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvoicePreview;