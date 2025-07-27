# إعداد Webhook لاستقبال رسائل الواتساب

## URL الخاص بـ Webhook للاستقبال:
```
https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook
```

## إعداد n8n:

### 1. إنشاء workflow جديد في n8n:
- أضف HTTP Webhook node
- اختر POST method
- قم بإعداد الـ URL لاستقبال رسائل الواتساب من Meta/WhatsApp Business API

### 2. إعداد HTTP Request node:
- Method: POST
- URL: `https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook`
- Headers:
  - Content-Type: application/json

### 3. تنسيق البيانات المرسلة:

#### الطريقة 1 - تنسيق WhatsApp Business API:
```json
{
  "message": {
    "id": "message_id",
    "from": "+966535983261",
    "to": "business_number", 
    "type": "text",
    "text": {
      "body": "محتوى الرسالة"
    },
    "timestamp": 1640995200
  },
  "profile": {
    "name": "اسم العميل"
  }
}
```

#### الطريقة 2 - تنسيق مبسط:
```json
{
  "from": "+966535983261",
  "to": "business_number",
  "message": "محتوى الرسالة",
  "type": "text",
  "timestamp": 1640995200,
  "customerName": "اسم العميل"
}
```

#### الطريقة 3 - تنسيق مخصص:
```json
{
  "data": {
    "id": "message_id",
    "from": "+966535983261", 
    "to": "business_number",
    "message": "محتوى الرسالة",
    "type": "text",
    "timestamp": 1640995200
  }
}
```

## اختبار الـ Webhook:

يمكن اختبار الـ webhook بإرسال POST request إلى:
```
https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/whatsapp-webhook
```

مع البيانات التجريبية:
```json
{
  "from": "+966500000000",
  "message": "رسالة تجريبية",
  "customerName": "عميل تجريبي"
}
```

## ملاحظات مهمة:
- الـ webhook لا يتطلب مصادقة للرسائل الواردة
- سيتم إنشاء عميل جديد تلقائيًا إذا لم يكن موجودًا
- جميع الرسائل الواردة ستظهر في صفحة إدارة الواتساب في النظام