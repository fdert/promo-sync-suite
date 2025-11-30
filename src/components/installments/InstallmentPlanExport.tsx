import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface InstallmentPlanExportProps {
  plans: any[];
}

const InstallmentPlanExport = ({ plans }: InstallmentPlanExportProps) => {
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Installment Plans Report', 105, 15, { align: 'center' });
    
    // Prepare data
    const tableData = plans.map(plan => [
      plan.order_number || '',
      plan.customer_name || '',
      plan.customer_phone || plan.customer_whatsapp || '',
      formatCurrency(plan.total_amount),
      formatCurrency(plan.total_paid),
      formatCurrency(plan.remaining_amount),
      `${plan.paid_installments}/${plan.number_of_installments}`,
      plan.plan_status || '',
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Order #', 'Customer', 'Phone', 'Total', 'Paid', 'Remaining', 'Installments', 'Status']],
      body: tableData,
      styles: { font: 'helvetica', fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    });

    doc.save(`installment-plans-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى PDF بنجاح",
    });
  };

  const exportToExcel = () => {
    const exportData = plans.map(plan => ({
      'رقم الطلب': plan.order_number,
      'اسم العميل': plan.customer_name,
      'رقم الجوال': plan.customer_phone || plan.customer_whatsapp,
      'إجمالي المبلغ': plan.total_amount,
      'المدفوع': plan.total_paid,
      'المتبقي': plan.remaining_amount,
      'الأقساط المدفوعة': plan.paid_installments,
      'إجمالي الأقساط': plan.number_of_installments,
      'الحالة': plan.plan_status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Installment Plans");
    
    XLSX.writeFile(wb, `installment-plans-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "تم التصدير",
      description: "تم تصدير التقرير إلى Excel بنجاح",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 ml-2" />
          تصدير PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileText className="h-4 w-4 ml-2" />
          تصدير Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InstallmentPlanExport;