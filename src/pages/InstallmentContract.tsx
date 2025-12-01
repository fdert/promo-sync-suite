import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const InstallmentContract = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [contractContent, setContractContent] = useState("");

  useEffect(() => {
    fetchContractDetails();
  }, [token]);

  const fetchContractDetails = async () => {
    try {
      // البحث عن الخطة باستخدام token الدقيق في حقل notes
      const { data: plans } = await supabase
        .from('installment_plans')
        .select(`
          *,
          orders!inner (
            order_number,
            total_amount,
            customers!inner (
              name,
              phone,
              whatsapp
            )
          )
        `)
        .ilike('notes', `%CONTRACT_TOKEN:${token}%`);

      const planData = plans?.[0];
      if (!planData) {
        toast({
          title: "خطأ",
          description: "العقد غير موجود أو الرابط غير صحيح",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setPlan(planData);

      const { data: installmentsData } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', planData.id)
        .order('installment_number', { ascending: true });

      setInstallments(installmentsData || []);

      const defaultTemplate = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 28px;">عقد تقسيط</h1>
            <p style="color: #666;">رقم العقد: {{contract_number}}</p>
          </div>
          <div style="margin-bottom: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">تفاصيل الطلب</h2>
            <p><strong>رقم الطلب:</strong> {{order_number}}</p>
            <p><strong>اسم العميل:</strong> {{customer_name}}</p>
            <p><strong>رقم الجوال:</strong> {{customer_phone}}</p>
            <p><strong>تاريخ العقد:</strong> {{contract_date}}</p>
          </div>
          <div style="margin-bottom: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">التفاصيل المالية</h2>
            <p><strong>إجمالي المبلغ:</strong> {{total_amount}}</p>
            <p><strong>عدد الأقساط:</strong> {{number_of_installments}} قسط</p>
            <p><strong>قيمة القسط الشهري:</strong> {{installment_amount}}</p>
          </div>
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">جدول الدفعات</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">رقم القسط</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">المبلغ</th>
                  <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">تاريخ الاستحقاق</th>
                </tr>
              </thead>
              <tbody>{{installments_table}}</tbody>
            </table>
          </div>
          <div style="margin-bottom: 30px; padding: 20px; background-color: #fff9e6; border-radius: 8px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 15px;">شروط وأحكام العقد</h2>
            <ol style="line-height: 1.8;">
              <li>يلتزم الطرف الثاني (العميل) بسداد الأقساط في المواعيد المحددة.</li>
              <li>في حالة التأخر عن سداد أي قسط لمدة تزيد عن 7 أيام، يحق للطرف الأول اتخاذ الإجراءات القانونية اللازمة.</li>
              <li>يحق للطرف الثاني سداد المبلغ المتبقي بالكامل في أي وقت دون فوائد إضافية.</li>
              <li>يعتبر هذا العقد ساري المفعول من تاريخ توقيعه إلكترونياً.</li>
              <li>يخضع هذا العقد لأنظمة المملكة العربية السعودية.</li>
            </ol>
          </div>
        </div>
      `;

      renderContract(planData, installmentsData || [], defaultTemplate);
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحميل العقد",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContract = (planData: any, installmentsData: any[], template: string) => {
    const installmentAmount = planData.total_amount / planData.number_of_installments;
    const installmentsTable = installmentsData
      .map(
        (inst, idx) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">القسط ${idx + 1}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inst.amount)}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${format(new Date(inst.due_date), 'dd/MM/yyyy', { locale: ar })}</td>
        </tr>
      `
      )
      .join('');

    const contractNumber = planData.notes?.match(/CONTRACT_NUMBER:([A-Z0-9-]+)/)?.[1] || planData.id?.substring(0, 8).toUpperCase();
    const customers = Array.isArray(planData.orders) ? planData.orders[0]?.customers?.[0] : planData.orders?.customers;
    const orderNumber = Array.isArray(planData.orders) ? planData.orders[0]?.order_number : planData.orders?.order_number;

    let content = template
      .replace(/\{\{contract_number\}\}/g, contractNumber)
      .replace(/\{\{order_number\}\}/g, orderNumber || '')
      .replace(/\{\{customer_name\}\}/g, customers?.name || '')
      .replace(/\{\{customer_phone\}\}/g, customers?.phone || customers?.whatsapp || '')
      .replace(/\{\{contract_date\}\}/g, format(new Date(planData.created_at), 'dd/MM/yyyy', { locale: ar }))
      .replace(/\{\{total_amount\}\}/g, formatCurrency(planData.total_amount))
      .replace(/\{\{number_of_installments\}\}/g, planData.number_of_installments)
      .replace(/\{\{installment_amount\}\}/g, formatCurrency(installmentAmount))
      .replace(/\{\{installments_table\}\}/g, installmentsTable);

    setContractContent(content);
  };

  const handleConfirmContract = async () => {
    if (!plan) return;

    setConfirming(true);
    try {
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      const { error } = await supabase
        .from('installment_plans')
        .update({
          notes: `${plan.notes || ''} | مؤكد بتاريخ ${new Date().toISOString()} من IP: ${ipAddress}`,
          status: 'active',
        })
        .eq('id', plan.id);

      if (error) throw error;

      toast({
        title: "تم التأكيد",
        description: "تم تأكيد العقد بنجاح",
      });

      setPlan({ ...plan, status: 'confirmed' });
    } catch (error: any) {
      console.error('Error confirming contract:', error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تأكيد العقد",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadPDF = async () => {
    const contractElement = document.getElementById('contract-content');
    if (!contractElement) return;

    try {
      const canvas = await html2canvas(contractElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const contractNumber = plan.notes?.match(/CONTRACT_NUMBER:([A-Z0-9-]+)/)?.[1] || plan.id?.substring(0, 8);
      pdf.save(`عقد_تقسيط_${contractNumber}.pdf`);

      toast({
        title: "تم التحميل",
        description: "تم تحميل العقد بنجاح",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل العقد",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">جاري تحميل العقد...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg">العقد غير موجود</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConfirmed = plan.status === 'confirmed' || plan.status === 'completed' || plan.notes?.includes('مؤكد بتاريخ');

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">عقد التقسيط الإلكتروني</h1>
          {isConfirmed && (
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">تم تأكيد العقد بنجاح</span>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div
              id="contract-content"
              dangerouslySetInnerHTML={{ __html: contractContent }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isConfirmed && (
                <Button
                  onClick={handleConfirmContract}
                  disabled={confirming}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                      جاري التأكيد...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 ml-2" />
                      أوافق على العقد
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Download className="h-5 w-5 ml-2" />
                تحميل نسخة PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>هذا العقد محمي ومُوثّق إلكترونياً</p>
          <p>رقم العقد: {plan.notes?.match(/CONTRACT_NUMBER:([A-Z0-9-]+)/)?.[1] || plan.id?.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
};

export default InstallmentContract;
