import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Upload,
  Download,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';
import { cleanPhoneNumber } from "@/lib/utils";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [manualImportData, setManualImportData] = useState('');
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showExistingCustomer, setShowExistingCustomer] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    company: "",
    city: "",
    address: "",
    notes: ""
  });

  const { toast } = useToast();

  // جلب العملاء من قاعدة البيانات
  const fetchCustomers = async () => {
    console.log('🔄 جاري جلب العملاء من قاعدة البيانات...');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ خطأ في جلب العملاء:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في جلب بيانات العملاء",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ تم جلب عدد العملاء:', data?.length || 0);
      setCustomers(data || []);
    } catch (error) {
      console.error('❌ خطأ عام:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تصدير بيانات العملاء (الاسم ورقم الجوال فقط)
  const handleExportCustomers = () => {
    try {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "الاسم,رقم الجوال\n"
        + customers.map(customer => 
          `${customer.name || ''},${customer.phone || ''}`
        ).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "نجح",
        description: "تم تصدير بيانات العملاء بنجاح",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  // استيراد بيانات العملاء مع دعم شامل للعربي
  const handleImportCustomers = async () => {
    if (!importFile) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار ملف للاستيراد",
        variant: "destructive",
      });
      return;
    }

    try {
      // قائمة بالترميزات المدعومة للتجربة
      const encodings = ['UTF-8', 'windows-1256', 'ISO-8859-6'];
      let finalResults = null;
      
      for (const encoding of encodings) {
        try {
          console.log(`🔍 محاولة قراءة الملف بترميز: ${encoding}`);
          
          const parseResults = await new Promise((resolve, reject) => {
            Papa.parse(importFile, {
              encoding: encoding,
              skipEmptyLines: true,
              header: false,
              transformHeader: (header) => header.trim(),
              transform: (value) => {
                // تنظيف القيم وإزالة الرموز الغريبة
                return value.replace(/[""'']/g, '').trim();
              },
              complete: (results) => {
                console.log(`📄 نتائج ${encoding}:`, results.data?.slice(0, 3));
                resolve(results);
              },
              error: reject
            });
          });
          
          const testData = (parseResults as any).data as string[][];
          
          // فحص جودة البيانات - البحث عن الرموز الغريبة
          const hasGoodArabic = testData.some(row => 
            row.some(cell => 
              cell && 
              !cell.includes('◆') && 
              !cell.includes('�') && 
              /[\u0600-\u06FF]/.test(cell) // فحص الأحرف العربية
            )
          );
          
          if (hasGoodArabic || encoding === 'UTF-8') {
            console.log(`✅ تم اختيار الترميز: ${encoding}`);
            finalResults = parseResults;
            break;
          }
          
        } catch (err) {
          console.warn(`❌ فشل الترميز ${encoding}:`, err);
          continue;
        }
      }
      
      if (!finalResults) {
        toast({
          title: "خطأ",
          description: "لم نتمكن من قراءة الملف. تأكد من صيغة الملف",
          variant: "destructive",
        });
        return;
      }
      
      const rows = finalResults.data as string[][];
      console.log('📊 جميع السطور:', rows.slice(0, 5));
      
      if (rows.length === 0) {
        toast({
          title: "خطأ", 
          description: "الملف فارغ",
          variant: "destructive",
        });
        return;
      }
      
      // تحديد ما إذا كان السطر الأول عناوين
      const firstRow = rows[0];
      const hasHeaders = firstRow && firstRow.some(cell => 
        cell?.includes('اسم') || 
        cell?.includes('الاسم') || 
        cell?.includes('Name') ||
        cell?.includes('جوال') ||
        cell?.includes('هاتف') ||
        cell?.includes('phone')
      );
      
      console.log('🏷️ يحتوي على عناوين:', hasHeaders);
      
      const dataRows = hasHeaders ? rows.slice(1) : rows;
      console.log('📋 سطور البيانات:', dataRows.slice(0, 3));
      
      const newCustomers = dataRows
        .map((row, index) => {
          if (!row || row.length < 2) return null;
          
          // أخذ أول عمودين كاسم ورقم جوال
          let name = String(row[0] || '').trim();
          let phone = String(row[1] || '').trim();
          
          // تنظيف إضافي للنص العربي
          name = name.replace(/[""'']/g, '').replace(/^\s+|\s+$/g, '');
          phone = phone.replace(/[""'']/g, '').replace(/^\s+|\s+$/g, '');
          
          console.log(`📝 السطر ${index + 1}: الاسم="${name}", الهاتف="${phone}"`);
          
          if (!name || !phone || name.length < 2 || phone.length < 8) {
            console.log(`⚠️ السطر ${index + 1}: بيانات غير صالحة`);
            return null;
          }
          
          return {
            name: name,
            phone: cleanPhoneNumber(phone),
            whatsapp: cleanPhoneNumber(phone)
          };
        })
        .filter(customer => customer !== null);
        
      console.log('👥 العملاء المستخرجون:', newCustomers.slice(0, 3));

      if (newCustomers.length === 0) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات صالحة",
          variant: "destructive",
        });
        return;
      }

      // فحص التكرار
      const existingPhones = customers.map(c => c.phone);
      const uniqueCustomers = newCustomers.filter(newCustomer => 
        !existingPhones.includes(newCustomer.phone)
      );
      
      const finalCustomers = uniqueCustomers.filter((customer, index, self) =>
        index === self.findIndex(c => c.phone === customer.phone)
      );
      
      const duplicateCount = newCustomers.length - finalCustomers.length;

      if (finalCustomers.length === 0) {
        toast({
          title: "تنبيه",
          description: `جميع العملاء موجودون مسبقاً (${duplicateCount} عميل متكرر)`,
        });
        return;
      }

      console.log('💾 حفظ العملاء:', finalCustomers);
      
      const { error } = await supabase
        .from('customers')
        .insert(finalCustomers);

      if (error) {
        console.error('❌ خطأ في الحفظ:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حفظ البيانات",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ نجح الاستيراد",
        description: `تم استيراد ${finalCustomers.length} عميل${duplicateCount > 0 ? ` (تجاهل ${duplicateCount} متكرر)` : ''}`,
      });

      setIsImportDialogOpen(false);
      setImportFile(null);
      fetchCustomers();
      
    } catch (error) {
      console.error('💥 خطأ عام:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في معالجة الملف",
        variant: "destructive",
      });
    }
  };

  // استيراد بيانات العملاء من النص اليدوي
  const handleManualImport = async () => {
    if (!manualImportData.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البيانات للاستيراد",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('📝 بيانات الإدخال اليدوي:', manualImportData.substring(0, 200));
      
      // تقسيم النص إلى سطور
      const lines = manualImportData
        .split(/\r?\n|\r/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      console.log('📋 عدد السطور:', lines.length);

      // تحديد ما إذا كان السطر الأول عناوين
      const firstLine = lines[0];
      const hasHeaders = firstLine && (
        firstLine.includes('اسم') || 
        firstLine.includes('الاسم') || 
        firstLine.includes('Name') ||
        firstLine.includes('جوال') ||
        firstLine.includes('هاتف') ||
        firstLine.includes('phone')
      );

      const dataLines = hasHeaders ? lines.slice(1) : lines;
      console.log('📊 سطور البيانات:', dataLines.slice(0, 3));

      const newCustomers = dataLines
        .map((line, index) => {
          // تقسيم السطر بناءً على التاب أو الفاصلة أو مسافات متعددة
          const parts = line.split(/\t|,|\s{2,}/).map(part => part.trim());
          
          if (parts.length < 2) {
            console.log(`⚠️ السطر ${index + 1}: يحتاج عمودين على الأقل`);
            return null;
          }

          const name = parts[0];
          const phone = parts[1];

          console.log(`📝 السطر ${index + 1}: الاسم="${name}", الهاتف="${phone}"`);

          if (!name || !phone || name.length < 2 || phone.length < 8) {
            console.log(`⚠️ السطر ${index + 1}: بيانات غير صالحة`);
            return null;
          }

          return {
            name: name,
            phone: cleanPhoneNumber(phone),
            whatsapp: cleanPhoneNumber(phone)
          };
        })
        .filter(customer => customer !== null);

      console.log('👥 العملاء المستخرجون:', newCustomers.slice(0, 3));

      if (newCustomers.length === 0) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بيانات صالحة",
          variant: "destructive",
        });
        return;
      }

      // فحص التكرار
      const existingPhones = customers.map(c => c.phone);
      const uniqueCustomers = newCustomers.filter(newCustomer => 
        !existingPhones.includes(newCustomer.phone)
      );
      
      const finalCustomers = uniqueCustomers.filter((customer, index, self) =>
        index === self.findIndex(c => c.phone === customer.phone)
      );
      
      const duplicateCount = newCustomers.length - finalCustomers.length;

      if (finalCustomers.length === 0) {
        toast({
          title: "تنبيه",
          description: `جميع العملاء موجودون مسبقاً (${duplicateCount} عميل متكرر)`,
        });
        return;
      }

      console.log('💾 حفظ العملاء:', finalCustomers);
      
      const { error } = await supabase
        .from('customers')
        .insert(finalCustomers);

      if (error) {
        console.error('❌ خطأ في الحفظ:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حفظ البيانات",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ نجح الاستيراد",
        description: `تم استيراد ${finalCustomers.length} عميل${duplicateCount > 0 ? ` (تجاهل ${duplicateCount} متكرر)` : ''}`,
      });

      setIsImportDialogOpen(false);
      setManualImportData('');
      setImportFile(null);
      fetchCustomers();
      
    } catch (error) {
      console.error('💥 خطأ عام:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في معالجة البيانات",
        variant: "destructive",
      });
    }
  };

  // إصلاح العملاء المستوردين بترميز خاطئ عبر حذفهم وإعادة استيرادهم
  const handleFixExistingCustomers = async () => {
    try {
      // البحث عن جميع العملاء المستوردين الذين يحتوون على رموز غريبة
      const importedCustomers = customers.filter(customer => {
        if (!customer.name) return false;
        
        // فحص شامل لجميع أنواع الرموز المشوهة
        const hasCorruptedChars = (
          customer.name.includes('◆') ||
          customer.name.includes('�') ||
          customer.name.includes('??') ||
          customer.name.includes('□') ||
          customer.name.includes('▢') ||
          /[^\u0600-\u06FF\u0020-\u007E\s\u060C\u061B\u061F]/.test(customer.name) || // رموز غير عربية/إنجليزية/علامات ترقيم
          customer.name.length < 2 ||
          /^عميل/.test(customer.name) || // الأسماء التي تبدأ بكلمة "عميل"
          customer.import_source === 'CSV Import' // جميع المستوردين لضمان الحذف
        );
        
        console.log(`فحص العميل: "${customer.name}" - مشوه: ${hasCorruptedChars}`);
        return hasCorruptedChars;
      });

      if (importedCustomers.length === 0) {
        toast({
          title: "لا توجد مشاكل",
          description: "لا توجد عملاء مستوردين يحتاجون لإصلاح",
        });
        return;
      }

      // عرض تأكيد للمستخدم
      const confirmed = window.confirm(
        `تم العثور على ${importedCustomers.length} عميل مستورد بترميز خاطئ.\n\n` +
        `سيتم حذف هؤلاء العملاء وطلب إعادة استيرادهم من ملف CSV جديد.\n\n` +
        `تأكد من حفظ ملف CSV بترميز UTF-8 قبل المتابعة.\n\n` +
        `هل تريد المتابعة؟`
      );

      if (!confirmed) return;

      // حذف العملاء المتأثرين
      toast({
        title: "جاري الحذف...",
        description: "يتم حذف العملاء المتأثرين",
      });

      const deletePromises = importedCustomers.map(customer => 
        supabase
          .from('customers')
          .delete()
          .eq('id', customer.id)
      );

      const deleteResults = await Promise.all(deletePromises);
      const deleteFailures = deleteResults.filter(result => result.error);

      if (deleteFailures.length > 0) {
        console.error('أخطاء في الحذف:', deleteFailures);
        toast({
          title: "خطأ في الحذف",
          description: `فشل حذف ${deleteFailures.length} عميل`,
          variant: "destructive",
        });
        return;
      }

      // تحديث القائمة
      await fetchCustomers();

      toast({
        title: "تم الحذف بنجاح",
        description: `تم حذف ${importedCustomers.length} عميل. يمكنك الآن إعادة الاستيراد`,
      });

      // عرض نصائح للمستخدم
      setTimeout(() => {
        alert(
          "نصائح لإعادة الاستيراد:\n\n" +
          "1. تأكد من حفظ ملف Excel كـ CSV (UTF-8)\n" +
          "2. أو استخدم Notepad وحفظ بترميز UTF-8\n" +
          "3. أو استخدم Google Sheets وصدّر كـ CSV\n\n" +
          "ثم استخدم زر 'استيراد' لرفع الملف الجديد"
        );
      }, 1000);
      
    } catch (error) {
      console.error('خطأ في إصلاح العملاء:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في العملية",
        variant: "destructive",
      });
    }
  };

  // حذف العملاء المتكررين حسب رقم الجوال مع معالجة القيود
  const handleRemoveDuplicates = async () => {
    try {
      console.log('🔍 بدء البحث عن العملاء المتكررين...');
      
      // البحث عن العملاء المتكررين حسب رقم الجوال فقط
      const phoneGroups: { [key: string]: any[] } = {};
      
      customers.forEach(customer => {
        if (customer.phone && customer.phone.trim() !== '') {
          const cleanPhone = customer.phone.trim();
          if (!phoneGroups[cleanPhone]) {
            phoneGroups[cleanPhone] = [];
          }
          phoneGroups[cleanPhone].push(customer);
        }
      });

      const duplicateGroups = Object.entries(phoneGroups).filter(([phone, group]) => group.length > 1);
      
      if (duplicateGroups.length === 0) {
        toast({
          title: "✅ لا توجد متكررات",
          description: "لا توجد عملاء بأرقام جوال متكررة",
        });
        return;
      }

      // فحص العملاء المتكررين للبحث عن الذين لديهم بيانات مرتبطة
      const customersToDelete: any[] = [];
      const customersWithData: any[] = [];
      let totalDuplicates = 0;

      for (const [phone, group] of duplicateGroups) {
        // ترتيب المجموعة حسب تاريخ الإنشاء (الأحدث أولاً)
        const sortedGroup = group.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        
        totalDuplicates += group.length;
        
        // فحص العملاء المراد حذفهم للتأكد من عدم وجود بيانات مرتبطة
        for (let i = 1; i < sortedGroup.length; i++) {
          const customer = sortedGroup[i];
          
          // فحص إذا كان العميل لديه طلبات
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id')
            .eq('customer_id', customer.id)
            .limit(1);
            
          if (ordersError) {
            console.error('خطأ في فحص الطلبات:', ordersError);
            continue;
          }
          
          // فحص إذا كان العميل لديه فواتير
          const { data: invoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('id')
            .eq('customer_id', customer.id)
            .limit(1);
            
          if (invoicesError) {
            console.error('خطأ في فحص الفواتير:', invoicesError);
            continue;
          }
          
          if (orders && orders.length > 0) {
            customersWithData.push({ customer, type: 'طلبات' });
            console.log(`⚠️ العميل ${customer.name} لديه ${orders.length} طلب`);
          } else if (invoices && invoices.length > 0) {
            customersWithData.push({ customer, type: 'فواتير' });
            console.log(`⚠️ العميل ${customer.name} لديه ${invoices.length} فاتورة`);
          } else {
            customersToDelete.push(customer);
            console.log(`✅ العميل ${customer.name} يمكن حذفه`);
          }
        }
      }

      if (customersToDelete.length === 0 && customersWithData.length > 0) {
        toast({
          title: "⚠️ لا يمكن الحذف",
          description: `جميع العملاء المتكررين (${customersWithData.length}) لديهم بيانات مرتبطة (طلبات أو فواتير)`,
          variant: "destructive",
        });
        return;
      }

      let confirmMessage = '';
      
      if (customersToDelete.length > 0) {
        confirmMessage += `سيتم حذف ${customersToDelete.length} عميل متكرر.\n\n`;
      }
      
      if (customersWithData.length > 0) {
        confirmMessage += `تحذير: ${customersWithData.length} عميل لديهم بيانات مرتبطة ولن يتم حذفهم:\n`;
        confirmMessage += customersWithData.slice(0, 3).map(item => 
          `• ${item.customer.name} (لديه ${item.type})`
        ).join('\n');
        if (customersWithData.length > 3) {
          confirmMessage += `\n... و ${customersWithData.length - 3} عملاء آخرين`;
        }
        confirmMessage += '\n\n';
      }
      
      confirmMessage += 'هل تريد المتابعة؟';

      if (!window.confirm(confirmMessage)) {
        return;
      }

      if (customersToDelete.length === 0) {
        toast({
          title: "لا شيء للحذف",
          description: "جميع العملاء المتكررين لديهم بيانات مرتبطة",
        });
        return;
      }

      toast({
        title: "🗑️ جاري الحذف...",
        description: `يتم حذف ${customersToDelete.length} عميل`,
      });

      // حذف العملاء الذين لا يحتوون على بيانات مرتبطة
      const customerIds = customersToDelete.map(customer => customer.id);
      
      const { error, count } = await supabase
        .from('customers')
        .delete()
        .in('id', customerIds);

      if (error) {
        console.error('❌ خطأ في الحذف:', error);
        throw error;
      }

      await fetchCustomers();
      
      let successMessage = `تم حذف ${customersToDelete.length} عميل متكرر`;
      if (customersWithData.length > 0) {
        successMessage += ` (تم تجاهل ${customersWithData.length} عميل لديهم بيانات مرتبطة)`;
      }
      
      toast({
        title: "✅ تم الحذف بنجاح",
        description: successMessage,
      });
      
    } catch (error) {
      console.error('💥 خطأ في حذف المتكررين:', error);
      toast({
        title: "❌ خطأ في الحذف",
        description: error?.message || "حدث خطأ في حذف العملاء المتكررين",
        variant: "destructive",
      });
    }
  };

  // التحقق من وجود رقم الجوال
  const checkExistingPhone = async (phone) => {
    if (!phone || phone.length < 10) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (data && !error) {
        setExistingCustomer(data);
        setShowExistingCustomer(true);
      } else {
        setExistingCustomer(null);
        setShowExistingCustomer(false);
      }
    } catch (error) {
      // العميل غير موجود
      setExistingCustomer(null);
      setShowExistingCustomer(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    if (!newCustomer.phone) {
      toast({
        title: "خطأ",
        description: "يرجى ملء رقم الجوال",
        variant: "destructive",
      });
      return;
    }

    // التحقق من عدم وجود رقم الجوال مسبقاً
    if (existingCustomer) {
      toast({
        title: "عميل موجود",
        description: "يوجد عميل بنفس رقم الجوال",
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanedPhone = cleanPhoneNumber(newCustomer.phone);
      const { error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: cleanedPhone || null,
          whatsapp: cleanedPhone || null,
          company: newCustomer.company || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          notes: newCustomer.notes || null
        }]);

      if (error) {
        console.error('Error adding customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في إضافة العميل",
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        company: "",
        city: "",
        address: "",
        notes: ""
      });
      setExistingCustomer(null);
      setShowExistingCustomer(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "تم إضافة العميل",
        description: "تم إضافة العميل بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      whatsapp_number: customer.whatsapp_number || "",
      company: customer.company,
      city: customer.city,
      address: customer.address || "",
      notes: customer.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم العميل",
        variant: "destructive",
      });
      return;
    }

    try {
      const cleanedPhone = cleanPhoneNumber(newCustomer.phone);
      const { error } = await supabase
        .from('customers')
        .update({
          name: newCustomer.name,
          email: newCustomer.email || null,
          phone: cleanedPhone || null,
          whatsapp: cleanedPhone || null,
          company: newCustomer.company || null,
          address: newCustomer.address || null,
          city: newCustomer.city || null,
          notes: newCustomer.notes || null
        })
        .eq('id', editingCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحديث العميل",
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        company: "",
        city: "",
        address: "",
        notes: ""
      });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      
      toast({
        title: "تم تحديث العميل",
        description: "تم تحديث بيانات العميل بنجاح",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const confirmDeleteCustomer = (customer) => {
    setCustomerToDelete(customer);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      // أولاً التحقق من وجود طلبات أو فواتير مرتبطة بالعميل
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerToDelete.id);
        
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerToDelete.id);
        
      if (orders?.length > 0 || invoices?.length > 0) {
        toast({
          title: "لا يمكن حذف العميل",
          description: "يوجد طلبات أو فواتير مرتبطة بهذا العميل. يرجى حذفها أولاً.",
          variant: "destructive",
        });
        setCustomerToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في حذف العميل: " + error.message,
          variant: "destructive",
        });
        return;
      }

      await fetchCustomers();
      
      toast({
        title: "تم حذف العميل",
        description: `تم حذف العميل ${customerToDelete.name} بنجاح`,
      });
      
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع في حذف العميل",
        variant: "destructive",
      });
      setCustomerToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري تحميل العملاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان والإحصائيات */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            إدارة العملاء
          </h1>
          <p className="text-muted-foreground mt-1">
            قاعدة بيانات شاملة لجميع عملاء الوكالة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Button onClick={handleExportCustomers} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير
          </Button>
          
          <Button onClick={handleRemoveDuplicates} variant="outline" className="gap-2">
            <Trash2 className="h-4 w-4" />
            حذف المتكررين
          </Button>
          
          <Button onClick={handleFixExistingCustomers} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            إصلاح الأسماء
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                استيراد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>استيراد العملاء</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* طريقة رفع الملف */}
                <div>
                  <Label htmlFor="import-file" className="text-base font-medium">📁 رفع ملف CSV</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    الملف يجب أن يحتوي على عمودين: الاسم، رقم الجوال
                  </p>
                  <div className="mt-2">
                    <Button onClick={handleImportCustomers} disabled={!importFile} className="w-full">
                      استيراد من ملف CSV
                    </Button>
                  </div>
                </div>

                <div className="text-center text-muted-foreground text-sm font-medium">
                  أو
                </div>

                {/* طريقة الإدخال اليدوي */}
                <div>
                  <Label htmlFor="manual-data" className="text-base font-medium">✍️ إدخال يدوي (نسخ ولصق)</Label>
                  <Textarea
                    id="manual-data"
                    value={manualImportData}
                    onChange={(e) => setManualImportData(e.target.value)}
                    placeholder={`انسخ البيانات من Excel والصقها هنا...

مثال:
أحمد محمد	+966501234567
فاطمة أحمد	+966512345678
محمد علي	+966523456789

يمكنك فصل الاسم ورقم الجوال بـ Tab أو فاصلة أو مسافات متعددة`}
                    className="mt-2 min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    💡 <strong>نصيحة:</strong> انسخ العمودين (الاسم ورقم الجوال) من Excel مباشرة والصقهم هنا
                  </p>
                  <div className="mt-2">
                    <Button onClick={handleManualImport} disabled={!manualImportData.trim()} className="w-full">
                      استيراد البيانات اليدوية
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setImportFile(null);
                      setManualImportData('');
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم العميل</Label>
                  <Input 
                    id="name" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="أدخل اسم العميل" 
                  />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="example@domain.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="phone">رقم الجوال *</Label>
                  <Input 
                    id="phone" 
                    value={newCustomer.phone}
                    onChange={(e) => {
                      setNewCustomer({ ...newCustomer, phone: e.target.value });
                      checkExistingPhone(e.target.value);
                    }}
                    placeholder="+966501234567" 
                  />
                  {showExistingCustomer && existingCustomer && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm font-medium text-yellow-800">
                        ⚠️ يوجد عميل بنفس رقم الجوال:
                      </p>
                      <p className="text-sm text-yellow-700">
                        الاسم: {existingCustomer.name}
                      </p>
                      {existingCustomer.company && (
                        <p className="text-sm text-yellow-700">
                          الشركة: {existingCustomer.company}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEditCustomer(existingCustomer)}
                        className="mt-2 text-xs text-blue-600 underline"
                      >
                        تعديل بيانات العميل الموجود
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="company">اسم الشركة/المؤسسة</Label>
                  <Input 
                    id="company" 
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="اختياري" 
                  />
                </div>
                <div>
                  <Label htmlFor="city">المدينة (اختياري)</Label>
                  <Input 
                    id="city" 
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="الرياض" 
                  />
                </div>
                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea 
                    id="notes" 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية..." 
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleAddCustomer}
                  >
                    حفظ العميل
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Customer Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>تعديل بيانات العميل</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">اسم العميل</Label>
                  <Input 
                    id="edit-name" 
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="أدخل اسم العميل" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">البريد الإلكتروني (اختياري)</Label>
                  <Input 
                    id="edit-email" 
                    type="email" 
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="example@domain.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">رقم الجوال</Label>
                  <Input 
                    id="edit-phone" 
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="+966501234567" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company">اسم الشركة/المؤسسة</Label>
                  <Input 
                    id="edit-company" 
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="اختياري" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-city">المدينة (اختياري)</Label>
                  <Input 
                    id="edit-city" 
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    placeholder="الرياض" 
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">ملاحظات</Label>
                  <Textarea 
                    id="edit-notes" 
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                    placeholder="أي ملاحظات إضافية..." 
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    onClick={handleUpdateCustomer}
                  >
                    تحديث البيانات
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عملاء نشطون</p>
                <p className="text-xl font-bold">{customers.filter(c => c.status === 'نشط').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عملاء جدد هذا الشهر</p>
                <p className="text-xl font-bold">{customers.filter(c => {
                  const created = new Date(c.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 p-2 rounded-lg">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الطلبات</p>
                <p className="text-xl font-bold">{customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + (c.total_orders || 0), 0) / customers.length) : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول العملاء */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم العميل</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>معلومات التواصل</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>عدد الطلبات</TableHead>
                <TableHead>إجمالي المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        انضم في {new Date(customer.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{customer.company || 'غير محدد'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {customer.phone || 'غير محدد'}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {customer.email || 'غير محدد'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {customer.city || 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>{customer.total_orders || 0}</TableCell>
                  <TableCell className="font-medium">{customer.total_spent || '0 ر.س'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                      {customer.status || 'نشط'}
                    </span>
                  </TableCell>
                  <TableCell>
                  <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirmDeleteCustomer(customer)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* حوار تأكيد حذف العميل */}
      <AlertDialog open={customerToDelete !== null} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العميل "{customerToDelete?.name}"؟ 
              <br />
              سيتم التحقق من وجود طلبات أو فواتير مرتبطة قبل الحذف.
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف العميل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;