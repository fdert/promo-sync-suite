-- إصلاح سياسة RLS لجدول subscriptions
DROP POLICY IF EXISTS "إنشاء اشتراكات جديدة" ON subscriptions;

-- إنشاء سياسة جديدة للسماح بإنشاء الاشتراكات
CREATE POLICY "إنشاء اشتراكات جديدة" 
ON subscriptions 
FOR INSERT 
WITH CHECK (true);

-- إصلاح سياسة الـ agency_members للسماح بإضافة الأعضاء
DROP POLICY IF EXISTS "المدراء يمكنهم إضافة أعضاء" ON agency_members;

CREATE POLICY "المدراء يمكنهم إضافة أعضاء" 
ON agency_members 
FOR INSERT 
WITH CHECK (true);