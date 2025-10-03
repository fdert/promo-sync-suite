-- إضافة القيم الجديدة إلى enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'جديد';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'مؤكد';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'قيد التنفيذ';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'قيد المراجعة';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'جاهز للتسليم';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'مكتمل';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ملغي';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'مؤجل';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'قيد الانتظار';