// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  total_amount: number;
  tax_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  customer_name?: string;
  company?: string;
}

const InvoiceVerification = () => {
  const { verificationId } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verifyInvoice = async () => {
      if (!verificationId) return;

      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            amount,
            total_amount,
            tax_amount,
            status,
            issue_date,
            due_date,
            customers (
              name,
              company
            )
          `)
          .eq('id', verificationId)
          .single();

        if (error || !data) {
          setIsValid(false);
        } else {
          setInvoice({
            ...data,
            customer_name: data.customers?.name,
            company: data.customers?.company
          });
          setIsValid(true);
        }
      } catch (error) {
        console.error('Error verifying invoice:', error);
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    verifyInvoice();
  }, [verificationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحقق من الفاتورة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              التحقق من صحة الفاتورة الإلكترونية
            </h1>
            <p className="text-muted-foreground">
              نظام التحقق الإلكتروني من صحة الفواتير
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                {isValid ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500" />
                )}
              </div>
              <CardTitle className="text-xl">
                {isValid ? 'الفاتورة صحيحة ومعتمدة' : 'الفاتورة غير صحيحة'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isValid && invoice ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        رقم الفاتورة
                      </label>
                      <p className="font-semibold">{invoice.invoice_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        الحالة
                      </label>
                      <div>
                        <Badge variant={invoice.status === 'مدفوعة' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        تاريخ الإصدار
                      </label>
                      <p className="font-semibold">
                        {new Date(invoice.issue_date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        تاريخ الاستحقاق
                      </label>
                      <p className="font-semibold">
                        {new Date(invoice.due_date).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      العميل
                    </label>
                    <p className="font-semibold">
                      {invoice.customer_name}
                      {invoice.company && ` - ${invoice.company}`}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">المبلغ الأساسي</label>
                        <p className="font-semibold">{invoice.amount.toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">الضريبة</label>
                        <p className="font-semibold">{invoice.tax_amount.toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">المجموع</label>
                        <p className="font-bold text-lg">{invoice.total_amount.toLocaleString()} ر.س</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">
                      تم التحقق من صحة هذه الفاتورة بنجاح
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      هذه فاتورة إلكترونية معتمدة وصالحة
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    فاتورة غير صحيحة
                  </h3>
                  <p className="text-red-600 mb-4">
                    لم يتم العثور على فاتورة بهذا الرقم المرجعي أو أن الرابط غير صحيح
                  </p>
                  <div className="text-sm text-red-500">
                    <p>يرجى التأكد من:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>صحة الرابط المرسل إليك</li>
                      <li>عدم انتهاء صلاحية الرابط</li>
                      <li>التواصل مع مصدر الفاتورة للتأكد</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 inline mr-2" />
            نظام التحقق الإلكتروني من الفواتير
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceVerification;