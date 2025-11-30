import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface InstallmentContractPrintProps {
  plan: any;
  installments: any[];
}

const InstallmentContractPrint = ({ plan, installments }: InstallmentContractPrintProps) => {
  const { toast } = useToast();
  const contractRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return;

    try {
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`عقد_تقسيط_${plan.contract_number}.pdf`);

      toast({
        title: "تم التحميل",
        description: "تم تحميل العقد بصيغة PDF",
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

  const installmentAmount = plan.total_amount / plan.number_of_installments;

  return (
    <div className="space-y-4">
      {/* أزرار الطباعة والتحميل */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 ml-2" />
          طباعة
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="h-4 w-4 ml-2" />
          تحميل PDF
        </Button>
      </div>

      {/* محتوى العقد */}
      <div ref={contractRef} className="bg-white p-8 rounded-lg" style={{ direction: 'rtl' }}>
        {/* رأس العقد */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">عقد تقسيط</h1>
          <p className="text-gray-600">رقم العقد: {plan.contract_number}</p>
        </div>

        {/* تفاصيل الطلب */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">تفاصيل الطلب</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">رقم الطلب</p>
              <p className="font-medium">{plan.orders.order_number}</p>
            </div>
            <div>
              <p className="text-gray-600">اسم العميل</p>
              <p className="font-medium">{plan.orders.customers.name}</p>
            </div>
            <div>
              <p className="text-gray-600">رقم الجوال</p>
              <p className="font-medium">{plan.orders.customers.phone || plan.orders.customers.whatsapp}</p>
            </div>
            <div>
              <p className="text-gray-600">تاريخ العقد</p>
              <p className="font-medium">
                {format(new Date(plan.created_at), 'dd/MM/yyyy', { locale: ar })}
              </p>
            </div>
          </div>
        </div>

        {/* التفاصيل المالية */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-bold mb-4">التفاصيل المالية</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">إجمالي المبلغ</p>
              <p className="font-medium text-lg">{formatCurrency(plan.total_amount)}</p>
            </div>
            <div>
              <p className="text-gray-600">عدد الأقساط</p>
              <p className="font-medium text-lg">{plan.number_of_installments} قسط</p>
            </div>
            <div>
              <p className="text-gray-600">قيمة القسط الشهري</p>
              <p className="font-medium text-lg">{formatCurrency(installmentAmount)}</p>
            </div>
          </div>
        </div>

        {/* جدول الدفعات */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">جدول الدفعات</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-right">رقم القسط</th>
                <th className="border border-gray-300 p-3 text-right">المبلغ</th>
                <th className="border border-gray-300 p-3 text-right">تاريخ الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst, idx) => (
                <tr key={inst.id}>
                  <td className="border border-gray-300 p-3">القسط {idx + 1}</td>
                  <td className="border border-gray-300 p-3">{formatCurrency(inst.amount)}</td>
                  <td className="border border-gray-300 p-3">
                    {format(new Date(inst.due_date), 'dd/MM/yyyy', { locale: ar })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الشروط والأحكام */}
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-r-4 border-yellow-500">
          <h2 className="text-xl font-bold mb-4">شروط وأحكام العقد</h2>
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>يلتزم الطرف الثاني (العميل) بسداد الأقساط في المواعيد المحددة.</li>
            <li>في حالة التأخر عن سداد أي قسط لمدة تزيد عن 7 أيام، يحق للطرف الأول اتخاذ الإجراءات القانونية اللازمة.</li>
            <li>يحق للطرف الثاني سداد المبلغ المتبقي بالكامل في أي وقت دون فوائد إضافية.</li>
            <li>يعتبر هذا العقد ساري المفعول من تاريخ توقيعه إلكترونياً.</li>
            <li>يخضع هذا العقد لأنظمة المملكة العربية السعودية.</li>
            <li>سيتم إرسال تذكير بموعد كل قسط قبل يومين وقبل يوم واحد من تاريخ الاستحقاق.</li>
            <li>يتم تسجيل الدفعات فور استلامها وإرسال إشعار تأكيد للعميل.</li>
          </ol>
        </div>

        {/* حالة العقد */}
        {plan.contract_status === 'confirmed' && plan.contract_confirmed_at && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
            <p className="font-medium text-green-800">تم تأكيد العقد إلكترونياً</p>
            <p className="text-sm text-gray-600">
              التاريخ: {format(new Date(plan.contract_confirmed_at), 'dd/MM/yyyy - hh:mm a', { locale: ar })}
            </p>
          </div>
        )}

        {/* ختام العقد */}
        <div className="mt-8 text-center text-sm text-gray-600 border-t pt-4">
          <p>هذا العقد محمي ومُوثّق إلكترونياً</p>
          <p>رقم العقد: {plan.contract_number}</p>
        </div>
      </div>
    </div>
  );
};

export default InstallmentContractPrint;
