import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * تنظيف رقم الهاتف من الأحرف الخاصة والرموز غير المرئية
 */
function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  return phone
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '') // إزالة رموز التوجيه
    .replace(/[^\d+\s-]/g, '') // السماح فقط بالأرقام و + والمسافات والشرطات
    .trim();
}
function normalizePhoneInternational(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  // توحيد إلى صيغة E.164 مع +966 لرقم سعودي
  if (digits.startsWith('00966')) {
    const local = digits.slice(5);
    return '+966' + (local.startsWith('0') ? local.slice(1) : local);
  }
  if (digits.startsWith('966')) {
    const local = digits.slice(3);
    return '+966' + (local.startsWith('0') ? local.slice(1) : local);
  }
  if (digits.startsWith('05') && digits.length === 10) {
    return '+966' + digits.slice(1);
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return '+966' + digits;
  }
  // fallback: إن لم يُعرف، أعد الرقم مع + إن كان يبدو دولياً
  return digits.length >= 11 ? ('+' + digits) : digits;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { headers: corsHeaders, status: 405 });
  }

  try {
    console.log('Function started successfully');
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const { type, order_id, data, source, webhook_preference, force_send } = requestBody;
    console.log('Notification request:', { type, order_id, data, source, webhook_preference, force_send });

    if (!type) {
      console.error('Missing required field: type');
      return new Response(
        JSON.stringify({ error: 'Missing required field: type' }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // For account_summary, we don't need order_id, just customer info
    if (type === 'account_summary') {
      if (!requestBody.customer_phone) {
        console.error('Missing customer_phone for account_summary');
        return new Response(
          JSON.stringify({ error: 'Missing customer_phone for account_summary' }),
          { headers: corsHeaders, status: 400 }
        );
      }
    } else {
      // For other notification types, we need order_id
      if (!order_id) {
        console.error('Missing required field: order_id');
        return new Response(
          JSON.stringify({ error: 'Missing required field: order_id' }),
          { headers: corsHeaders, status: 400 }
        );
      }
    }

    let message = '';
    let customerPhone = '';
    let customerName = '';
    let remainingAmount = '0';
    let orderItemsText = '';
    let paymentsDetailsText = '';
    let paymentsArray: { amount: number; payment_type: string }[] = [];
    let startDate = 'سيتم تحديده';
    let dueDate = 'سيتم تحديده';
    let companyName = 'وكالة الإبداع للدعاية والإعلان';

    // جلب اسم الشركة من قاعدة البيانات
    try {
      const { data: companyData } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'company_info')
        .maybeSingle();

      try {
        const parsed = typeof companyData?.value === 'string' ? JSON.parse(companyData.value as any) : (companyData?.value as any);
        if (parsed?.companyName) {
          companyName = parsed.companyName;
        }
      } catch (_) {
        // ignore JSON parse errors
      }
    } catch (error) {
      console.log('Could not fetch company name, using default');
    }

    // جلب بيانات الطلب الكاملة مع بنود الطلب لجميع أنواع الإشعارات
    let orderDetails = null;
    if (order_id) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, whatsapp, phone),
          order_items(item_name, quantity, unit_price, total, description),
          service_types(name)
        `)
        .eq('id', order_id)
        .single();
      
      if (!orderError && orderData) {
        orderDetails = orderData;
        console.log('Order details loaded:', orderDetails);
        
        // حساب المبلغ المدفوع من جدول المدفوعات مباشرة
        console.log('=== Payment Calculation Debug ===');
        console.log('Order ID:', order_id);
        
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, payment_type')
          .eq('order_id', order_id);
        
        console.log('Payments Error:', paymentsError);
        console.log('Payments Data:', payments);
        
        let totalPaidAmount = 0;
        if (payments && payments.length > 0) {
          totalPaidAmount = payments.reduce((sum: number, payment: any) => {
            const amt = Number(payment?.amount ?? 0);
            console.log('Adding payment amount:', amt);
            return sum + (isNaN(amt) ? 0 : amt);
          }, 0);
          
          // تنسيق تفاصيل الدفعات
          paymentsDetailsText = payments.map((payment: any, index: number) => {
            const paymentTypeMap: Record<string, string> = {
              'cash': 'نقدي',
              'bank_transfer': 'تحويل بنكي',
              'card': 'شبكة'
            };
            const paymentTypeAr = paymentTypeMap[payment.payment_type] || payment.payment_type || 'نقدي';
            return `${index + 1}. ${paymentTypeAr}: ${Number(payment.amount).toFixed(2)} ر.س`;
          }).join('\n');
          
          // مصفوفة الدفعات (مهيكلة)
          paymentsArray = payments.map((p: any) => ({ amount: Number(p.amount) || 0, payment_type: p.payment_type }));
          console.log('Payments Details Text:', paymentsDetailsText);
        }
        
        console.log('Total Paid Amount:', totalPaidAmount);
        console.log('=== Final Calculated Amount ===');
        
        // تحديث بيانات الطلب مع المبلغ المحسوب
        orderDetails.paid_amount = totalPaidAmount;
        
        // حساب المبلغ المتبقي بشكل مركزي
        const totalAmt = Number(orderDetails.total_amount || 0);
        const paidAmt = Number(totalPaidAmount || 0);
        const remainingAmt = Math.max(0, totalAmt - paidAmt);
        orderDetails.remaining_amount = remainingAmt;
        
        console.log('=== Final Values for Message ===');
        console.log('Total Amount:', orderDetails.total_amount);
        console.log('Actual Paid Amount:', totalPaidAmount);
        console.log('Remaining Amount:', remainingAmt);
      }
    }

    // تنسيق بنود الطلب أولاً (سواء كان هناك template أم لا)
    if (orderDetails) {
      if (orderDetails.order_items && orderDetails.order_items.length > 0) {
        orderItemsText = orderDetails.order_items.map((item: any, index: number) => {
          let itemText = `${index + 1}. ${item.item_name}`;
          if (item.description) {
            itemText += ` (${item.description})`;
          }
          itemText += `\n   الكمية: ${item.quantity}\n   السعر: ${item.unit_price} ر.س\n   المجموع: ${item.total} ر.س`;
          return itemText;
        }).join('\n\n');
        console.log('Order items formatted:', orderItemsText);
      } else {
        orderItemsText = 'لا توجد بنود محددة';
        console.log('No order items found');
      }
    }

    // تحديد اسم القالب المناسب حسب نوع الإشعار وحالة الطلب
    let templateName = type;
    
    // ربط أنواع الإشعارات وحالات الطلب بأسماء القوالب
    // استخدام الحالة الجديدة من البيانات المرسلة أولاً، ثم الحالة من قاعدة البيانات
    const currentStatus = data.new_status || orderDetails?.status || data.status;
    if (currentStatus) {
      switch (currentStatus) {
        case 'جديد':
          templateName = 'order_created';
          break;
        case 'مؤكد':
          templateName = 'order_confirmed';
          break;
        case 'قيد التنفيذ':
          templateName = 'order_in_progress';
          break;
        case 'قيد المراجعة':
          templateName = 'order_under_review';
          break;
        case 'جاهز للتسليم':
          templateName = 'order_ready_for_delivery';
          break;
        case 'مكتمل':
          templateName = 'order_completed';
          break;
        case 'ملغي':
          templateName = 'order_cancelled';
          break;
        case 'قيد الانتظار':
          templateName = 'order_on_hold';
          break;
        default:
          // استخدام نوع الإشعار إذا لم تطابق أي حالة
          switch (type) {
            case 'order_created':
            case 'order_confirmed':
            case 'order_in_progress':
            case 'order_under_review':
            case 'order_ready_for_delivery':
            case 'order_completed':
            case 'order_cancelled':
            case 'order_on_hold':
              templateName = type;
              break;
            case 'design_proof_sent':
              templateName = 'design_proof_ready';
              break;
            default:
              templateName = 'order_status_updated';
              break;
          }
      }
    } else {
      // إذا لم توجد بيانات الطلب، استخدم نوع الإشعار مباشرة
      switch (type) {
        case 'design_proof_sent':
          templateName = 'design_proof_ready';
          break;
        case 'order_created':
        case 'order_confirmed':
        case 'order_in_progress':
        case 'order_under_review':
        case 'order_ready_for_delivery':
        case 'order_completed':
        case 'order_cancelled':
        case 'order_on_hold':
          templateName = type;
          break;
        case 'account_summary':
          // للرسائل المباشرة (ملخص الحساب)، لا نحتاج قالب
          templateName = null;
          break;
        default:
          templateName = 'order_status_updated';
          break;
      }
    }
    
    console.log('Using template name:', templateName);

    // محاولة الحصول على قالب الرسالة من قاعدة البيانات (فقط إذا لم تكن رسالة مباشرة)
    if (templateName) {
      const { data: templateData, error: templateError } = await supabase
        .from('message_templates')
        .select('content')
        .eq('name', templateName)
        .eq('is_active', true)
        .maybeSingle();

      if (templateData?.content) {
        console.log('Using template from database:', templateData.content);
        
        // استخدام القالب من قاعدة البيانات
        message = templateData.content;
        
        // إذا كانت هناك تفاصيل طلب، استخدمها
        let description = 'غير محدد';
        if (orderDetails) {
          
          // استخدام المبلغ المتبقي المحسوب مسبقاً
          remainingAmount = (orderDetails.remaining_amount || 0).toString();
          
          // تنسيق التواريخ
          if (orderDetails.start_date) {
            startDate = new Date(orderDetails.start_date).toLocaleDateString('ar-SA');
          }
          if (orderDetails.due_date) {
            dueDate = new Date(orderDetails.due_date).toLocaleDateString('ar-SA');
          }
          
          description = orderDetails.description || 'غير محدد';
          
          // استخدام بيانات من orderDetails وتنظيف الرقم
          customerPhone = orderDetails.customers?.whatsapp || orderDetails.customers?.phone || data.customer_phone;
          // تنظيف رقم الهاتف من الأحرف الخاصة
          customerPhone = cleanPhoneNumber(customerPhone);
          customerName = orderDetails.customers?.name || data.customer_name;
        } else {
          // استخدام البيانات المرسلة مباشرة وتنظيف الرقم
          customerPhone = cleanPhoneNumber(data.customer_phone);
          customerName = data.customer_name;
          
          // حساب المبلغ المتبقي من البيانات المرسلة
          const totalAmount = Number(data.amount || 0);
          const paidAmount = Number(data.paid_amount || 0);
          remainingAmount = Math.max(0, totalAmount - paidAmount).toString();
        }
        
        // توحيد تنسيق رقم الهاتف إلى صيغة دولية (SA)
        const customerPhoneNormalized = normalizePhoneInternational(customerPhone);
        
        let deliveryDate = 'غير محدد';
        if (orderDetails?.delivery_date) {
          deliveryDate = new Date(orderDetails.delivery_date).toLocaleDateString('ar-SA');
        }
        
        // الحصول على اسم الخدمة
        const serviceName = orderDetails?.service_types?.name || data.service_name || 'غير محدد';
        
        // استبدال المتغيرات
        const replacements: Record<string, string> = {
          'customer_name': customerName || '',
          'order_number': data.order_number || '',
          'amount': (Number(orderDetails?.total_amount ?? data.amount ?? 0).toFixed(2)),
          'paid_amount': (Number(orderDetails?.paid_amount ?? data.paid_amount ?? 0).toFixed(2)),
          'remaining_amount': (Number(remainingAmount || 0).toFixed(2)),
          'payment_type': data.payment_type || 'غير محدد',
          'progress': data.progress?.toString() || '0',
          'service_name': serviceName,
          'description': description,
          'order_items': orderItemsText,
          'start_date': startDate,
          'due_date': dueDate,
          'delivery_date': deliveryDate,
          'status': data.new_status || data.status || orderDetails?.status || currentStatus || 'جديد',
          'priority': data.priority || 'متوسطة',
          'estimated_time': data.estimated_days || 'قريباً',
          'company_name': companyName,
          'evaluation_link': `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/${order_id}`,
          'payments_details': paymentsDetailsText || 'لا توجد دفعات مسجلة',
          'payments': paymentsDetailsText || 'لا توجد دفعات مسجلة'
        };

        // استبدال جميع المتغيرات في الرسالة
        Object.keys(replacements).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          message = message.replace(regex, replacements[key]);
        });

        // ضمان إدراج الدفعات داخل القالب بشكل موثوق
        const detailsText = paymentsDetailsText || 'لا توجد دفعات مسجلة';
        const hasExactDetails = detailsText && message.includes(detailsText);
        const hasPlaceholder = /{{\s*payments(_details)?\s*}}/i.test(message);
        if (hasPlaceholder) {
          // تم الاستبدال مسبقاً عبر replacements؛ إن لم يتم لأي سبب، نستبدله الآن
          message = message.replace(/{{\s*payments(_details)?\s*}}/gi, detailsText);
        }
        // بعد المعالجة، إذا ما زالت التفاصيل غير موجودة، أضف قسماً كاملاً في النهاية
        if (!hasExactDetails && !message.includes(detailsText)) {
          message += `\n\n💰 الدفعات:\n${detailsText}`;
        }
      } else {
      console.log('No template found, using fallback messages');
      
      const totalAmountNum = Number(orderDetails?.total_amount ?? data.amount ?? 0);
      const paidAmountNum = Number(orderDetails?.paid_amount ?? data.paid_amount ?? 0);
      const remainingAmountNum = Math.max(0, Number((totalAmountNum - paidAmountNum).toFixed(2)));
      
      // تنسيق تاريخ التسليم للرسائل الاحتياطية
      let deliveryDateText = '';
      if (orderDetails?.delivery_date) {
        deliveryDateText = `\n📅 تاريخ التسليم: ${new Date(orderDetails.delivery_date).toLocaleDateString('ar-SA')}`;
      }
      
      // تنسيق اسم الخدمة للرسائل الاحتياطية
      const serviceNameText = orderDetails?.service_types?.name || data.service_name || 'غير محدد';
      
      // الرسائل الافتراضية إذا لم توجد قوالب
      switch (type) {
        case 'order_created':
          message = `مرحباً ${data.customer_name}! تم إنشاء طلبك رقم ${data.order_number} بنجاح. 

📋 تفاصيل الطلب:
الخدمة: ${serviceNameText}
الوصف: ${data.description || 'غير محدد'}
قيمة الطلب: ${data.amount} ر.س${deliveryDateText}

📦 بنود الطلب:
${orderItemsText || 'لا توجد بنود محددة'}

سيتم التواصل معك قريباً لتأكيد التفاصيل. شكراً لثقتك بخدماتنا!`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_confirmed':
          message = `${data.customer_name}، تم تأكيد طلبك رقم ${data.order_number}. بدأ العمل على مشروعك وسيتم إنجازه خلال ${data.estimated_days || 'قريباً'}.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_in_progress':
          const paymentsText1 = paymentsDetailsText ? `\n\n💰 الدفعات:\n${paymentsDetailsText}` : '\n\n💰 الدفعات:\nلا توجد دفعات مسجلة';
          message = `${data.customer_name}، طلبك رقم ${data.order_number} قيد التنفيذ حالياً. التقدم: ${data.progress || 0}%. سنبقيك على اطلاع بآخر التطورات.${deliveryDateText}\n\n📊 الملخص المالي:\nقيمة الطلب: ${totalAmountNum} ر.س\nمدفوع: ${paidAmountNum} ر.س\nالمتبقي: ${remainingAmountNum} ر.س${paymentsText1}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_completed':
          const paymentsText2 = paymentsDetailsText ? `\n\n💰 الدفعات:\n${paymentsDetailsText}` : '\n\n💰 الدفعات:\nلا توجد دفعات مسجلة';
          message = `تهانينا ${data.customer_name}! تم إنجاز طلبك رقم ${data.order_number} بنجاح. يمكنك الآن مراجعة النتائج. نشكرك لثقتك بخدماتنا!${deliveryDateText}\n\n📊 الملخص المالي:\nقيمة الطلب: ${totalAmountNum} ر.س\nمدفوع: ${paidAmountNum} ر.س\nالمتبقي: ${remainingAmountNum} ر.س${paymentsText2}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_updated':
          const paymentsText3 = paymentsDetailsText ? `\n\n💰 الدفعات:\n${paymentsDetailsText}` : '\n\n💰 الدفعات:\nلا توجد دفعات مسجلة';
          message = `${data.customer_name}، تم تحديث طلبك رقم ${data.order_number}. الحالة الحالية: ${data.status}. سنبقيك على اطلاع بأي تطورات جديدة.${deliveryDateText}\n\n📊 الملخص المالي:\nقيمة الطلب: ${totalAmountNum} ر.س\nمدفوع: ${paidAmountNum} ر.س\nالمتبقي: ${remainingAmountNum} ر.س${paymentsText3}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_cancelled':
          message = `عزيزي ${data.customer_name}، تم إلغاء طلبك رقم ${data.order_number}. للاستفسار يرجى التواصل معنا.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_ready_for_delivery':
          const paymentsText4 = paymentsDetailsText ? `\n\n💰 الدفعات:\n${paymentsDetailsText}` : '\n\n💰 الدفعات:\nلا توجد دفعات مسجلة';
          message = `${data.customer_name}، طلبك رقم ${data.order_number} جاهز للتسليم!${deliveryDateText} لتقييم الخدمة يرجى الضغط هنا: ${data.evaluation_link}\n\n📊 الملخص المالي:\nقيمة الطلب: ${totalAmountNum} ر.س\nمدفوع: ${paidAmountNum} ر.س\nالمتبقي: ${remainingAmountNum} ر.س${paymentsText4}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'status_update':
          const paymentsText5 = paymentsDetailsText ? `\n\n💰 الدفعات:\n${paymentsDetailsText}` : '\n\n💰 الدفعات:\nلا توجد دفعات مسجلة';
          message = `${data.customer_name}، تم تحديث حالة طلبك رقم ${data.order_number} من "${data.old_status}" إلى "${data.new_status}". سنبقيك على اطلاع بأي تطورات جديدة.${deliveryDateText}\n\n📊 الملخص المالي:\nقيمة الطلب: ${totalAmountNum} ر.س\nمدفوع: ${paidAmountNum} ر.س\nالمتبقي: ${remainingAmountNum} ر.س${paymentsText5}`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'order_under_review':
          message = `${data.customer_name}، طلبك رقم ${data.order_number} قيد المراجعة حالياً. سيتم التواصل معك قريباً لتأكيد التفاصيل.`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'design_proof':
          message = `🎨 *بروفة التصميم جاهزة للمراجعة*

📋 *تفاصيل الطلب:*
• رقم الطلب: ${data.order_number}
• العميل: ${data.customer_name}
• الخدمة: ${data.service_name}
${data.order_items_text || ''}

📸 *لاستعراض البروفة:*
👇 اضغط على الرابط التالي لعرض التصميم:
${data.file_url}

*بعد مراجعة البروفة:*

✅ *للموافقة:* أرسل "موافق"
📝 *للتعديل:* اكتب التعديلات المطلوبة

شكراً لكم،
فريق *${data.company_name || 'وكالة الإبداع للدعاية والإعلان'}*`;
          customerPhone = data.customer_phone;
          customerName = data.customer_name;
          break;

        case 'account_summary':
          message = requestBody.message || 'ملخص الحساب';
          customerPhone = requestBody.customer_phone;
          customerName = requestBody.customer_name;
          break;

        default:
          // للحصول على بيانات الطلب إذا كان متوفراً
          if (orderDetails) {
            customerPhone = orderDetails.customers?.whatsapp || orderDetails.customers?.phone || '';
            customerName = orderDetails.customers?.name || 'عزيزنا العميل';
          } else {
            customerPhone = data.customer_phone;
            customerName = data.customer_name;
          }
          message = `${customerName}، تم تحديث طلبك رقم ${data.order_number}.`;
          break;
      }
      }
    } else {
      // إذا لم يكن هناك قالب، استخدم الرسائل الافتراضية فقط
      console.log('No template name, using direct message format');
    }
    
    // التحقق من أن البيانات مكتملة
    console.log('Final values before sending:', { 
      customerPhone, 
      customerName, 
      messageLength: message.length,
      type 
    });

    if (!customerPhone || !message) {
      console.error('Missing data:', { 
        hasCustomerPhone: !!customerPhone, 
        hasMessage: !!message,
        customerPhone,
        messagePreview: message.substring(0, 100)
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing customer phone or message content',
          details: { hasCustomerPhone: !!customerPhone, hasMessage: !!message }
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // البحث عن إعدادات الويب هوك للإرسال
    const { data: webhookSettings } = await supabase
      .from('webhook_settings')
      .select('webhook_url, order_statuses, webhook_name, webhook_type, is_active')
      .eq('is_active', true);

    console.log('Found webhooks:', webhookSettings);

    // البحث عن webhook مناسب لهذا النوع من الإشعارات
    let selectedWebhook = null;
    
    if (webhookSettings && webhookSettings.length > 0) {
      console.log('Looking for webhook with type:', type);
      console.log('Webhook preference:', webhook_preference);
      console.log('Source:', source);
      console.log('Available webhooks:', webhookSettings.map(w => ({
        name: w.webhook_name,
        type: w.webhook_type,
        active: w.is_active,
        statuses: w.order_statuses
      })));
      
      // إذا كان هناك webhook مفضل محدد، ابحث عنه أولاً  
      if (webhook_preference) {
        console.log('Looking for preferred webhook:', webhook_preference);
        
        selectedWebhook = webhookSettings.find(w => 
          w.webhook_name.trim() === webhook_preference.trim() && 
          w.is_active && 
          w.webhook_type === 'outgoing'
        );
        
        if (selectedWebhook) {
          console.log('Found preferred webhook:', selectedWebhook.webhook_name);
          console.log('Webhook URL:', selectedWebhook.webhook_url);
          console.log('Webhook statuses:', selectedWebhook.order_statuses);
          
          // تحقق من دعم نوع الإشعار
          if (!selectedWebhook.order_statuses || 
              selectedWebhook.order_statuses.length === 0 || 
              selectedWebhook.order_statuses.includes(type)) {
            console.log('Preferred webhook supports this notification type');
          } else {
            console.log('Preferred webhook does not support notification type:', type);
            selectedWebhook = null;
          }
        } else {
          console.log('Preferred webhook not found:', webhook_preference);
        }
      }
      
      // إذا لم نجد الويب هوك المفضل، ابحث عن أي webhook مناسب
      if (!selectedWebhook) {
        console.log('Searching for alternative webhook for type:', type);
        
        // البحث عن webhook نشط يحتوي على هذا النوع من الإشعارات
        for (const webhook of webhookSettings) {
          console.log('Checking alternative webhook:', {
            name: webhook.webhook_name,
            type: webhook.webhook_type,
            active: webhook.is_active,
            statuses: webhook.order_statuses
          });
          
          // تأكد من أن الـ webhook نشط
          if (!webhook.is_active) {
            continue;
          }
          
          // تحقق من webhook_type - نريد 'outgoing' للإشعارات
          if (webhook.webhook_type !== 'outgoing') {
            continue;
          }
          
          // تحقق من order_statuses
          if (!webhook.order_statuses || webhook.order_statuses.length === 0) {
            // webhook لجميع الحالات
            selectedWebhook = webhook;
            console.log('Using webhook for all statuses:', webhook.webhook_name);
            break;
          } else if (Array.isArray(webhook.order_statuses) && webhook.order_statuses.includes(type)) {
            // webhook مخصص لهذا النوع
            selectedWebhook = webhook;
            console.log('Found matching webhook for type:', type, '- webhook:', webhook.webhook_name);
            break;
          }
        }
      }
      
      // إذا لم نجد webhook مخصص، نستخدم أول webhook نشط من نوع outgoing
      if (!selectedWebhook) {
        console.log('No specific webhook found, looking for fallback');
        const activeWebhook = webhookSettings.find(w => w.is_active && w.webhook_type === 'outgoing');
        if (activeWebhook) {
          selectedWebhook = activeWebhook;
          console.log('Using first active outgoing webhook as fallback');
        }
      }
    }

    if (!selectedWebhook?.webhook_url) {
      console.log('No matching webhook found for notification type:', type);
      // بدلاً من رمي خطأ، سنحاول الإرسال مع webhook افتراضي إذا وجد
      if (webhookSettings && webhookSettings.length > 0) {
        selectedWebhook = webhookSettings[0];
        console.log('Using first available webhook as last resort');
      } else {
        throw new Error(`No active webhook configured for notification type: ${type}`);
      }
    }
    // ضمان إرفاق الدفعات دائماً بنهاية الرسالة
    const finalPaymentsDetailsText = paymentsDetailsText || 'لا توجد دفعات مسجلة';
    if (!message.includes(finalPaymentsDetailsText)) {
      message += `\n\n💰 الدفعات:\n${finalPaymentsDetailsText}`;
    }

    // إعداد بيانات الرسالة للإرسال عبر n8n كمتغيرات منفصلة في الجذر
    const normalizedPhone = normalizePhoneInternational(customerPhone);
    const phoneDigits = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
    
    // تنسيق تاريخ التسليم للإرسال
    let deliveryDateFormatted = 'غير محدد';
    if (orderDetails?.delivery_date) {
      deliveryDateFormatted = new Date(orderDetails.delivery_date).toLocaleDateString('ar-SA');
    }
    
    // الحصول على اسم الخدمة للإرسال
    const serviceNameForSend = orderDetails?.service_types?.name || data.service_name || 'غير محدد';
    
    const messagePayload = {
      // متغيرات قوالب الرسائل - يمكن الوصول إليها مباشرة في n8n
      customer_name: customerName,
      order_number: data.order_number || '',
      service_name: serviceNameForSend,
      description: orderDetails?.description || data.description || 'غير محدد',
      amount: (Number(orderDetails?.total_amount ?? data.amount ?? 0).toFixed(2)),
      paid_amount: (Number(orderDetails?.paid_amount ?? data.paid_amount ?? 0).toFixed(2)),
      remaining_amount: (Number(orderDetails?.remaining_amount ?? remainingAmount ?? 0).toFixed(2)),
      payment_type: data.payment_type || 'غير محدد',
      status: data.new_status || data.status || orderDetails?.status || currentStatus || '',
      priority: data.priority || 'متوسطة',
      start_date: startDate,
      due_date: dueDate,
      delivery_date: deliveryDateFormatted,
      order_items: orderItemsText,
      payments_details: paymentsDetailsText || 'لا توجد دفعات مسجلة',
      payments: paymentsArray,
      evaluation_link: `https://e5a7747a-0935-46df-9ea9-1308e76636dc.lovableproject.com/evaluation/${order_id}`,
      company_name: companyName,
      estimated_time: data.estimated_days || 'قريباً',
      progress: data.progress?.toString() || '0',
      date: new Date().toLocaleDateString('ar-SA'),
      
      // بيانات الواتساب للإرسال المباشر
      to: normalizedPhone,
      to_e164: normalizedPhone,
      to_digits: phoneDigits,
      phone: normalizedPhone,
      phoneNumber: normalizedPhone,
      phone_e164: normalizedPhone,
      phone_digits: phoneDigits,
      msisdn: phoneDigits,
      message: message,
      messageText: message,
      text: message,
      
      // معلومات نوع الإشعار
      notification_type: type,
      type: type,
      
      // البيانات الإضافية
      timestamp: Math.floor(Date.now() / 1000),
      order_id: order_id
    };

    console.log('Sending notification via webhook:', JSON.stringify(messagePayload, null, 2));

    const isForceSend = !!force_send || templateName === 'order_completed' || currentStatus === 'مكتمل';

    // فحص التكرار قبل الحفظ/الإرسال: نفس الرقم ونفس المحتوى خلال آخر 10 دقائق
    // إلا إذا كان isForceSend = true (من لوحة الموظف عند تغيير الحالة أو حالة مكتمل)
    if (!isForceSend) {
      try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: existingDup } = await supabase
          .from('whatsapp_messages')
          .select('id, status, created_at')
          .eq('to_number', normalizedPhone)
          .eq('message_content', message)
          .in('status', ['sent', 'pending'])
          .gt('created_at', tenMinAgo)
          .limit(1);

        if (existingDup && existingDup.length > 0) {
          console.log('Duplicate notification detected. Skipping send.');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'تم تجاهل الإرسال لتجنب التكرار خلال 10 دقائق',
              duplicate: true
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
      } catch (e) {
        console.log('Duplicate pre-check failed, continuing anyway:', e?.message);
      }
    } else {
      console.log('Force send enabled (includes مكتمل), skipping duplicate check');
    }

    console.log('=== Saving message to database first (with dedupe) ===');

    const eventOrderId = (typeof order_id !== 'undefined' && order_id) || orderDetails?.id || requestBody?.order_id || 'unknown';
    const dedupeKeyBase = `${type}|${eventOrderId}|${normalizedPhone}`;
    const dedupeKey = isForceSend ? `${dedupeKeyBase}|${Date.now()}` : dedupeKeyBase;

    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .upsert({
        from_number: 'system',
        to_number: normalizedPhone,
        message_type: 'text',
        message_content: message,
        status: 'pending',
        is_reply: false,
        customer_id: orderDetails?.customer_id || null,
        dedupe_key: dedupeKey,
      }, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    
    if (saveError) {
      console.error('Error saving message:', saveError);
      throw saveError;
    }

    if (!savedMessage) {
      if (isForceSend) {
        console.log('Duplicate via dedupe_key but force send enabled (includes مكتمل). Proceeding to send.');
      } else {
        console.log('Duplicate detected via dedupe_key. Skipping webhook send.');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم تجاهل الإرسال لتجنب التكرار (dedupe)',
            duplicate: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }
    
    console.log('Message saved to database with ID:', savedMessage.id);
    
    if (saveError) {
      console.error('Error saving message:', saveError);
      throw saveError;
    }
    
    console.log('Message saved to database with ID:', savedMessage.id);

    // إرسال الرسالة عبر webhook إلى n8n مع آلية بديلة عند الفشل
    let response;
    let responseData;
    let messageStatus: 'sent' | 'failed' = 'failed';
    let usedWebhookUrl = selectedWebhook.webhook_url;
    let usedWebhookName = (selectedWebhook as any)?.webhook_name || 'unknown';

    try {
      response = await fetch(selectedWebhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Functions'
        },
        body: JSON.stringify(messagePayload),
        signal: AbortSignal.timeout(30000)
      });

      try {
        responseData = await response.text();
        console.log('Webhook response status (primary):', response.status);
        console.log('Webhook response data (primary):', responseData);
      } catch (e) {
        responseData = 'Failed to read response';
        console.log('Failed to read webhook response:', e);
      }

      if (response.ok && response.status >= 200 && response.status < 300) {
        console.log('Primary webhook sent successfully');
        messageStatus = 'sent';
      } else {
        console.warn(`Primary webhook failed with status: ${response.status}`);
        console.warn(`Primary webhook response: ${responseData}`);

        // محاولة استخدام ويب هوكات outgoing بديلة غير تجريبية
        const { data: outgoingList } = await supabase
          .from('webhook_settings')
          .select('webhook_url, webhook_type, webhook_name, is_active')
          .eq('webhook_type', 'outgoing')
          .eq('is_active', true);

        const isTestUrl = (url?: string) => !!url && url.includes('/webhook-test/');
        const candidates = (outgoingList || []).filter((w: any) => w.webhook_url && !isTestUrl(w.webhook_url));

        for (const w of candidates) {
          if (w.webhook_url === selectedWebhook.webhook_url) continue;
          console.warn('Trying fallback webhook:', w.webhook_name);
          try {
            const altRes = await fetch(w.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(messagePayload)
            });
            const altBody = await altRes.text();
            console.log('Webhook response (fallback):', altRes.status, altBody);
            if (altRes.ok) {
              response = altRes;
              responseData = altBody;
              usedWebhookUrl = w.webhook_url;
              usedWebhookName = w.webhook_name;
              messageStatus = 'sent';
              break;
            }
          } catch (e) {
            console.warn('Fallback webhook fetch error:', e?.message);
          }
        }
      }
    } catch (fetchError) {
      console.error('Fetch error on primary webhook:', fetchError);
      messageStatus = 'failed';
      responseData = `Fetch error: ${fetchError.message}`;
    }

    // تحديث حالة الرسالة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        status: messageStatus,
        sent_at: messageStatus === 'sent' ? new Date().toISOString() : null,
        error_message: messageStatus === 'failed' ? responseData : null
      })
      .eq('id', savedMessage.id);

    if (updateError) {
      console.error('Error updating message status:', updateError);
    } else {
      console.log('Message status updated to:', messageStatus);
    }

    return new Response(
      JSON.stringify({ 
        success: messageStatus === 'sent',
        message: messageStatus === 'sent' ? 'Notification sent successfully' : 'Failed to deliver via available webhooks',
        type: type,
        customer_phone: customerPhone,
        used_webhook: usedWebhookName,
        status: messageStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});