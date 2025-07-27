import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Printer, MessageCircle, Calendar, Filter, Trash2, X, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import InvoicePrint from "@/components/InvoicePrint";
import InvoicePreview from "@/components/InvoicePreview";

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customer_id: "",
    order_id: "",
    amount: "",
    tax_amount: "",
    due_date: "",
    is_deferred: false,
    notes: "",
    payment_method: ""
  });
  const [invoiceItems, setInvoiceItems] = useState([
    { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }
  ]);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [orders, setOrders] = useState([]);
  const [editingItems, setEditingItems] = useState([
    { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }
  ]);

  const { toast } = useToast();

  // جلب الفواتير من قاعدة البيانات
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers(name, phone, whatsapp_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الفواتير",
          variant: "destructive",
        });
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // جلب العملاء
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('status', 'نشط')
        .order('name');

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // جلب دور المستخدم
  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setUserRole(data.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  // جلب الطلبات
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_id')
        .order('order_number');

      if (!error) {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchUserRole();
    fetchOrders();
  }, []);

  // إضافة بند جديد
  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
  };

  // حذف بند
  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  // تحديث بند
  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // حساب الإجمالي التلقائي
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_amount = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setInvoiceItems(updatedItems);
    updateInvoiceTotal(updatedItems);
  };

  // تحديث إجمالي الفاتورة
  const updateInvoiceTotal = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total_amount, 0);
    const tax = parseFloat(newInvoice.tax_amount) || 0;
    const total = subtotal + tax;
    setNewInvoice({ ...newInvoice, amount: total.toString() });
  };

  // إضافة فاتورة جديدة
  const handleAddInvoice = async () => {
    if (!newInvoice.customer_id || !newInvoice.due_date || invoiceItems.some(item => !item.item_name || item.unit_price <= 0)) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة وإضافة بنود صالحة",
        variant: "destructive",
      });
      return;
    }

    try {
      // التحقق من عدم وجود فاتورة مسبقة للطلب (إذا تم اختيار طلب)
      if (newInvoice.order_id) {
        const { data: existingInvoice, error: checkError } = await supabase
          .from('invoices')
          .select('id, invoice_number')
          .eq('order_id', newInvoice.order_id)
          .single();

        if (existingInvoice && !checkError) {
          toast({
            title: "خطأ",
            description: `يوجد فاتورة مسبقة للطلب برقم ${existingInvoice.invoice_number}`,
            variant: "destructive",
          });
          return;
        }
      }

      // حساب الإجماليات
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total_amount, 0);
      const taxAmount = parseFloat(newInvoice.tax_amount) || 0;
      const totalAmount = subtotal + taxAmount;

      // إنشاء رقم الفاتورة
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) {
        console.error('Error generating invoice number:', numberError);
        return;
      }

      // إضافة الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: newInvoice.customer_id,
          order_id: newInvoice.order_id || null,
          amount: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: newInvoice.due_date,
          is_deferred: newInvoice.is_deferred,
          payment_method: newInvoice.payment_method,
          notes: newInvoice.notes,
          status: 'قيد الانتظار',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error adding invoice:', invoiceError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // إضافة بنود الفاتورة
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error adding invoice items:', itemsError);
        // حذف الفاتورة إذا فشلت إضافة البنود
        await supabase.from('invoices').delete().eq('id', invoice.id);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة بنود الفاتورة",
          variant: "destructive",
        });
        return;
      }

      await fetchInvoices();
      
      // إرسال إشعار واتس آب تلقائياً للعميل
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const notificationResponse = await supabase.functions.invoke('send-invoice-notifications', {
            body: {
              type: 'invoice_created',
              invoice_id: invoice.id,
              customer_id: newInvoice.customer_id
            }
          });

          if (notificationResponse.error) {
            console.error('Error sending WhatsApp notification:', notificationResponse.error);
            // لا نوقف العملية حتى لو فشل الإرسال
            toast({
              title: "تم إنشاء الفاتورة",
              description: "تم إنشاء الفاتورة بنجاح، لكن فشل إرسال إشعار الواتس آب",
              variant: "destructive",
            });
          } else {
            console.log('WhatsApp notification sent successfully:', notificationResponse.data);
            toast({
              title: "تم إنشاء الفاتورة",
              description: "تم إنشاء الفاتورة وإرسال إشعار الواتس آب بنجاح",
            });
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        toast({
          title: "تم إنشاء الفاتورة",
          description: "تم إنشاء الفاتورة بنجاح، لكن فشل إرسال إشعار الواتس آب",
          variant: "destructive",
        });
      }

      setNewInvoice({
        customer_id: "",
        order_id: "",
        amount: "",
        tax_amount: "",
        due_date: "",
        is_deferred: false,
        notes: "",
        payment_method: ""
      });
      setInvoiceItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
      setIsAddDialogOpen(false);
      
      toast({
        title: "تم إنشاء الفاتورة",
        description: "تم إنشاء الفاتورة بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // طباعة الفاتورة
  const handlePrintInvoice = async (invoice) => {
    try {
      // جلب بنود الفاتورة
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // إنشاء محتوى HTML للفاتورة
      const invoiceHTML = generateInvoiceHTML(invoice, items || []);
      
      // إنشاء نافذة طباعة جديدة
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        
        // انتظار تحميل المحتوى ثم الطباعة
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };

        // تحديث عداد الطباعة
        await supabase
          .from('invoices')
          .update({ 
            print_count: (invoice.print_count || 0) + 1,
            last_printed_at: new Date().toISOString()
          })
          .eq('id', invoice.id);
        
        toast({
          title: "نجح",
          description: "تم إرسال الفاتورة للطباعة",
        });
      }
      
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في طباعة الفاتورة",
        variant: "destructive",
      });
    }
  };

  // دالة إنشاء HTML للفاتورة
  const generateInvoiceHTML = (invoice, items) => {
    const companyInfo = {
      name: "شركتك",
      phone: "رقم الهاتف",
    };

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة ${invoice.invoice_number}</title>
    <style>
        @page {
            size: A5 portrait;
            margin: 10mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.2;
            margin: 0;
            padding: 5mm;
            background: white;
            color: black;
            direction: rtl;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
        
        .header h1 {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 3px 0;
            color: #000;
        }
        
        .header h2 {
            font-size: 13px;
            font-weight: bold;
            margin: 0 0 3px 0;
            color: #000;
        }
        
        .header-info {
            font-size: 9px;
            color: #555;
        }
        
        .customer-info {
            background-color: #f8f9fa;
            padding: 4px;
            border: 1px solid #ccc;
            border-radius: 2px;
            margin-bottom: 8px;
            font-size: 9px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-bottom: 8px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #555;
            padding: 2px;
            text-align: center;
        }
        
        .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        .items-table .item-name {
            text-align: right;
        }
        
        .totals {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
        }
        
        .totals-box {
            width: 120px;
            font-size: 9px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            border-bottom: 1px solid #ccc;
        }
        
        .final-total {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-weight: bold;
            font-size: 10px;
            border-top: 2px solid #000;
        }
        
        .payment-info {
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            margin-bottom: 6px;
            padding: 3px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
        }
        
        .footer {
            text-align: center;
            font-size: 7px;
            color: #888;
            border-top: 1px solid #ccc;
            padding-top: 3px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="flex: 1;">
            <h1>${companyInfo.name}</h1>
            <div class="header-info">${companyInfo.phone}</div>
        </div>
        <div style="text-align: left; flex: 1;">
            <h2>فاتورة</h2>
            <div class="header-info">
                <div><strong>رقم:</strong> ${invoice.invoice_number}</div>
                <div><strong>التاريخ:</strong> ${new Date(invoice.issue_date).toLocaleDateString('ar-SA')}</div>
            </div>
        </div>
    </div>

    <div class="customer-info">
        <span style="font-weight: bold;">العميل: </span>${invoice.customers?.name || ''}
        ${invoice.customers?.phone ? `| هاتف: ${invoice.customers.phone}` : ''}
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th style="text-align: right;">البند</th>
                <th style="width: 15%;">الكمية</th>
                <th style="width: 20%;">السعر</th>
                <th style="width: 20%;">المجموع</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td class="item-name" style="font-size: 8px;">${item.item_name}</td>
                    <td style="font-size: 8px;">${item.quantity}</td>
                    <td style="font-size: 8px;">${item.unit_price.toFixed(2)}</td>
                    <td style="font-size: 8px;">${item.total_amount.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-box">
            <div class="total-row">
                <span>المجموع:</span>
                <span>${invoice.amount.toFixed(2)} ر.س</span>
            </div>
            <div class="total-row">
                <span>الضريبة:</span>
                <span>${invoice.tax_amount.toFixed(2)} ر.س</span>
            </div>
            <div class="final-total">
                <span>الإجمالي:</span>
                <span>${invoice.total_amount.toFixed(2)} ر.س</span>
            </div>
        </div>
    </div>

    <div class="payment-info">
        <span><strong>نوع الدفع:</strong> ${invoice.payment_type}</span>
        <span><strong>الحالة:</strong> ${invoice.status}</span>
    </div>

    ${invoice.notes ? `
        <div style="font-size: 8px; margin-bottom: 6px; padding: 2px; font-style: italic; color: #666;">
            <strong>ملاحظات:</strong> ${invoice.notes}
        </div>
    ` : ''}

    <div class="footer">
        شكراً لثقتكم
    </div>
</body>
</html>
    `;
  };

  // معاينة الفاتورة
  const handlePreviewInvoice = async (invoice) => {
    try {
      // جلب بنود الفاتورة
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // تحديث الحالة للمعاينة
      setPreviewInvoice(invoice);
      setPreviewItems(items || []);
      setIsPreviewOpen(true);
      
    } catch (error) {
      console.error('Error previewing invoice:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في معاينة الفاتورة",
        variant: "destructive",
      });
    }
  };

  // حذف الفاتورة (للمدراء فقط)
  const handleDeleteInvoice = async (invoice) => {
    try {
      // حذف بنود الفاتورة أولاً
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error('Error deleting invoice items:', itemsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف بنود الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // حذف الفاتورة
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (invoiceError) {
        console.error('Error deleting invoice:', invoiceError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف الفاتورة",
          variant: "destructive",
        });
        return;
      }

      await fetchInvoices();
      toast({
        title: "تم الحذف",
        description: "تم حذف الفاتورة بنجاح",
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  // تعديل الفاتورة (للمدراء فقط)
  const handleEditInvoice = async (invoice) => {
    try {
      // جلب بنود الفاتورة للتعديل
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        return;
      }

      // تحديث حالة التعديل
      setEditingInvoice(invoice);
      setEditingItems(items || [{ item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error editing invoice:', error);
    }
  };

  // حفظ تعديلات الفاتورة
  const handleSaveEditInvoice = async () => {
    if (!editingInvoice || editingItems.some(item => !item.item_name || item.unit_price <= 0)) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      // حساب الإجماليات
      const subtotal = editingItems.reduce((sum, item) => sum + item.total_amount, 0);
      const taxAmount = parseFloat(editingInvoice.tax_amount) || 0;
      const totalAmount = subtotal + taxAmount;

      // تحديث الفاتورة
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_id: editingInvoice.customer_id,
          amount: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          due_date: editingInvoice.due_date,
          is_deferred: editingInvoice.is_deferred,
          payment_method: editingInvoice.payment_method,
          notes: editingInvoice.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInvoice.id);

      if (invoiceError) {
        console.error('Error updating invoice:', invoiceError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // حذف البنود القديمة
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', editingInvoice.id);

      // إضافة البنود الجديدة
      const itemsToInsert = editingItems.map(item => ({
        invoice_id: editingInvoice.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error updating invoice items:', itemsError);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث بنود الفاتورة",
          variant: "destructive",
        });
        return;
      }

      await fetchInvoices();
      
      // إرسال إشعار واتس آب بالتعديل
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.functions.invoke('send-invoice-notifications', {
            body: {
              type: 'invoice_updated',
              invoice_id: editingInvoice.id,
              customer_id: editingInvoice.customer_id
            }
          });
        }
      } catch (notificationError) {
        console.error('Error sending update notification:', notificationError);
      }

      setIsEditDialogOpen(false);
      setEditingInvoice(null);
      setEditingItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }]);
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث الفاتورة وإرسال إشعار الواتس آب بنجاح",
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  // تحديث حالة الفاتورة مع إرسال إشعار
  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: newStatus,
          payment_date: newStatus === 'مدفوع' ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error updating invoice status:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث حالة الفاتورة",
          variant: "destructive",
        });
        return;
      }

      // إرسال إشعار إذا تم الدفع
      if (newStatus === 'مدفوع') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.functions.invoke('send-invoice-notifications', {
              body: {
                type: 'invoice_paid',
                invoice_id: invoiceId
              }
            });
          }
        } catch (notificationError) {
          console.error('Error sending payment notification:', notificationError);
        }
      }

      await fetchInvoices();
      toast({
        title: "تم التحديث",
        description: `تم تحديث حالة الفاتورة إلى ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  };

  // إرسال تذكير للفواتير المتأخرة
  const handleSendOverdueReminder = async (invoice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.functions.invoke('send-invoice-notifications', {
          body: {
            type: 'invoice_overdue',
            invoice_id: invoice.id,
            customer_id: invoice.customer_id
          }
        });

        if (error) {
          console.error('Error sending overdue reminder:', error);
          toast({
            title: "خطأ",
            description: "فشل إرسال تذكير الدفع",
            variant: "destructive",
          });
        } else {
          toast({
            title: "تم الإرسال",
            description: "تم إرسال تذكير الدفع بنجاح",
          });
          
          // تحديث وقت إرسال التذكير
          await supabase
            .from('invoices')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', invoice.id);
        }
      }
    } catch (error) {
      console.error('Error sending overdue reminder:', error);
    }
  };

  // إرسال الفاتورة عبر واتس آب
  const handleSendWhatsApp = async (invoice) => {
    try {
      const customerPhone = invoice.customers?.whatsapp_number || invoice.customers?.phone;
      if (!customerPhone) {
        toast({
          title: "خطأ",
          description: "رقم الواتس آب غير متوفر للعميل",
          variant: "destructive",
        });
        return;
      }

      // هنا يمكن استدعاء API لإرسال الواتس آب
      const message = `مرحباً ${invoice.customers?.name}، نود إعلامكم بأن فاتورتكم رقم ${invoice.invoice_number} بقيمة ${invoice.total_amount} ر.س جاهزة للدفع. تاريخ الاستحقاق: ${invoice.due_date}`;
      
      // رابط واتس آب
      const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // تحديث وقت الإرسال
      await supabase
        .from('invoices')
        .update({ whatsapp_sent_at: new Date().toISOString() })
        .eq('id', invoice.id);

      toast({
        title: "نجح",
        description: "تم فتح واتس آب لإرسال الفاتورة",
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "مدفوع":
        return <Badge className="bg-success/10 text-success">مدفوع</Badge>;
      case "قيد الانتظار":
        return <Badge className="bg-warning/10 text-warning-foreground">قيد الانتظار</Badge>;
      case "متأخر":
        return <Badge className="bg-destructive/10 text-destructive">متأخر</Badge>;
      default:
        return <Badge>غير محدد</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.customers?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 screen-only">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الفواتير</h1>
          <p className="text-muted-foreground">إنشاء ومتابعة الفواتير والمدفوعات</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">العميل</Label>
                  <Select value={newInvoice.customer_id} onValueChange={(value) => setNewInvoice({...newInvoice, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order">الطلب (اختياري)</Label>
                  <Select value={newInvoice.order_id} onValueChange={(value) => setNewInvoice({...newInvoice, order_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطلب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون طلب</SelectItem>
                      {orders.filter(order => !newInvoice.customer_id || order.customer_id === newInvoice.customer_id).map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* بنود الفاتورة */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">بنود الفاتورة</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInvoiceItem}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة بند
                  </Button>
                </div>

                <div className="space-y-3">
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-3">
                        <Label htmlFor={`item_name_${index}`} className="text-xs">اسم البند</Label>
                        <Input
                          id={`item_name_${index}`}
                          value={item.item_name}
                          onChange={(e) => updateInvoiceItem(index, 'item_name', e.target.value)}
                          placeholder="اسم البند"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`description_${index}`} className="text-xs">الوصف</Label>
                        <Input
                          id={`description_${index}`}
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          placeholder="الوصف"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`quantity_${index}`} className="text-xs">الكمية</Label>
                        <Input
                          id={`quantity_${index}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`unit_price_${index}`} className="text-xs">السعر الفردي</Label>
                        <Input
                          id={`unit_price_${index}`}
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">الإجمالي</Label>
                        <Input
                          value={item.total_amount.toFixed(2)}
                          readOnly
                          className="text-sm bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeInvoiceItem(index)}
                          disabled={invoiceItems.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ملخص المبالغ */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي:</span>
                    <span>{invoiceItems.reduce((sum, item) => sum + item.total_amount, 0).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الضريبة:</span>
                    <span>{parseFloat(newInvoice.tax_amount) || 0} ر.س</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold border-t pt-2">
                    <span>الإجمالي النهائي:</span>
                    <span>{(invoiceItems.reduce((sum, item) => sum + item.total_amount, 0) + (parseFloat(newInvoice.tax_amount) || 0)).toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_amount">الضريبة (ر.س)</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    value={newInvoice.tax_amount}
                    onChange={(e) => {
                      setNewInvoice({...newInvoice, tax_amount: e.target.value});
                      updateInvoiceTotal(invoiceItems);
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">تاريخ الاستحقاق</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_method">طريقة الدفع</Label>
                  <Select value={newInvoice.payment_method} onValueChange={(value) => setNewInvoice({...newInvoice, payment_method: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نقدي">نقدي</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                      <SelectItem value="الشبكة">الشبكة</SelectItem>
                      <SelectItem value="شيك">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_deferred"
                    checked={newInvoice.is_deferred}
                    onCheckedChange={(checked) => setNewInvoice({...newInvoice, is_deferred: checked})}
                  />
                  <Label htmlFor="is_deferred">فاتورة آجلة</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddInvoice}>
                  إنشاء الفاتورة
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2 من الشهر الماضي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير المدفوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">75% من الإجمالي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,500 ر.س</div>
            <p className="text-xs text-muted-foreground">6 فواتير قيد الانتظار</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفواتير المتأخرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground">تحتاج متابعة فورية</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم أو رقم الفاتورة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>حالة الفاتورة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفواتير</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>جميع الفواتير الخاصة بك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{invoice.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">{invoice.customers?.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">{invoice.total_amount?.toLocaleString()} ر.س</p>
                    <p className="text-sm text-muted-foreground">تاريخ الاستحقاق: {invoice.due_date}</p>
                  </div>
                  {getStatusBadge(invoice.status)}
                  {invoice.status !== 'مدفوع' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleUpdateInvoiceStatus(invoice.id, 'مدفوع')}
                      className="text-xs bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      تأكيد الدفع
                    </Button>
                  )}
                  {invoice.is_deferred && (
                    <Badge variant="outline" className="text-warning border-warning/20">
                      آجل
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePreviewInvoice(invoice)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(invoice)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSendWhatsApp(invoice)}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  {(invoice.status === 'متأخر' || new Date(invoice.due_date) < new Date()) && invoice.status !== 'مدفوع' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendOverdueReminder(invoice)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      تذكير
                    </Button>
                  )}
                  {userRole === 'admin' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف الفاتورة رقم {invoice.invoice_number}؟ 
                              هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع القيود المحاسبية المرتبطة بها.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Print Component */}
      {printInvoice && (
        <InvoicePrint 
          invoice={printInvoice} 
          items={printItems}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الفاتورة {editingInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_customer">العميل</Label>
                  <Select 
                    value={editingInvoice.customer_id} 
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, customer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* بنود الفاتورة للتعديل */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">بنود الفاتورة</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItems([...editingItems, { item_name: "", description: "", quantity: 1, unit_price: 0, total_amount: 0 }])}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة بند
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-3">
                        <Label className="text-xs">اسم البند</Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => {
                            const updatedItems = [...editingItems];
                            updatedItems[index] = { ...updatedItems[index], item_name: e.target.value };
                            setEditingItems(updatedItems);
                          }}
                          placeholder="اسم البند"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">الوصف</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const updatedItems = [...editingItems];
                            updatedItems[index] = { ...updatedItems[index], description: e.target.value };
                            setEditingItems(updatedItems);
                          }}
                          placeholder="الوصف"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updatedItems = [...editingItems];
                            const quantity = parseFloat(e.target.value) || 0;
                            updatedItems[index] = { 
                              ...updatedItems[index], 
                              quantity,
                              total_amount: quantity * updatedItems[index].unit_price
                            };
                            setEditingItems(updatedItems);
                          }}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">السعر الفردي</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => {
                            const updatedItems = [...editingItems];
                            const price = parseFloat(e.target.value) || 0;
                            updatedItems[index] = { 
                              ...updatedItems[index], 
                              unit_price: price,
                              total_amount: updatedItems[index].quantity * price
                            };
                            setEditingItems(updatedItems);
                          }}
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">الإجمالي</Label>
                        <Input
                          value={item.total_amount.toFixed(2)}
                          readOnly
                          className="text-sm bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (editingItems.length > 1) {
                              setEditingItems(editingItems.filter((_, i) => i !== index));
                            }
                          }}
                          disabled={editingItems.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ملخص المبالغ للتعديل */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي:</span>
                    <span>{editingItems.reduce((sum, item) => sum + item.total_amount, 0).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الضريبة:</span>
                    <span>{parseFloat(editingInvoice.tax_amount) || 0} ر.س</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold border-t pt-2">
                    <span>الإجمالي النهائي:</span>
                    <span>{(editingItems.reduce((sum, item) => sum + item.total_amount, 0) + (parseFloat(editingInvoice.tax_amount) || 0)).toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_tax_amount">الضريبة (ر.س)</Label>
                  <Input
                    id="edit_tax_amount"
                    type="number"
                    value={editingInvoice.tax_amount}
                    onChange={(e) => setEditingInvoice({...editingInvoice, tax_amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_due_date">تاريخ الاستحقاق</Label>
                  <Input
                    id="edit_due_date"
                    type="date"
                    value={editingInvoice.due_date}
                    onChange={(e) => setEditingInvoice({...editingInvoice, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_payment_method">طريقة الدفع</Label>
                  <Select 
                    value={editingInvoice.payment_method} 
                    onValueChange={(value) => setEditingInvoice({...editingInvoice, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نقدي">نقدي</SelectItem>
                      <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                      <SelectItem value="الشبكة">الشبكة</SelectItem>
                      <SelectItem value="شيك">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_deferred"
                    checked={editingInvoice.is_deferred}
                    onCheckedChange={(checked) => setEditingInvoice({...editingInvoice, is_deferred: checked})}
                  />
                  <Label htmlFor="edit_is_deferred">فاتورة آجلة</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="edit_notes">ملاحظات</Label>
                <Textarea
                  id="edit_notes"
                  value={editingInvoice.notes}
                  onChange={(e) => setEditingInvoice({...editingInvoice, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveEditInvoice}>
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Component */}
      {previewInvoice && (
        <InvoicePreview 
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          invoice={previewInvoice} 
          items={previewItems}
          onPrint={() => {
            setIsPreviewOpen(false);
            handlePrintInvoice(previewInvoice);
          }}
        />
      )}
    </div>
  );
};

export default Invoices;