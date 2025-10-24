// @ts-nocheck
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
  Tags,
  CheckSquare,
  Square,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { useThermalPrint } from "@/hooks/useThermalPrint";
import "@/components/BarcodeLabel.css";
import { cleanPhoneNumber } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  service_name?: string;
  service_type_id?: string;
  description: string;
  status: string;
  priority: string;
  total_amount: number;
  paid_amount: number;
  payment_type?: string;
  due_date?: string;
  delivery_date?: string;
  created_at: string;
  customer_id?: string;
  customers?: {
    name: string;
    whatsapp: string;
    phone: string;
  };
  service_types?: {
    id: string;
    name: string;
  };
  order_items?: {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    description?: string;
  }[];
  remaining_amount?: number;
  calculated_paid_amount?: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
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

  // حالات تعديل الطلب
  const [isEditOrderDialogOpen, setIsEditOrderDialogOpen] = useState(false);
  const [selectedOrderForEditing, setSelectedOrderForEditing] = useState<Order | null>(null);
  
  // حالات حذف الطلب
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState<Order | null>(null);

  // حالات المدفوعات
  const [payments, setPayments] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_type: 'cash',
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
  
  // حالات التحديد المتعدد والحذف
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { printBarcodeLabel } = useThermalPrint();

  // جلب الطلبات
  const fetchOrders = async () => {
    console.log('🔄 جاري جلب الطلبات من قاعدة البيانات...');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(id, name, phone, whatsapp),
          service_types(id, name),
          order_items(
            id,
            item_name,
            quantity,
            unit_price,
            total_amount:total,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ خطأ في جلب الطلبات:', error);
        throw error;
      }

      console.log('✅ تم جلب عدد الطلبات:', data?.length || 0);
      
      // حساب المبلغ المدفوع لكل طلب
      const ordersWithPayments = await Promise.all((data || []).map(async (order: any) => {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('order_id', order.id);
        
        const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        
        return {
          ...order,
          service_name: order.service_types?.name || order.service_name || 'غير محدد',
          due_date: order.delivery_date,
          paid_amount: totalPaid,
          calculated_paid_amount: totalPaid,
          remaining_amount: (order.total_amount || 0) - totalPaid
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
        .select('id, name, phone, whatsapp')
        .eq('is_active', true)
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
        .from('service_types')
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

  // طباعة ملصق باركود للطلب
  const handlePrintBarcodeLabel = async (order: Order) => {
    const customerName = order.customers?.name || 'غير محدد';
    const phoneNumber = order.customers?.whatsapp || order.customers?.phone || 'غير محدد';
    const totalAmount = order.total_amount || 0;
    const paidAmount = order.paid_amount || 0;
    const paymentStatus = `payment|${totalAmount}|${paidAmount}`;
    
    // جلب إعدادات الملصق من قاعدة البيانات
    try {
      const { data: settings } = await supabase
        .from('barcode_label_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      printBarcodeLabel(
        order.order_number,
        customerName,
        phoneNumber,
        paymentStatus,
        order.id,
        {
          paperSize: settings?.paper_type as any || 'thermal-80mm',
          margins: `${settings?.margins || 2}mm`,
          settings: settings
        }
      );
    } catch (error) {
      // استخدام الإعدادات الافتراضية في حالة فشل جلب الإعدادات
      printBarcodeLabel(
        order.order_number,
        customerName,
        phoneNumber,
        paymentStatus,
        order.id
      );
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
        .select('id, item_name, quantity, unit_price, total_amount:total, description')
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

      // إنشاء رسالة البروفة مع رابط واضح للتحميل والعرض
      const textMessage = `🎨 بروفة التصميم جاهزة للمراجعة

📋 تفاصيل الطلب:
* رقم الطلب: ${order.order_number}
* العميل: ${order.customers?.name || 'عزيزنا العميل'}
* الخدمة: ${order.service_name}
${orderItemsText}

📸 *رابط البروفة للعرض والتحميل:*
🔗 اضغط هنا لفتح البروفة:
${publicFileUrl}

📱 *أو انسخ الرابط في المتصفح:*
${publicFileUrl}

بعد مراجعة البروفة:

✅ للموافقة: أرسل "موافق"
📝 للتعديل: اكتب التعديلات المطلوبة

شكراً لكم،
${companyName}`;

      // التحقق من رقم الهاتف
      const phoneNumber = order.customers?.whatsapp || order.customers?.phone || '';
      if (!phoneNumber) {
        throw new Error('رقم هاتف العميل غير متوفر');
      }

      console.log('Customer phone number:', phoneNumber);

      // إنشاء رسالة WhatsApp في قاعدة البيانات
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          from_number: phoneNumber,
          to_number: phoneNumber,
          message_content: textMessage,
          message_type: 'text',
          status: 'pending'
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error creating WhatsApp message:', messageError);
        throw new Error('فشل في إنشاء رسالة الواتساب');
      }

      console.log('WhatsApp message created in database with ID:', messageData.id);

      // استدعاء دالة إرسال الرسائل المعلقة مباشرة
      try {
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-pending-whatsapp');
        
        if (sendError) {
          console.error('Error calling send-pending-whatsapp function:', sendError);
          toast({
            title: "تحذير",
            description: "تم إنشاء الرسالة لكن قد يكون هناك تأخير في الإرسال. تحقق من إعدادات الواتساب.",
            variant: "destructive",
          });
        } else {
          console.log('Send pending WhatsApp function called successfully:', sendResult);
          
          // التحقق من نتيجة الإرسال
          if (sendResult?.processed_count > 0) {
            const successCount = sendResult.results?.filter((r: any) => r.status === 'sent')?.length || 0;
            const failedCount = sendResult.results?.filter((r: any) => r.status === 'failed')?.length || 0;
            
            if (failedCount > 0) {
              toast({
                title: "تم إرسال البروفة مع تحذير",
                description: `تم إرسال البروفة لكن بعض الرسائل فشلت. تحقق من إعدادات الواتساب.`,
                variant: "destructive",
              });
            }
          }
        }
      } catch (functionError) {
        console.error('Failed to call send-pending-whatsapp function:', functionError);
        toast({
          title: "تحذير",
          description: "تم إنشاء الرسالة لكن قد يكون هناك مشكلة في الإرسال. تحقق من إعدادات الواتساب.",
          variant: "destructive",
        });
      }

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
          customers(name, whatsapp, phone)
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

      // إرسال إشعار واتساب للعميل - استخدام phone كبديل إذا كان whatsapp فارغاً وتنظيف الرقم
      let customerWhatsapp = orderData.customers?.whatsapp || orderData.customers?.phone;
      customerWhatsapp = cleanPhoneNumber(customerWhatsapp);
      
      if (customerWhatsapp) {
        console.log('Sending WhatsApp notification for status update...');
        console.log('Customer phone:', customerWhatsapp);
        
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
          force_send: true, // إجبار الإرسال حتى لو كانت الرسالة مكررة
          data: {
            order_number: orderData.order_number,
            customer_name: orderData.customers.name,
            customer_phone: customerWhatsapp,
            old_status: orderData.status,
            new_status: newStatus,
            amount: orderData.total_amount,
            service_name: orderData.service_name,
            due_date: orderData.delivery_date || orderData.due_date,
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

          // تشغيل معالج رسائل الواتساب فوراً لضمان الإرسال
          try {
            await supabase.functions.invoke('process-whatsapp-queue');
            console.log('تم تشغيل معالج رسائل الواتساب');
          } catch (queueError) {
            console.error('خطأ في تشغيل معالج رسائل الواتساب:', queueError);
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

      // إضافة الدفعة
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: newPayment.amount,
          payment_type: newPayment.payment_type,
          notes: newPayment.notes,
          created_by: user?.id
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // إنشاء القيد المحاسبي
      try {
        // جلب الحساب المناسب حسب نوع الدفعة
        const accountType = newPayment.payment_type === 'cash' ? 'نقدية' : 
                           newPayment.payment_type === 'bank_transfer' ? 'بنك' :
                           newPayment.payment_type === 'card' ? 'الشبكة' : 'نقدية';
        
        const { data: cashAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', accountType)
          .eq('is_active', true)
          .limit(1)
          .single();

        const { data: receivableAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_type', 'ذمم مدينة')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (cashAccount && receivableAccount) {
          // قيد مدين للصندوق/البنك/الشبكة
          const paymentTypeLabel = newPayment.payment_type === 'cash' ? 'نقداً' : 
                                   newPayment.payment_type === 'bank_transfer' ? 'تحويل بنكي' :
                                   newPayment.payment_type === 'card' ? 'الشبكة' : 'نقداً';
          
          await supabase.from('account_entries').insert({
            account_id: cashAccount.id,
            debit: newPayment.amount,
            credit: 0,
            reference_type: 'payment',
            reference_id: paymentData.id,
            description: `دفعة للطلب - ${paymentTypeLabel}`,
            created_by: user?.id
          });

          // قيد دائن للذمم المدينة
          await supabase.from('account_entries').insert({
            account_id: receivableAccount.id,
            debit: 0,
            credit: newPayment.amount,
            reference_type: 'payment',
            reference_id: paymentData.id,
            description: `دفعة من العميل للطلب`,
            created_by: user?.id
          });
        }
      } catch (entryError) {
        console.error('Error creating account entries:', entryError);
      }

      toast({
        title: "تم إضافة الدفعة",
        description: "تم إضافة الدفعة والقيد المحاسبي بنجاح",
      });

      // إعادة تعيين النموذج
      setNewPayment({ amount: 0, payment_type: 'cash', notes: '' });
      
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
      const taxAmount = order.total_amount * 0.15;
      const totalAmount = order.total_amount + taxAmount;

      // إنشاء الفاتورة
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: order.customer_id,
          order_id: order.id,
          tax: taxAmount,
          total_amount: totalAmount,
          status: (order.paid_amount || 0) >= totalAmount ? 'paid' : 'sent',
          due_date: order.delivery_date,
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
          total: item.total_amount
        }));

        const { error: insertItemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (insertItemsError) throw insertItemsError;
      }

      // إرسال الفاتورة عبر الواتساب
      if (order.customers?.whatsapp) {
        const notificationData = {
          type: 'invoice_created',
          invoice_id: newInvoice.id,
          source: 'admin_dashboard',
          webhook_preference: 'لوحة الإدارة',
          data: {
            invoice_number: invoiceNumber,
            customer_name: order.customers.name,
            customer_phone: order.customers.whatsapp,
            order_number: order.order_number,
            amount: order.total_amount,
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
          total_amount: newOrder.amount,
          payment_type: newOrder.payment_type,
          payment_notes: newOrder.payment_notes,
          delivery_date: newOrder.due_date,
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
            total: item.total_amount
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
      if (selectedCustomer?.whatsapp) {
        console.log('Sending WhatsApp notification for new order...');
        
        const notificationData = {
          type: 'order_created',
          order_id: createdOrder.id,
          source: 'admin_dashboard',
          webhook_preference: 'لوحة الإدارة',
          force_send: true, // إجبار الإرسال للطلبات الجديدة
          data: {
            order_number: orderNumber,
            customer_name: selectedCustomer.name,
            customer_phone: selectedCustomer.whatsapp,
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

          // تشغيل معالج رسائل الواتساب فوراً لضمان الإرسال
          try {
            await supabase.functions.invoke('process-whatsapp-queue');
            console.log('تم تشغيل معالج رسائل الواتساب للطلب الجديد');
          } catch (queueError) {
            console.error('خطأ في تشغيل معالج رسائل الواتساب:', queueError);
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
      (order.order_number && order.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.service_name && order.service_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customers?.name && order.customers.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customers?.phone && order.customers.phone.includes(searchTerm)) ||
      (order.customers?.whatsapp && order.customers.whatsapp.includes(searchTerm));
    
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

  // تحديث الطلب
  const updateOrder = async () => {
    if (!selectedOrderForEditing) return;

    // التحقق من البيانات المطلوبة
    if (!newOrder.customer_id) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار العميل",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      console.log('🔄 بداية تحديث الطلب...');
      console.log('البيانات المراد حفظها:', newOrder);
      console.log('البنود الحالية:', orderItems);

      // تحديث بيانات الطلب الأساسية
      const updateData: any = {
        customer_id: newOrder.customer_id,
        service_type_id: newOrder.service_id || null,
        delivery_date: newOrder.due_date || null,
        notes: newOrder.description?.trim() || null,
        total_amount: newOrder.amount || 0,
        tax: newOrder.tax || 0,
        discount: newOrder.discount || 0,
        updated_at: new Date().toISOString()
      };

      console.log('بيانات التحديث:', updateData);

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrderForEditing.id);

      if (orderError) {
        console.error('❌ خطأ في تحديث الطلب:', orderError);
        throw orderError;
      }

      console.log('✅ تم تحديث بيانات الطلب الأساسية');

      // حذف البنود القديمة
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrderForEditing.id);

      if (deleteItemsError) {
        console.error('❌ خطأ في حذف البنود القديمة:', deleteItemsError);
        throw deleteItemsError;
      }

      console.log('✅ تم حذف البنود القديمة');

      // إضافة البنود الجديدة
      const validItems = orderItems.filter(item => item.item_name && item.item_name.trim() !== '');
      
      if (validItems.length > 0) {
        const itemsToInsert = validItems.map(item => ({
          order_id: selectedOrderForEditing.id,
          item_name: item.item_name,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.total_amount) || 0
        }));

        console.log('البنود المراد إدراجها:', itemsToInsert);

        const { error: insertItemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (insertItemsError) {
          console.error('❌ خطأ في إدراج البنود الجديدة:', insertItemsError);
          throw insertItemsError;
        }

        console.log('✅ تم إدراج البنود الجديدة بنجاح');
      }

      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث الطلب بنجاح",
      });

      setIsEditOrderDialogOpen(false);
      setSelectedOrderForEditing(null);
      fetchOrders();

    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "خطأ في تحديث الطلب",
        description: "حدث خطأ أثناء تحديث الطلب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // حذف الطلب مع جميع البيانات المرتبطة
  const deleteOrder = async () => {
    if (!selectedOrderForDelete) return;

    try {
      setLoading(true);

      console.log('🗑️ بداية حذف الطلب:', selectedOrderForDelete.order_number);

      // استدعاء دالة الحذف الآمن
      const { data, error } = await supabase.rpc('delete_order_with_related_data', {
        order_id_param: selectedOrderForDelete.id
      });

      if (error) throw error;

      // التحقق من نوع البيانات المرجعة
      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || 'فشل في حذف الطلب');
      }

      console.log('✅ تم حذف الطلب بنجاح:', result);

      const deletedItems = result?.deleted_items || 0;
      const deletedPayments = result?.deleted_payments || 0;
      const deletedInvoices = result?.deleted_invoices || 0;
      const deletedEntries = result?.deleted_account_entries || 0;

      toast({
        title: "تم حذف الطلب",
        description: `تم حذف الطلب ${selectedOrderForDelete.order_number} مع جميع بياناته المرتبطة (${deletedItems} بنود، ${deletedPayments} مدفوعات، ${deletedInvoices} فواتير، ${deletedEntries} قيود محاسبية)`,
      });

      setIsDeleteOrderDialogOpen(false);
      setSelectedOrderForDelete(null);
      fetchOrders();

    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "خطأ في حذف الطلب",
        description: "حدث خطأ أثناء حذف الطلب وبياناته المرتبطة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // دوال التحديد المتعدد
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedOrderIds(new Set());
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrderIds(newSelection);
  };

  const selectAllOrders = () => {
    const allOrderIds = filteredOrders.map(order => order.id);
    setSelectedOrderIds(new Set(allOrderIds));
  };

  const deselectAllOrders = () => {
    setSelectedOrderIds(new Set());
  };

  // حذف متعدد للطلبات
  const bulkDeleteOrders = async () => {
    if (selectedOrderIds.size === 0) return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;
      const selectedOrderNumbers: string[] = [];

      // الحصول على أرقام الطلبات المحددة
      orders.forEach(order => {
        if (selectedOrderIds.has(order.id)) {
          selectedOrderNumbers.push(order.order_number);
        }
      });

      console.log('🗑️ بداية حذف الطلبات المتعددة:', selectedOrderNumbers);

      // حذف كل طلب على حدة
      for (const orderId of selectedOrderIds) {
        try {
          const { data, error } = await supabase.rpc('delete_order_with_related_data', {
            order_id_param: orderId
          });

          if (error) throw error;

          const result = data as any;
          if (result && !result.success) {
            throw new Error(result.error || 'فشل في حذف الطلب');
          }

          successCount++;
        } catch (error) {
          console.error('خطأ في حذف الطلب:', orderId, error);
          failCount++;
        }
      }

      console.log('✅ انتهى حذف الطلبات - نجح:', successCount, 'فشل:', failCount);

      toast({
        title: "تم حذف الطلبات",
        description: `تم حذف ${successCount} طلب بنجاح${failCount > 0 ? ` وفشل حذف ${failCount} طلبات` : ''}`,
        variant: failCount > 0 ? "destructive" : "default",
      });

      setIsBulkDeleteDialogOpen(false);
      setSelectedOrderIds(new Set());
      setIsSelectMode(false);
      fetchOrders();

    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        title: "خطأ في حذف الطلبات",
        description: "حدث خطأ أثناء حذف الطلبات المحددة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // فتح حوار تعديل الطلب
  const openEditOrderDialog = (order: Order) => {
    setSelectedOrderForEditing(order);
    setNewOrder({
      customer_id: order.customer_id || '',
      service_id: '',
      service_name: order.service_name,
      priority: order.priority,
      due_date: order.due_date || '',
      description: order.description || '',
      amount: order.total_amount,
      payment_type: order.payment_type || 'دفع آجل',
      paid_amount: order.paid_amount || 0,
      payment_notes: ''
    });
    if (order.order_items && order.order_items.length > 0) {
      setOrderItems(order.order_items.map(item => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount
      })));
    }
    fetchCustomers();
    fetchServices();
    setIsEditOrderDialogOpen(true);
  };

  // فتح حوار حذف الطلب
  const openDeleteOrderDialog = (order: Order) => {
    setSelectedOrderForDelete(order);
    setIsDeleteOrderDialogOpen(true);
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
                  placeholder="البحث برقم الطلب أو الخدمة أو اسم العميل أو رقم الجوال..."
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">قائمة الطلبات ({filteredOrders.length})</h2>
          
          {/* أزرار التحديد المتعدد */}
          <div className="flex gap-2">
            <Button
              variant={isSelectMode ? "default" : "outline"}
              onClick={toggleSelectMode}
              className="flex items-center gap-2"
            >
              {isSelectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {isSelectMode ? "إلغاء التحديد" : "تحديد متعدد"}
            </Button>
            
            {isSelectMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllOrders}
                  disabled={selectedOrderIds.size === filteredOrders.length}
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllOrders}
                  disabled={selectedOrderIds.size === 0}
                >
                  إلغاء تحديد الكل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  disabled={selectedOrderIds.size === 0}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف المحدد ({selectedOrderIds.size})
                </Button>
              </>
            )}
          </div>
        </div>
        
        {filteredOrders.map((order) => (
          <Card key={order.id} className="p-6 border border-border">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* معلومات الطلب */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Checkbox للتحديد المتعدد */}
                    {isSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                      />
                    )}
                    <h3 className="text-xl font-semibold">{order.order_number}</h3>
                  </div>
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
                    <p><strong>المبلغ الإجمالي:</strong> {Number(order.total_amount || 0).toLocaleString('ar-SA')} ر.س</p>
                    <p><strong>المبلغ المدفوع:</strong> {Number(order.paid_amount || 0).toLocaleString('ar-SA')} ر.س</p>
                    <p><strong>المبلغ المتبقي:</strong> {Number((order.total_amount || 0) - (order.paid_amount || 0)).toLocaleString('ar-SA')} ر.س</p>
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
                            <p className="text-gray-600">السعر: {Number(item.unit_price || 0).toLocaleString('ar-SA')} ر.س</p>
                            <p className="font-medium text-blue-600">الإجمالي: {Number(item.total_amount || 0).toLocaleString('ar-SA')} ر.س</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span>إجمالي البنود:</span>
                          <span className="text-blue-600">
                            {(order.order_items.reduce((sum, item) => sum + (item.total_amount || 0), 0)).toLocaleString('ar-SA')} ر.س
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* الأزرار */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
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
                  
                  {/* تعديل الطلب */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => openEditOrderDialog(order)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    تعديل الطلب
                  </Button>
                  
                  {/* حذف الطلب */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => openDeleteOrderDialog(order)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    حذف
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
                  
                  {/* طباعة ملصق باركود */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePrintBarcodeLabel(order)}
                  >
                    <Tags className="h-3 w-3 mr-1" />
                    ملصق
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
                        <p className="text-lg font-bold text-blue-600">{Number(selectedOrderForPayment.amount || 0).toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ المدفوع</p>
                        <p className="text-lg font-bold text-green-600">{Number(selectedOrderForPayment.paid_amount || 0).toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">المبلغ المتبقي</p>
                        <p className="text-lg font-bold text-red-600">{Number((selectedOrderForPayment.amount || 0) - (selectedOrderForPayment.paid_amount || 0)).toLocaleString()} ر.س</p>
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
                            <p className="font-medium">{Number(payment.amount || 0).toLocaleString()} ر.س</p>
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
                         step="0.01"
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
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                          <SelectItem value="card">الشبكة</SelectItem>
                          <SelectItem value="check">شيك</SelectItem>
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
                      onClick={() => setNewPayment({ amount: 0, payment_type: 'cash', notes: '' })}
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
                      <p><strong>المبلغ الإجمالي:</strong> {Number(selectedOrderForInvoice.amount || 0).toLocaleString()} ر.س</p>
                      <p><strong>المبلغ المدفوع:</strong> {Number(selectedOrderForInvoice.paid_amount || 0).toLocaleString()} ر.س</p>
                      <p><strong>المبلغ المتبقي:</strong> {Number((selectedOrderForInvoice.amount || 0) - (selectedOrderForInvoice.paid_amount || 0)).toLocaleString()} ر.س</p>
                    </div>
                  </div>
                  
                  {/* معلومات الاتصال */}
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-xs text-muted-foreground mb-1">معلومات الاتصال</p>
                    <div className="flex items-center gap-4 text-sm">
                      <p><strong>الواتساب:</strong> {selectedOrderForInvoice.customers?.whatsapp || 'غير متوفر'}</p>
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
                    {selectedOrderForInvoice.customers?.whatsapp && (
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
                {!selectedOrderForInvoice.customers?.whatsapp && (
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
                  type="text"
                  placeholder="0"
                  value={newOrder.paid_amount}
                  onChange={(e) => setNewOrder({...newOrder, paid_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="remaining_amount">المبلغ المتبقي</Label>
                <Input
                  id="remaining_amount"
                  type="text"
                  placeholder="0"
                  value={newOrder.amount - newOrder.paid_amount}
                  disabled
                  className="bg-muted"
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
                         step="0.01"
                         value={item.quantity}
                         onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                       />
                     </div>
                     <div className="col-span-2">
                       <Label htmlFor={`unit_price_${index}`}>سعر الوحدة</Label>
                       <Input
                         id={`unit_price_${index}`}
                         type="number"
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
                    {Number(newOrder.amount || 0).toLocaleString()} ر.س
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

      {/* حوار تعديل الطلب */}
      <Dialog open={isEditOrderDialogOpen} onOpenChange={setIsEditOrderDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الطلب</DialogTitle>
            <DialogDescription>
              تعديل بيانات الطلب {selectedOrderForEditing?.order_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_customer">العميل</Label>
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
                <Label htmlFor="edit_service">الخدمة</Label>
                <Input
                  id="edit_service"
                  placeholder="اسم الخدمة"
                  value={newOrder.service_name}
                  onChange={(e) => setNewOrder({...newOrder, service_name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_priority">الأولوية</Label>
                <Select value={newOrder.priority} onValueChange={(value) => setNewOrder({...newOrder, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="منخفضة">منخفضة</SelectItem>
                    <SelectItem value="متوسطة">متوسطة</SelectItem>
                    <SelectItem value="عالية">عالية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit_due_date">تاريخ الاستحقاق</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={newOrder.due_date}
                  onChange={(e) => setNewOrder({...newOrder, due_date: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_payment_type">نوع الدفع</Label>
                <Select value={newOrder.payment_type} onValueChange={(value) => setNewOrder({...newOrder, payment_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="دفع آجل">دفع آجل</SelectItem>
                    <SelectItem value="دفع مقدم">دفع مقدم</SelectItem>
                    <SelectItem value="دفع عند التسليم">دفع عند التسليم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_description">وصف الطلب</Label>
              <Textarea
                id="edit_description"
                placeholder="أدخل وصف مفصل للطلب..."
                value={newOrder.description}
                onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                rows={3}
              />
            </div>
            
            {/* بنود الطلب في التعديل */}
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
                      <Label htmlFor={`edit_item_name_${index}`}>اسم البند</Label>
                      <Input
                        id={`edit_item_name_${index}`}
                        placeholder="اسم البند"
                        value={item.item_name}
                        onChange={(e) => updateOrderItem(index, 'item_name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`edit_quantity_${index}`}>الكمية</Label>
                      <Input
                        id={`edit_quantity_${index}`}
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`edit_unit_price_${index}`}>سعر الوحدة</Label>
                      <Input
                        id={`edit_unit_price_${index}`}
                        type="number"
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
            </div>
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsEditOrderDialogOpen(false)}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button 
                onClick={updateOrder}
                disabled={loading || !newOrder.customer_id || !newOrder.service_name}
              >
                {loading ? 'جاري التحديث...' : 'تحديث الطلب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد حذف الطلب */}
      <Dialog open={isDeleteOrderDialogOpen} onOpenChange={setIsDeleteOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا الطلب؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrderForDelete && (
            <div className="space-y-3 p-4 border rounded-lg bg-red-50">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedOrderForDelete.order_number}</Badge>
                <span className="font-medium">{selectedOrderForDelete.service_name}</span>
              </div>
              <p><strong>العميل:</strong> {selectedOrderForDelete.customers?.name}</p>
              <p><strong>المبلغ:</strong> {Number(selectedOrderForDelete.amount || 0).toLocaleString('ar-SA')} ر.س</p>
              <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                <strong>تحذير:</strong> سيتم حذف جميع البيانات المرتبطة بهذا الطلب:
                <ul className="list-disc list-inside mt-1">
                  <li>بنود الطلب</li>
                  <li>المدفوعات المرتبطة</li>
                  <li>ملفات الطباعة</li>
                  <li>سجلات النشاط</li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteOrderDialogOpen(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={deleteOrder}
              disabled={loading}
            >
              {loading ? 'جاري الحذف...' : 'حذف الطلب نهائياً'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف المتعدد */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الطلبات المحددة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف {selectedOrderIds.size} طلب؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
            <div className="text-destructive text-sm">
              <strong>سيتم حذف ما يلي لكل طلب:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>بنود الطلب</li>
                <li>المدفوعات والقيود المحاسبية</li>
                <li>الفواتير وبنودها</li>
                <li>التقييمات</li>
                <li>طلبات الطباعة</li>
                <li>رسائل الواتساب</li>
                <li>سجلات النشاط</li>
              </ul>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={bulkDeleteOrders}
              disabled={loading}
            >
              {loading ? 'جاري الحذف...' : `حذف ${selectedOrderIds.size} طلب نهائياً`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;