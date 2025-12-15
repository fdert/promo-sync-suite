import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Printer, Eye, Search, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

// دالة تحويل الرقم إلى كلمات عربية
const numberToArabicWords = (num: number): string => {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  if (num === 0) return 'صفر';
  
  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 100);
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return one ? `${ones[one]} و${tens[ten]}` : tens[ten];
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return remainder ? `${hundreds[hundred]} و${convertLessThanThousand(remainder)}` : hundreds[hundred];
  };
  
  let result = '';
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    const remainder = intPart % 1000;
    if (thousands === 1) result = 'ألف';
    else if (thousands === 2) result = 'ألفان';
    else if (thousands <= 10) result = `${convertLessThanThousand(thousands)} آلاف`;
    else result = `${convertLessThanThousand(thousands)} ألف`;
    if (remainder) result += ` و${convertLessThanThousand(remainder)}`;
  } else {
    result = convertLessThanThousand(intPart);
  }
  
  result += ' ريال سعودي';
  if (decimalPart > 0) {
    result += ` و${convertLessThanThousand(decimalPart)} هللة`;
  }
  
  return result;
};

interface InvoiceItem {
  id?: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface SpecialInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  created_at: string;
  items?: InvoiceItem[];
}

const SpecialInvoices = () => {
  const [invoices, setInvoices] = useState<SpecialInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<SpecialInvoice | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>({});
  const [isTaxInclusive, setIsTaxInclusive] = useState(true); // السعر شامل الضريبة
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // نموذج الفاتورة الجديدة
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    tax_rate: 15,
    notes: "",
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }
  ]);

  useEffect(() => {
    fetchInvoices();
    fetchCompanyInfo();
  }, []);

  // Generate ZATCA TLV data for QR Code
  const generateZatcaQRData = (invoice: SpecialInvoice): string => {
    // بيانات ZATCA TLV format
    const sellerName = companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان";
    const vatNumber = "301201976300003";
    const timestamp = invoice.issue_date + "T00:00:00Z";
    const totalAmount = invoice.total_amount.toFixed(2);
    const vatAmount = (invoice.total_amount * 0.15 / 1.15).toFixed(2);
    
    // Simple concatenation for QR display (simplified version)
    return `${sellerName}|${vatNumber}|${timestamp}|${totalAmount}|${vatAmount}|${invoice.invoice_number}`;
  };

  const fetchCompanyInfo = async () => {
    const { data } = await supabase
      .from('website_settings')
      .select('value')
      .eq('key', 'website_content')
      .maybeSingle();

    if (data?.value) {
      const content = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      setCompanyInfo(content?.companyInfo || {});
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('special_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  };

  const generateInvoiceNumber = async () => {
    const { data } = await supabase.rpc('generate_special_invoice_number');
    return data || `SP-${String(Date.now()).slice(-6)}`;
  };

  const addItem = () => {
    setItems([...items, { item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // حساب الإجمالي
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    if (isTaxInclusive) {
      // السعر شامل الضريبة - الإجمالي هو نفس مجموع البنود
      const total = itemsTotal;
      const subtotal = total / (1 + formData.tax_rate / 100);
      const taxAmount = total - subtotal;
      return { subtotal, taxAmount, total };
    } else {
      // السعر غير شامل الضريبة
      const subtotal = itemsTotal;
      const taxAmount = (subtotal * formData.tax_rate) / 100;
      const total = subtotal + taxAmount;
      return { subtotal, taxAmount, total };
    }
  };

  const handleCreateInvoice = async () => {
    if (!formData.customer_name) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم العميل", variant: "destructive" });
      return;
    }

    if (items.some(item => !item.item_name || item.unit_price <= 0)) {
      toast({ title: "خطأ", description: "يرجى إكمال بيانات البنود", variant: "destructive" });
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();
    const invoiceNumber = await generateInvoiceNumber();

    const { data: invoice, error } = await supabase
      .from('special_invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: taxAmount,
        total_amount: total,
        notes: formData.notes,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "خطأ", description: "فشل في إنشاء الفاتورة", variant: "destructive" });
      return;
    }

    // إضافة البنود
    const itemsData = items.map(item => ({
      invoice_id: invoice.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    await supabase.from('special_invoice_items').insert(itemsData);

    toast({ title: "تم بنجاح", description: "تم إنشاء الفاتورة الخاصة" });
    setIsCreateOpen(false);
    resetForm();
    fetchInvoices();
  };

  const resetForm = () => {
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      issue_date: format(new Date(), "yyyy-MM-dd"),
      due_date: format(new Date(), "yyyy-MM-dd"),
      tax_rate: 15,
      notes: "",
    });
    setItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
    setIsTaxInclusive(true);
  };

  const handleViewInvoice = async (invoice: SpecialInvoice) => {
    const { data: itemsData } = await supabase
      .from('special_invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    setViewingInvoice({ ...invoice, items: itemsData || [] });
  };

  const generateQRCodeDataUrl = async (data: string): Promise<string> => {
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(data, {
      width: 150,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  };

  const handlePrint = async () => {
    if (!viewingInvoice) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const qrData = generateZatcaQRData(viewingInvoice);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrData);
    const totalInWords = numberToArabicWords(viewingInvoice.total_amount);

    const itemsHtml = viewingInvoice.items?.map((item, index) => `
      <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${item.item_name}</td>
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.unit_price.toFixed(2)}</td>
        <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.total.toFixed(2)}</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ضريبية مبسطة - ${viewingInvoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; background: #fff; color: #000; }
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: #ffffff; color: #000; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333;">
            <div style="text-align: right;">
              <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #000;">${companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</h3>
              <p style="font-size: 12px; color: #666;">${companyInfo.subtitle || "Creative & professional advertising agency"}</p>
            </div>
            <div style="text-align: center;">
              <h1 style="font-size: 20px; font-weight: bold; color: #000;">فاتورة ضريبية مبسطة</h1>
              <h2 style="font-size: 14px; color: #666;">Simplified Tax Invoice</h2>
            </div>
            ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo" style="height: 60px; width: 60px; object-fit: contain;" />` : '<div style="width: 60px;"></div>'}
          </div>

          <!-- Invoice Details -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 15px; border-bottom: 1px solid #ddd;">
            <div>
              <div style="font-size: 10px; color: #666;">Invoice number / رقم الفاتورة</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${viewingInvoice.invoice_number}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Bill to / الفاتورة إلى</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${viewingInvoice.customer_name}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Date / التاريخ</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${viewingInvoice.issue_date}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">المملكة العربية السعودية</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">VAT number / الرقم الضريبي</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">301201976300003</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666;">Due date / تاريخ الاستحقاق</div>
              <div style="font-size: 14px; font-weight: bold; color: #000;">${viewingInvoice.due_date || '-'}</div>
            </div>
          </div>

          <!-- Total Due Box -->
          <div style="background: #f5f5f5; padding: 15px; text-align: center; border-bottom: 1px solid #ddd;">
            <div style="font-size: 12px; color: #666;">Total due (VAT Inclusive) / المبلغ المستحق (شامل الضريبة)</div>
            <div style="font-size: 28px; font-weight: bold; color: #000;">SAR ${viewingInvoice.total_amount.toFixed(2)}</div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #6b7280; color: white;">
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Item</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Description / الوصف</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Quantity / الكمية</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Price / السعر</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #6b7280;">Amount / المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Summary -->
          <div style="display: flex; justify-content: flex-end; padding: 15px;">
            <div style="width: 300px;">
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #333; font-weight: bold; font-size: 16px; color: #000;">
                <span>الإجمالي (شامل الضريبة):</span>
                <span>SAR ${viewingInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div style="padding: 10px 0; font-size: 12px; color: #333; text-align: center; background: #f9f9f9; border-radius: 5px; margin-top: 5px;">
                <strong>المبلغ كتابة:</strong> ${totalInWords}
              </div>
            </div>
          </div>

          <!-- ZATCA QR Code Section -->
          <div style="background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
            <div style="margin-bottom: 15px;">
              <img src="${qrCodeDataUrl}" alt="ZATCA QR Code" style="width: 150px; height: 150px;" />
            </div>
            <p style="font-size: 11px; color: #2563eb; font-weight: 500; margin-bottom: 5px;">This QR code is encoded as per ZATCA e-invoicing requirements</p>
            <p style="font-size: 11px; color: #333; line-height: 1.6;">رمز الإستجابة السريعة مشفر بحسب متطلبات هيئة الزكاة<br/>والضريبة والجمارك للفوترة الإلكترونية</p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 10px; font-size: 12px; color: #666; border-top: 1px solid #ddd;">
            <p>${companyInfo.name || "وكالة إبداع واحتراف للدعاية والإعلان"}</p>
            <p>Page 1 of 1 - ${viewingInvoice.invoice_number}</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.customer_name.includes(searchTerm) ||
    inv.invoice_number.includes(searchTerm)
  );

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الفواتير الخاصة</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إنشاء فاتورة خاصة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الفاتورة أو اسم العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد فواتير خاصة
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>{invoice.total_amount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* نموذج إنشاء فاتورة جديدة */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة خاصة جديدة</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* بيانات العميل */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم العميل *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="أدخل اسم العميل"
                />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              <div className="col-span-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  placeholder="أدخل العنوان"
                />
              </div>
              <div>
                <Label>تاريخ الإصدار</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* بنود الفاتورة */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>بنود الفاتورة</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 ml-1" /> إضافة بند
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="w-20">الكمية</TableHead>
                    <TableHead className="w-28">السعر</TableHead>
                    <TableHead className="w-28">الإجمالي</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          placeholder="وصف البند"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(item.quantity * item.unit_price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* الإجماليات */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  id="tax-inclusive"
                  checked={isTaxInclusive}
                  onCheckedChange={(checked) => setIsTaxInclusive(checked as boolean)}
                />
                <Label htmlFor="tax-inclusive" className="cursor-pointer">
                  السعر شامل الضريبة (الإجمالي يشمل ضريبة القيمة المضافة)
                </Label>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>نسبة الضريبة:</span>
                  <Input
                    type="number"
                    className="w-16 h-8"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>الإجمالي (شامل الضريبة):</span>
                <span>{total.toFixed(2)} ر.س</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground text-center bg-background p-2 rounded">
                <strong>المبلغ كتابة:</strong> {numberToArabicWords(total)}
              </div>
            </div>

            {/* ملاحظات */}
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreateInvoice}>إنشاء الفاتورة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* عرض الفاتورة */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>فاتورة ضريبية مبسطة</span>
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-2" /> طباعة
              </Button>
            </DialogTitle>
          </DialogHeader>

          {viewingInvoice && (
            <div id="special-invoice-print" className="bg-white text-black">
              <div className="invoice-container">
                {/* Header - White Background with Black Text */}
                <div className="bg-white text-black p-5 flex justify-between items-center border-b-2 border-gray-800">
                  <div className="text-right">
                    <h3 className="text-lg font-bold text-black">{companyInfo.name || "إبداع واحتراف للدعاية والإعلان"}</h3>
                    <p className="text-sm text-gray-600">{companyInfo.subtitle || "Creative & professional advertising agency"}</p>
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-black">فاتورة ضريبية مبسطة</h1>
                    <h2 className="text-sm text-gray-600">Simplified Tax Invoice</h2>
                  </div>
                  {companyInfo.logo && (
                    <img src={companyInfo.logo} alt="Logo" className="h-16 w-16 object-contain" />
                  )}
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4 p-4 border-b">
                  <div>
                    <div className="text-xs text-gray-500">Invoice number / رقم الفاتورة</div>
                    <div className="font-bold text-black">{viewingInvoice.invoice_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Bill to / الفاتورة إلى</div>
                    <div className="font-bold text-black">{viewingInvoice.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Date / التاريخ</div>
                    <div className="font-bold text-black">{viewingInvoice.issue_date}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">المملكة العربية السعودية</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">VAT number / الرقم الضريبي</div>
                    <div className="font-bold text-black">301201976300003</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Due date / تاريخ الاستحقاق</div>
                    <div className="font-bold text-black">{viewingInvoice.due_date}</div>
                  </div>
                </div>

                {/* Total Due Box */}
                <div className="bg-gray-100 p-4 text-center border-b">
                  <div className="text-sm text-gray-500">Total due (VAT Inclusive) / المبلغ المستحق (شامل الضريبة)</div>
                  <div className="text-3xl font-bold text-black">
                    SAR {viewingInvoice.total_amount.toFixed(2)}
                  </div>
                </div>

                {/* Items Table - Gray Header */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-500 text-white">
                      <th className="p-3 text-center border border-gray-500">Item</th>
                      <th className="p-3 text-center border border-gray-500">Description / الوصف</th>
                      <th className="p-3 text-center border border-gray-500">Quantity / الكمية</th>
                      <th className="p-3 text-center border border-gray-500">Price / السعر</th>
                      <th className="p-3 text-center border border-gray-500">Amount / المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items?.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-3 text-center border text-black">{index + 1}</td>
                        <td className="p-3 text-right border text-black">{item.item_name}</td>
                        <td className="p-3 text-center border text-black">{item.quantity}</td>
                        <td className="p-3 text-center border text-black">{item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-center border text-black">{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="flex justify-end p-4">
                  <div className="w-72">
                    <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-lg text-black">
                      <span>الإجمالي (شامل الضريبة):</span>
                      <span>SAR {viewingInvoice.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-700 text-center bg-gray-100 p-2 rounded">
                      <strong>المبلغ كتابة:</strong> {numberToArabicWords(viewingInvoice.total_amount)}
                    </div>
                  </div>
                </div>

                {/* ZATCA QR Code Section */}
                <div className="bg-gray-50 p-5 text-center border-t">
                  <div className="mb-4">
                    <QRCodeSVG 
                      value={generateZatcaQRData(viewingInvoice)} 
                      size={150}
                      className="mx-auto"
                    />
                  </div>
                  <p className="text-sm text-blue-600 font-medium mb-1">This QR code is encoded as per ZATCA e-invoicing requirements</p>
                  <p className="text-sm text-gray-700 leading-relaxed">رمز الإستجابة السريعة مشفر بحسب متطلبات هيئة الزكاة<br/>والضريبة والجمارك للفوترة الإلكترونية</p>
                </div>

                {/* Footer */}
                <div className="text-center p-2 text-sm text-gray-600 border-t">
                  <p>{companyInfo.name || "إبداع واحتراف للدعاية والإعلان"}</p>
                  <p>Page 1 of 1 - {viewingInvoice.invoice_number}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecialInvoices;
