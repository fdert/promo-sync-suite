import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Search,
  Eye,
  Upload,
  FileText,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Image,
  Printer,
  Edit,
  CreditCard,
  Receipt,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

interface Order {
  id: string;
  order_number: string;
  service_name: string;
  description: string;
  status: string;
  priority: string;
  amount: number;
  paid_amount: number;
  payment_type?: string;
  due_date: string;
  created_at: string;
  customer_id?: string;
  customers?: {
    name: string;
    whatsapp_number: string;
    phone: string;
  };
  order_items?: {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    description?: string;
  }[];
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp_number?: string;
}

interface Service {
  id: string;
  name: string;
  base_price?: number;
}

interface OrderItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface PrintFile {
  id: string;
  file_name: string;
  file_path: string;
  file_category: string;
  file_size: number;
  upload_date: string;
  sent_to_customer: boolean;
  sent_at: string | null;
  is_approved: boolean;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // حالات رفع الملفات
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedOrderForUpload, setSelectedOrderForUpload] = useState<Order | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileCategory, setFileCategory] = useState<"design" | "print">("design");
  
  // حالات عرض الملفات
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedOrderFiles, setSelectedOrderFiles] = useState<Order | null>(null);
  const [orderFiles, setOrderFiles] = useState<PrintFile[]>([]);
  
  // حالات عرض الملف المنفرد
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PrintFile | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>("");
  
  // حالات تعديل حالة الطلب
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  
  // حالات حوار المدفوعات
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  
  // حالات حوار تحويل إلى فاتورة
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // حالات المدفوعات
  const [payments, setPayments] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_type: 'نقدي',
    notes: ''
  });

  // حالات إنشاء طلب جديد
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [newOrder, setNewOrder] = useState({
    customer_id: '',
    service_id: '',
    service_name: '',
    priority: 'متوسطة',
    due_date: '',
    description: '',
    amount: 0,
    payment_type: 'دفع آجل',
    paid_amount: 0,
    payment_notes: ''
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{
    item_name: '',
    quantity: 1,
    unit_price: 0,
    total_amount: 0
  }]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // جلب الطلبات
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(id, name, phone, whatsapp_number),
          order_items(
            id,
            item_name,
            quantity,
            unit_price,
            total_amount,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // حساب المبلغ المدفوع لكل طلب
      const ordersWithPayments = await Promise.all((data || []).map(async (order: any) => {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('order_id', order.id);
        
        const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        
        return {
          ...order,
          paid_amount: totalPaid,
          calculated_paid_amount: totalPaid,
          remaining_amount: order.amount - totalPaid
        };
      }));
      
      setOrders(ordersWithPayments);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الطلبات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // جلب العملاء
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp_number')
        .eq('status', 'نشط')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب العملاء",
        variant: "destructive",
      });
    }
  };

  // جلب الخدمات
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, base_price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الخدمات",
        variant: "destructive",
      });
    }
  };

  // جلب ملفات طلب معين
  const fetchOrderFiles = async (orderId: string) => {
    try {
      // البحث عن print_order مرتبط بالطلب
      const { data: printOrder, error: printOrderError } = await supabase
        .from('print_orders')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (printOrderError || !printOrder) {
        setOrderFiles([]);
        return;
      }

      // جلب الملفات
      const { data: files, error: filesError } = await supabase
        .from('print_files')
        .select('*')
        .eq('print_order_id', printOrder.id)
        .order('upload_date', { ascending: false });

      if (filesError) throw filesError;
      setOrderFiles(files || []);
    } catch (error) {
      console.error('Error fetching order files:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب ملفات الطلب",
        variant: "destructive",
      });
    }
  };

  // عرض الملف في نافذة منبثقة
  const previewFile = async (file: PrintFile) => {
    try {
      // إنشاء رابط مؤقت لعرض الملف
      const { data: signedUrlData, error: urlError } = await supabase
        .storage
        .from('print-files')
        .createSignedUrl(file.file_path, 3600); // ساعة واحدة

      if (urlError) {
        throw new Error('فشل في إنشاء رابط الملف');
      }

      setSelectedFile(file);
      setFilePreviewUrl(signedUrlData.signedUrl);
      setIsFilePreviewOpen(true);
    } catch (error) {
      console.error('Error previewing file:', error);
      toast({
        title: "خطأ",
        description: "فشل في عرض الملف",
        variant: "destructive",
      });
    }
  };

  // رفع الملفات
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray || fileArray.length === 0 || !selectedOrderForUpload) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملفات للرفع",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // البحث عن print_order أو إنشاؤه
      let printOrderId;
      const { data: existingPrintOrder } = await supabase
        .from('print_orders')
        .select('id')
        .eq('order_id', selectedOrderForUpload.id)
        .single();

      if (existingPrintOrder) {
        printOrderId = existingPrintOrder.id;
      } else {
        // إنشاء print_order جديد
        const { data: newPrintOrder, error: createError } = await supabase
          .from('print_orders')
          .insert({
            order_id: selectedOrderForUpload.id,
            status: 'pending',
            quantity: 1
          })
          .select('id')
          .single();

        if (createError) throw createError;
        printOrderId = newPrintOrder.id;
      }

      // رفع الملفات
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${printOrderId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${printOrderId}/${fileName}`;

        // رفع الملف إلى storage
        const { error: uploadError } = await supabase.storage
          .from('print-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // حفظ معلومات الملف في قاعدة البيانات
        const { error: insertError } = await supabase
          .from('print_files')
          .insert({
            print_order_id: printOrderId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            mime_type: file.type,
            file_category: fileCategory,
            sent_to_customer: false
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "تم رفع الملفات",
        description: `تم رفع ${fileArray.length} ملف بنجاح`,
      });

      setIsUploadDialogOpen(false);
      setSelectedOrderForUpload(null);

    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "خطأ في رفع الملفات",
        description: "حدث خطأ أثناء رفع الملفات",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const sendDesignProofToCustomer = async (fileId: string, orderId: string) => {
    try {
      // إرسال رسالة واتساب للعميل
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('الطلب غير موجود');

      // جلب اسم الشركة من قاعدة البيانات
      let companyName = 'وكالة الإبداع للدعاية والإعلان';
      try {
        const { data: companyData } = await supabase
          .from('website_settings')
          .select('setting_value')
          .eq('setting_key', 'company_info')
          .maybeSingle();

        if (companyData?.setting_value && typeof companyData.setting_value === 'object' && 
            'companyName' in companyData.setting_value && companyData.setting_value.companyName) {
          companyName = companyData.setting_value.companyName as string;
        }
      } catch (error) {
        console.log('Could not fetch company name, using default');
      }

      // الحصول على طلب الطباعة
      const { data: printOrder } = await supabase
        .from('print_orders')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (!printOrder) {
        toast({
          title: "خطأ",
          description: "طلب الطباعة غير موجود",
          variant: "destructive",
        });
        return;
      }

      // الحصول على ملف البروفة
      const { data: proofFile } = await supabase
        .from('print_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (!proofFile) {
        toast({
          title: "خطأ",
          description: "ملف البروفة غير موجود",
          variant: "destructive",
        });
        return;
      }

      // إنشاء رابط موقع للملف (يعمل لمدة 24 ساعة)
      const { data: signedUrlData, error: urlError } = await supabase
        .storage
        .from('print-files')
        .createSignedUrl(proofFile.file_path, 86400); // 24 ساعة

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        throw new Error('فشل في إنشاء رابط الملف');
      }

      const publicFileUrl = signedUrlData.signedUrl;
      
      // جلب بنود الطلب
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        console.warn('Error fetching order items:', itemsError);
      }

      // إعداد قائمة بنود الطلب
      let orderItemsText = '';
      let totalAmount = 0;
      
      if (orderItems && orderItems.length > 0) {
        orderItemsText = '\n📋 بنود الطلب:\n';
        orderItems.forEach((item, index) => {
          orderItemsText += `${index + 1}. ${item.item_name}\n`;
          orderItemsText += `   الكمية: ${item.quantity}\n`;
          orderItemsText += `   السعر: ${item.unit_price} ر.س\n`;
          orderItemsText += `   الإجمالي: ${item.total_amount} ر.س\n`;
          if (item.description) {
            orderItemsText += `   الوصف: ${item.description}\n`;
          }
          orderItemsText += '\n';
          totalAmount += Number(item.total_amount);
        });
        orderItemsText += `📊 إجمالي البنود: ${totalAmount} ر.س\n`;
      }

      // إنشاء رسالة البروفة مع رابط للصورة (مطابقة للنموذج المطلوب)
      const textMessage = `🎨 بروفة التصميم جاهزة للمراجعة

📋 تفاصيل الطلب:
* رقم الطلب: ${order.order_number}
* العميل: ${order.customers?.name || 'عزيزنا العميل'}
* الخدمة: ${order.service_name}
${orderItemsText}

📸 لاستعراض البروفة:
👇 اضغط على الرابط التالي لعرض التصميم:
${publicFileUrl}

بعد مراجعة البروفة:

✅ للموافقة: أرسل "موافق"
📝 للتعديل: اكتب التعديلات المطلوبة

شكراً لكم،
${companyName}`;

      // إنشاء رسالة WhatsApp في قاعدة البيانات أولاً
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: order.customers?.phone || order.customers?.whatsapp_number || "",
          to_number: order.customers?.phone || order.customers?.whatsapp_number || "",
          message_content: textMessage,
          message_type: 'text',
          status: 'pending',
          order_id: order.id
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating WhatsApp message:', messageError);
        throw new Error('فشل في إنشاء رسالة الواتساب');
      }

      console.log('WhatsApp message created in database with ID:', messageData.id);

      // تحديث حالة الإرسال في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('print_files')
        .update({ 
          sent_to_customer: true, 
          sent_at: new Date().toISOString() 
        })
        .eq('id', fileId);

      if (updateError) {
        console.error('Error updating file status:', updateError);
      }

      toast({
        title: "تم إرسال البروفة",
        description: "تم إرسال البروفة للعميل عبر الواتساب بنجاح",
      });

      // إعادة جلب ملفات الطلب لتحديث الحالة
      if (selectedOrderFiles) {
        await fetchOrderFiles(selectedOrderFiles.id);
      }

    } catch (error) {
      console.error('Error sending design proof:', error);
      toast({
        title: "خطأ في إرسال البروفة",
        description: "حدث خطأ أثناء إرسال البروفة",
        variant: "destructive",
      });
    }
  };

  // تحميل الملف
  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('print-files')
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "تم تحميل الملف",
        description: `تم تحميل ${fileName} بنجاح`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "خطأ في تحميل الملف",
        description: "حدث خطأ أثناء تحميل الملف",
        variant: "destructive",
      });
    }
  };

  // تحديث حالة الطلب
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // جلب بيانات الطلب أولاً مع معلومات العميل
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp_number)
        `)
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching order for status update:', fetchError);
        throw fetchError;
      }

      if (!orderData) {
        throw new Error('لم يتم العثور على بيانات الطلب');
      }

      console.log('Order data for status update:', orderData);

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

        // إرسال إشعار واتساب للعميل
      if (orderData.customers?.whatsapp_number) {
        console.log('Sending WhatsApp notification for status update...');
        
        // تحديد نوع الإشعار بناءً على الحالة الجديدة (مثل لوحة الموظف)
        let notificationType;
        switch (newStatus) {
          case 'مؤكد':
            notificationType = 'order_confirmed';
            break;
          case 'قيد التنفيذ':
            notificationType = 'order_in_progress';
            break;
          case 'قيد المراجعة':
            notificationType = 'order_under_review';
            break;
          case 'جاهز للتسليم':
            notificationType = 'order_ready_for_delivery';
            break;
          case 'مكتمل':
            notificationType = 'order_completed';
            break;
          case 'ملغي':
            notificationType = 'order_cancelled';
            break;
          case 'جديد':
            notificationType = 'order_created';
            break;
          default:
            notificationType = 'status_update'; // للحالات الأخرى
        }

        const notificationData = {
          type: notificationType,
          order_id: orderId,
          source: 'admin_dashboard', // تحديد المصدر
          webhook_preference: 'لوحة الإدارة', // الويب هوك المفضل
          data: {
            order_number: orderData.order_number,
            customer_name: orderData.customers.name,
            customer_phone: orderData.customers.whatsapp_number,
            old_status: orderData.status,
            new_status: newStatus,
            amount: orderData.amount,
            service_name: orderData.service_name,
            due_date: orderData.due_date,
            progress: orderData.progress || 0,
            description: orderData.description || '',
            payment_type: orderData.payment_type || 'دفع آجل',
            priority: orderData.priority || 'متوسطة',
            start_date: orderData.start_date || null
          }
        };

        try {
          const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-order-notifications', {
            body: notificationData
          });

          if (notificationError) {
            console.error('فشل في إرسال إشعار الواتس:', notificationError);
          } else {
            console.log('تم إرسال إشعار الواتس آب بنجاح');
          }
        } catch (notificationError) {
          console.error('خطأ في إرسال الإشعار:', notificationError);
        }
      }

      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة الطلب إلى ${newStatus}`,
      });

      setIsEditStatusDialogOpen(false);
      setSelectedOrderForEdit(null);
      setNewStatus("");
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };

  // جلب المدفوعات
  const fetchOrderPayments = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    }
  };

  // فتح حوار المدفوعات
  const openPaymentDialog = (order: Order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentDialogOpen(true);
    fetchOrderPayments(order.id);
  };

  // فتح حوار الفاتورة
  const openInvoiceDialog = (order: Order) => {
    setSelectedOrderForInvoice(order);
    setIsInvoiceDialogOpen(true);
  };

  // إضافة دفعة جديدة
  const handleAddPayment = async (orderId: string) => {
    try {
      if (!newPayment.amount || !newPayment.payment_type) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: newPayment.amount,
          payment_type: newPayment.payment_type,
          notes: newPayment.notes,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "تم إضافة الدفعة",
        description: "تم إضافة الدفعة بنجاح",
      });

      // إعادة تعيين النموذج
      setNewPayment({ amount: 0, payment_type: 'نقدي', notes: '' });
      
      // إعادة جلب المدفوعات والطلبات
      await fetchOrderPayments(orderId);
      await fetchOrders();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة الدفعة",
        variant: "destructive",
      });
    }
  };

  // تحويل إلى فاتورة
  const convertToInvoice = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الطلب",
          variant: "destructive",
        });
        return;
      }

      // التحقق من وجود فاتورة مسبقة
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingInvoice) {
        toast({
          title: "تنبيه",
          description: `يوجد فاتورة مسبقة لهذا الطلب: ${existingInvoice.invoice_number}`,
          variant: "destructive",
        });
        return;
      }

      // إنشاء رقم فاتورة جديد
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) throw numberError;

      // حساب الضريبة
      const taxAmount = order.amount * 0.15;
      const totalAmount = order.amount + taxAmount;

      // إنشاء الفاتورة
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: order.customer_id,
          order_id: order.id,
          amount: order.amount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: (order.paid_amount || 0) >= totalAmount ? 'مدفوعة' : 'قيد الانتظار',
          due_date: order.due_date,
          payment_type: order.payment_type,
          created_by: user?.id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // نسخ بنود الطلب إلى الفاتورة
      if (order.order_items && order.order_items.length > 0) {
        const invoiceItems = order.order_items.map(item => ({
          invoice_id: newInvoice.id,
          item_name: item.item_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.total_amount
        }));

        const { error: insertItemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (insertItemsError) throw insertItemsError;
      }

      // إرسال الفاتورة عبر الواتساب
      if (order.customers?.whatsapp_number) {
        const notificationData = {
          type: 'invoice_created',
          invoice_id: newInvoice.id,
          source: 'admin_dashboard',
          webhook_preference: 'لوحة الإدارة',
          data: {
            invoice_number: invoiceNumber,
            customer_name: order.customers.name,
            customer_phone: order.customers.whatsapp_number,
            order_number: order.order_number,
            amount: order.amount,
            tax_amount: taxAmount,
            total_amount: totalAmount
          }
        };

        try {
          await supabase.functions.invoke('send-invoice-notifications', {
            body: notificationData
          });
        } catch (notificationError) {
          console.error('خطأ في إرسال الفاتورة:', notificationError);
        }
      }

      toast({
        title: "تم إنشاء الفاتورة",
        description: `تم إنشاء الفاتورة رقم ${invoiceNumber} وإرسالها للعميل`,
      });

      setIsInvoiceDialogOpen(false);
      
      // فتح الفاتورة في صفحة جديدة
      window.open(`/admin/invoices?invoice_id=${newInvoice.id}`, '_blank');

    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الفاتورة",
        variant: "destructive",
      });
    }
  };

  // إضافة بند جديد
  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      item_name: '',
      quantity: 1,
      unit_price: 0,
      total_amount: 0
    }]);
  };

  // حذف بند
  const removeOrderItem = (index: number) => {
    if (orderItems.length > 1) {
      const newItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newItems);
      calculateOrderTotal(newItems);
    }
  };

  // تحديث بند الطلب
  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // حساب الإجمالي للبند
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setOrderItems(newItems);
    calculateOrderTotal(newItems);
  };

  // حساب إجمالي الطلب
  const calculateOrderTotal = (items: OrderItem[]) => {
    const total = items.reduce((sum, item) => sum + item.total_amount, 0);
    setNewOrder(prev => ({ ...prev, amount: total }));
  };

  // تحديث الخدمة المختارة
  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    if (selectedService) {
      setNewOrder(prev => ({
        ...prev,
        service_id: serviceId,
        service_name: selectedService.name,
        amount: selectedService.base_price || 0
      }));
    }
  };

  // فتح حوار الطلب الجديد
  const openNewOrderDialog = () => {
    setIsNewOrderDialogOpen(true);
    fetchCustomers();
    fetchServices();
  };

  // إنشاء طلب جديد
  const createNewOrder = async () => {
    try {
      if (!newOrder.customer_id || !newOrder.service_name || !newOrder.due_date) {
        toast({
          title: "خطأ",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // إنشاء رقم طلب جديد
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_order_number');

      if (numberError) throw numberError;

      // إنشاء الطلب
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: newOrder.customer_id,
          service_name: newOrder.service_name,
          description: newOrder.description,
          status: 'جديد',
          priority: newOrder.priority,
          amount: newOrder.amount,
          payment_type: newOrder.payment_type,
          payment_notes: newOrder.payment_notes,
          due_date: newOrder.due_date,
          created_by: user?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // إضافة بنود الطلب
      if (orderItems.length > 0 && orderItems[0].item_name) {
        const orderItemsToInsert = orderItems
          .filter(item => item.item_name.trim() !== '')
          .map(item => ({
            order_id: createdOrder.id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: item.total_amount
          }));

        if (orderItemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // إرسال إشعار واتساب للعميل بالطلب الجديد
      const selectedCustomer = customers.find(c => c.id === newOrder.customer_id);
      if (selectedCustomer?.whatsapp_number) {
        console.log('Sending WhatsApp notification for new order...');
        
        const notificationData = {
          type: 'order_created',
          order_id: createdOrder.id,
          source: 'admin_dashboard',
          webhook_preference: 'لوحة الإدارة',
          data: {
            order_number: orderNumber,
            customer_name: selectedCustomer.name,
            customer_phone: selectedCustomer.whatsapp_number,
            amount: newOrder.amount,
            service_name: newOrder.service_name,
            description: newOrder.description,
            payment_type: newOrder.payment_type,
            paid_amount: 0,
            status: 'جديد',
            priority: newOrder.priority,
            due_date: newOrder.due_date,
            start_date: null
          }
        };

        try {
          const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('send-order-notifications', {
            body: notificationData
          });

          if (notificationError) {
            console.error('فشل في إرسال إشعار الواتس:', notificationError);
          } else {
            console.log('تم إرسال إشعار الواتس آب للطلب الجديد بنجاح');
          }
        } catch (notificationError) {
          console.error('خطأ في إرسال الإشعار للطلب الجديد:', notificationError);
        }
      }

      toast({
        title: "تم إنشاء الطلب",
        description: `تم إنشاء الطلب رقم ${orderNumber} بنجاح`,
      });

      // إعادة تعيين النموذج
      setNewOrder({
        customer_id: '',
        service_id: '',
        service_name: '',
        priority: 'متوسطة',
        due_date: '',
        description: '',
        amount: 0,
        payment_type: 'دفع آجل',
        paid_amount: 0,
        payment_notes: ''
      });
      setOrderItems([{
        item_name: '',
        quantity: 1,
        unit_price: 0,
        total_amount: 0
      }]);
      setAttachmentFiles([]);
      setIsNewOrderDialogOpen(false);
      
      // إعادة جلب الطلبات
      fetchOrders();

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // تصفية الطلبات
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customers?.name && order.customers.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // تنسيق تاريخ الملف
  const formatFileDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* العنوان والبحث */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            إدارة الطلبات
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض وإدارة جميع الطلبات مع إمكانية رفع الملفات
          </p>
        </div>
        <Button onClick={openNewOrderDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          إنشاء طلب جديد
        </Button>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث برقم الطلب أو الخدمة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="حالة الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="جديد">جديد</SelectItem>
                <SelectItem value="مؤكد">مؤكد</SelectItem>
                <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                <SelectItem value="جاهز للتسليم">جاهز للتسليم</SelectItem>
                <SelectItem value="مكتمل">مكتمل</SelectItem>
                <SelectItem value="ملغي">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الطلبات */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">قائمة الطلبات ({filteredOrders.length})</h2>
        
        {filteredOrders.map((order) => (
          <Card key={order.id} className="p-6 border border-border">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* معلومات الطلب */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{order.order_number}</h3>
                  <div className="flex gap-2">
                    <Badge variant={
                      order.status === 'مكتمل' ? 'default' :
                      order.status === 'ملغي' ? 'destructive' :
                      order.status === 'قيد التنفيذ' ? 'secondary' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                    <Badge variant={
                      order.priority === 'عالية' ? 'destructive' :
                      order.priority === 'متوسطة' ? 'secondary' : 'outline'
                    }>
                      {order.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong>العميل:</strong> {order.customers?.name || 'غير محدد'}</p>
                    <p><strong>الخدمة:</strong> {order.service_name}</p>
                    <p><strong>تاريخ الاستحقاق:</strong> {order.due_date ? new Date(order.due_date).toLocaleDateString('ar-SA') : '-'}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>المبلغ الإجمالي:</strong> {order.amount.toLocaleString()} ر.س</p>
                    <p><strong>المبلغ المدفوع:</strong> {(order.paid_amount || 0).toLocaleString()} ر.س</p>
                    <p><strong>المبلغ المتبقي:</strong> {(order.amount - (order.paid_amount || 0)).toLocaleString()} ر.س</p>
                  </div>
                </div>
                
                {/* بنود الطلب */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      بنود الطلب ({order.order_items.length})
                    </h4>
                    <div className="space-y-2">
                      {order.order_items.map((item, index) => (
                        <div key={item.id} className="flex justify-between items-start p-2 bg-white rounded border text-xs">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{index + 1}. {item.item_name}</p>
                            {item.description && (
                              <p className="text-gray-600 mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-left space-y-1 min-w-0 ml-2">
                            <p className="text-gray-600">الكمية: {item.quantity}</p>
                            <p className="text-gray-600">السعر: {item.unit_price.toLocaleString()} ر.س</p>
                            <p className="font-medium text-blue-600">الإجمالي: {item.total_amount.toLocaleString()} ر.س</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span>إجمالي البنود:</span>
                          <span className="text-blue-600">
                            {order.order_items.reduce((sum, item) => sum + item.total_amount, 0).toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* الأزرار */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* تعديل حالة الطلب */}
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedOrderForEdit(order);
                      setNewStatus(order.status);
                      setIsEditStatusDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    تعديل الحالة
                  </Button>
                  
                  {/* المدفوعات */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => openPaymentDialog(order)}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    مدفوعات
                  </Button>
                  
                  {/* تحويل إلى فاتورة */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => openInvoiceDialog(order)}
                  >
                    <Receipt className="h-3 w-3 mr-1" />
                    فاتورة
                  </Button>
                  
                  {/* رفع ملفات التصميم */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedOrderForUpload(order);
                      setFileCategory('design');
                      setIsUploadDialogOpen(true);
                    }}
                  >
                    <Image className="h-3 w-3 mr-1" />
                    بروفة
                  </Button>
                  
                  {/* رفع ملفات الطباعة */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedOrderForUpload(order);
                      setFileCategory('print');
                      setIsUploadDialogOpen(true);
                    }}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    طباعة
                  </Button>
                  
                  {/* عرض الملفات */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedOrderFiles(order);
                      setIsFilesDialogOpen(true);
                      fetchOrderFiles(order.id);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    ملفات
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* حوار تعديل حالة الطلب */}
      <Dialog open={isEditStatusDialogOpen} onOpenChange={setIsEditStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل حالة الطلب</DialogTitle>
            <DialogDescription>
              اختر الحالة الجديدة للطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderForEdit && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>الطلب:</strong> {selectedOrderForEdit.order_number}</p>
                <p className="text-sm"><strong>العميل:</strong> {selectedOrderForEdit.customers?.name}</p>
                <p className="text-sm"><strong>الحالة الحالية:</strong> {selectedOrderForEdit.status}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="status-select">الحالة الجديدة</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة الجديدة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="جديد">جديد</SelectItem>
                  <SelectItem value="قيد التنفيذ">قيد التنفيذ</SelectItem>
                  <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                  <SelectItem value="جاهز للتسليم">جاهز للتسليم</SelectItem>
                  <SelectItem value="مكتمل">مكتمل</SelectItem>
                  <SelectItem value="ملغي">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsEditStatusDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button 
                onClick={() => selectedOrderForEdit && updateOrderStatus(selectedOrderForEdit.id, newStatus)}
                disabled={!newStatus || newStatus === selectedOrderForEdit?.status}
              >
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار رفع الملفات */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              رفع {fileCategory === 'design' ? 'ملفات بروفة التصميم' : 'ملفات الطباعة'}
            </DialogTitle>
            <DialogDescription>
              اختر الملفات المراد رفعها للطلب المحدد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderForUpload && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>الطلب:</strong> {selectedOrderForUpload.order_number}</p>
                <p className="text-sm"><strong>العميل:</strong> {selectedOrderForUpload.customers?.name}</p>
                <p className="text-sm"><strong>الخدمة:</strong> {selectedOrderForUpload.service_name}</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="file-upload">اختر الملفات أو اسحبها هنا أو الصقها</Label>
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors"
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    handleFileUpload(files);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const items = Array.from(e.clipboardData.items);
                  const files = items
                    .filter(item => item.kind === 'file')
                    .map(item => item.getAsFile())
                    .filter(file => file !== null) as File[];
                  
                  if (files.length > 0) {
                    handleFileUpload(files);
                  }
                }}
                tabIndex={0}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  اسحب وأفلت الملفات هنا أو انقر لاختيار الملفات
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  أو استخدم Ctrl+V للصق الملفات من الحافظة
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept={fileCategory === 'design' ? "image/*" : "image/*,.pdf,.doc,.docx,.ai,.psd"}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                    }
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  اختر الملفات
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {fileCategory === 'design' 
                  ? 'الأنواع المدعومة: ملفات الصور فقط (JPG, PNG, GIF, إلخ)'
                  : 'الأنواع المدعومة: صور، PDF، Word، AI، PSD'
                }
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار عرض الملفات */}
      <Dialog open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              ملفات الطلب {selectedOrderFiles?.order_number}
            </DialogTitle>
            <DialogDescription>
              عرض وإدارة جميع الملفات المرفوعة للطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderFiles && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>العميل:</strong> {selectedOrderFiles.customers?.name}</p>
                <p className="text-sm"><strong>الخدمة:</strong> {selectedOrderFiles.service_name}</p>
              </div>
            )}
            
            {orderFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد ملفات مرفوعة لهذا الطلب
              </p>
            ) : (
              <div className="space-y-3">
                {orderFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.file_name}</span>
                        <Badge variant={file.file_category === 'design' ? 'secondary' : 'outline'}>
                          {file.file_category === 'design' ? 'بروفة' : 'طباعة'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • {formatFileDate(file.upload_date)}
                      </p>
                      {file.sent_to_customer && (
                        <p className="text-xs text-green-600">
                          تم الإرسال للعميل في {formatFileDate(file.sent_at!)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* عرض الملف */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => previewFile(file)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        عرض
                      </Button>
                      
                      {/* إرسال للعميل (للبروفة فقط) */}
                      {file.file_category === 'design' && !file.sent_to_customer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendDesignProofToCustomer(file.id, selectedOrderFiles!.id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          إرسال للعميل
                        </Button>
                      )}
                      
                      {/* تحميل الملف */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file.file_path, file.file_name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        تحميل
                      </Button>
                      
                      {/* حالة الإرسال */}
                      {file.file_category === 'design' && (
                        file.sent_to_customer ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض الملف */}
      <Dialog open={isFilePreviewOpen} onOpenChange={setIsFilePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              عرض الملف: {selectedFile?.file_name}
            </DialogTitle>
            <DialogDescription>
              معاينة الملف المحدد
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {selectedFile && filePreviewUrl && (
              <div className="w-full h-[70vh] bg-gray-50 rounded-lg overflow-hidden">
                {/* عرض الصورة */}
                {selectedFile.file_name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ? (
                  <img
                    src={filePreviewUrl}
                    alt={selectedFile.file_name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error('Error loading image');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : selectedFile.file_name.match(/\.pdf$/i) ? (
                  /* عرض PDF */
                  <iframe
                    src={filePreviewUrl}
                    title={selectedFile.file_name}
                    className="w-full h-full border-0"
                  />
                ) : (
                  /* ملفات أخرى */
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <FileText className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      لا يمكن عرض هذا النوع من الملفات
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      {selectedFile.file_name}
                    </p>
                    <Button
                      onClick={() => downloadFile(selectedFile.file_path, selectedFile.file_name)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      تحميل الملف
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedFile && (
                <>
                  <span>حجم الملف: {formatFileSize(selectedFile.file_size)}</span>
                  <span className="mx-2">•</span>
                  <span>تاريخ الرفع: {formatFileDate(selectedFile.upload_date)}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedFile && downloadFile(selectedFile.file_path, selectedFile.file_name)}
              >
                <Download className="h-4 w-4 mr-1" />
                تحميل
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFilePreviewOpen(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار المدفوعات */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إدارة مدفوعات الطلب</DialogTitle>
            <DialogDescription>
              عرض وإدارة المدفوعات الخاصة بالطلب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedOrderForPayment && (
              <>
                {/* معلومات الطلب */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">تفاصيل الطلب</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>رقم الطلب:</strong> {selectedOrderForPayment.order_number}</p>
                      <p><strong>العميل:</strong> {selectedOrderForPayment.customers?.name}</p>
                    </div>
                    <div>
                      <p><strong>الخدمة:</strong> {selectedOrderForPayment.service_name}</p>
                      <p><strong>نوع الدفع:</strong> {selectedOrderForPayment.payment_type}</p>
                    </div>
                  </div>
                  
                  {/* ملخص المدفوعات */}
                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ الكلي</p>
                        <p className="text-lg font-bold text-blue-600">{selectedOrderForPayment.amount?.toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ المدفوع</p>
                        <p className="text-lg font-bold text-green-600">{(selectedOrderForPayment.paid_amount || 0).toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ المتبقي</p>
                        <p className="text-lg font-bold text-red-600">{(selectedOrderForPayment.amount - (selectedOrderForPayment.paid_amount || 0)).toLocaleString()} ر.س</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* قائمة المدفوعات السابقة */}
                <div>
                  <h3 className="font-semibold mb-3">المدفوعات السابقة</h3>
                  {payments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{payment.amount?.toLocaleString()} ر.س</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.payment_type} • {new Date(payment.payment_date).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>لا توجد مدفوعات سابقة</p>
                    </div>
                  )}
                </div>

                {/* نموذج إضافة دفعة جديدة */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">إضافة دفعة جديدة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment-amount">المبلغ (ر.س)</Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        placeholder="أدخل المبلغ"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-type">طريقة الدفع</Label>
                      <Select value={newPayment.payment_type} onValueChange={(value) => setNewPayment({...newPayment, payment_type: value})}>
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
                    <div className="md:col-span-2">
                      <Label htmlFor="payment-notes">ملاحظات (اختياري)</Label>
                      <Input
                        id="payment-notes"
                        placeholder="أدخل أي ملاحظات إضافية"
                        value={newPayment.notes}
                        onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setNewPayment({ amount: 0, payment_type: 'نقدي', notes: '' })}
                    >
                      مسح
                    </Button>
                    <Button
                      onClick={() => handleAddPayment(selectedOrderForPayment.id)}
                      disabled={!newPayment.amount || !newPayment.payment_type}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      إضافة الدفعة
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                إغلاق
              </Button>
              <Button 
                onClick={() => {
                  window.open(`/admin/invoices?order_id=${selectedOrderForPayment?.id}`, '_blank');
                  setIsPaymentDialogOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                إنشاء فاتورة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تحويل إلى فاتورة */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تحويل الطلب إلى فاتورة</DialogTitle>
            <DialogDescription>
              سيتم إنشاء فاتورة جديدة تلقائياً وإرسالها للعميل عبر الواتساب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedOrderForInvoice && (
              <>
                {/* معلومات الطلب */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">تفاصيل الطلب</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>رقم الطلب:</strong> {selectedOrderForInvoice.order_number}</p>
                      <p><strong>العميل:</strong> {selectedOrderForInvoice.customers?.name}</p>
                      <p><strong>الخدمة:</strong> {selectedOrderForInvoice.service_name}</p>
                    </div>
                    <div>
                      <p><strong>المبلغ الإجمالي:</strong> {selectedOrderForInvoice.amount?.toLocaleString()} ر.س</p>
                      <p><strong>المبلغ المدفوع:</strong> {(selectedOrderForInvoice.paid_amount || 0).toLocaleString()} ر.س</p>
                      <p><strong>المبلغ المتبقي:</strong> {(selectedOrderForInvoice.amount - (selectedOrderForInvoice.paid_amount || 0)).toLocaleString()} ر.س</p>
                    </div>
                  </div>
                  
                  {/* معلومات الاتصال */}
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-xs text-muted-foreground mb-1">معلومات الاتصال</p>
                    <div className="flex items-center gap-4 text-sm">
                      <p><strong>الواتساب:</strong> {selectedOrderForInvoice.customers?.whatsapp_number || 'غير متوفر'}</p>
                      <p><strong>الهاتف:</strong> {selectedOrderForInvoice.customers?.phone || 'غير متوفر'}</p>
                    </div>
                  </div>
                </div>

                {/* معاينة ما سيحدث */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-semibold mb-3 text-blue-800">ما سيحدث عند التحويل:</h3>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>إنشاء فاتورة جديدة برقم تلقائي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>نسخ جميع بنود الطلب إلى الفاتورة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>ربط الفاتورة بالطلب الحالي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>تطبيق المدفوعات السابقة على الفاتورة</span>
                    </div>
                    {selectedOrderForInvoice.customers?.whatsapp_number && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-green-700">إرسال الفاتورة تلقائياً عبر الواتساب</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>فتح الفاتورة للمراجعة والطباعة</span>
                    </div>
                  </div>
                </div>

                {/* تحذير إذا لم يكن هناك رقم واتساب */}
                {!selectedOrderForInvoice.customers?.whatsapp_number && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                      <span className="font-medium">تنبيه:</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      لا يوجد رقم واتساب للعميل. سيتم إنشاء الفاتورة بدون إرسال تلقائي.
                    </p>
                  </div>
                )}
              </>
            )}
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsInvoiceDialogOpen(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button 
                onClick={() => selectedOrderForInvoice && convertToInvoice(selectedOrderForInvoice.id)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الفاتورة وإرسالها'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار إنشاء طلب جديد */}
      <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء طلب جديد</DialogTitle>
            <DialogDescription>
              أدخل تفاصيل الطلب الجديد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* بيانات الطلب الأساسية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">العميل *</Label>
                <Select value={newOrder.customer_id} onValueChange={(value) => setNewOrder({...newOrder, customer_id: value})}>
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
                <Label htmlFor="service">الخدمة *</Label>
                <Select value={newOrder.service_id} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} {service.base_price && `(${service.base_price} ر.س)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">الأولوية</Label>
                <Select value={newOrder.priority} onValueChange={(value) => setNewOrder({...newOrder, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="منخفضة">منخفضة</SelectItem>
                    <SelectItem value="متوسطة">متوسطة</SelectItem>
                    <SelectItem value="عالية">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="due_date">تاريخ الاستحقاق *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newOrder.due_date}
                  onChange={(e) => setNewOrder({...newOrder, due_date: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="payment_type">نوع الدفع</Label>
                <Select value={newOrder.payment_type} onValueChange={(value) => setNewOrder({...newOrder, payment_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="دفع فوري">دفع فوري</SelectItem>
                    <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                    <SelectItem value="دفع جزئي">دفع جزئي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="paid_amount">المبلغ المدفوع مقدماً</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  placeholder="0"
                  value={newOrder.paid_amount}
                  onChange={(e) => setNewOrder({...newOrder, paid_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">وصف الطلب</Label>
              <Textarea
                id="description"
                placeholder="أدخل وصف مفصل للطلب..."
                value={newOrder.description}
                onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_notes">ملاحظات الدفع</Label>
              <Textarea
                id="payment_notes"
                placeholder="أدخل أي ملاحظات خاصة بالدفع..."
                value={newOrder.payment_notes}
                onChange={(e) => setNewOrder({...newOrder, payment_notes: e.target.value})}
                rows={2}
              />
            </div>

            {/* بنود الطلب */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>بنود الطلب</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  إضافة بند
                </Button>
              </div>
              
              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-4">
                      <Label htmlFor={`item_name_${index}`}>اسم البند</Label>
                      <Input
                        id={`item_name_${index}`}
                        placeholder="اسم البند"
                        value={item.item_name}
                        onChange={(e) => updateOrderItem(index, 'item_name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`quantity_${index}`}>الكمية</Label>
                      <Input
                        id={`quantity_${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`unit_price_${index}`}>سعر الوحدة</Label>
                      <Input
                        id={`unit_price_${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>الإجمالي</Label>
                      <Input
                        value={item.total_amount.toFixed(2)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                        disabled={orderItems.length === 1}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">إجمالي المبلغ:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {newOrder.amount.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsNewOrderDialogOpen(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button 
                onClick={createNewOrder}
                disabled={loading || !newOrder.customer_id || !newOrder.service_name || !newOrder.due_date}
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;