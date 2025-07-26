-- دالة لتحديث إحصائيات التقييمات تلقائياً
CREATE OR REPLACE FUNCTION public.update_evaluation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- حذف الإحصائيات القديمة وإنشاء جديدة
  DELETE FROM public.evaluation_stats;
  
  INSERT INTO public.evaluation_stats (
    total_evaluations,
    average_rating,
    five_star_count,
    four_star_count,
    three_star_count,
    two_star_count,
    one_star_count,
    recommendation_percentage,
    service_quality_avg,
    delivery_time_avg,
    communication_avg,
    price_value_avg
  )
  SELECT 
    COUNT(*) as total_evaluations,
    ROUND(AVG(rating), 2) as average_rating,
    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
    ROUND((COUNT(CASE WHEN would_recommend = true THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2) as recommendation_percentage,
    ROUND(AVG(service_quality_rating), 2) as service_quality_avg,
    ROUND(AVG(delivery_time_rating), 2) as delivery_time_avg,
    ROUND(AVG(communication_rating), 2) as communication_avg,
    ROUND(AVG(price_value_rating), 2) as price_value_avg
  FROM public.evaluations
  WHERE submitted_at IS NOT NULL;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger لتحديث الإحصائيات عند إضافة/تحديث/حذف تقييم
CREATE TRIGGER update_stats_on_evaluation_change
AFTER INSERT OR UPDATE OR DELETE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_evaluation_stats();

-- إضافة قالب رسالة للطلب الجاهز للتسليم
INSERT INTO public.message_templates (template_name, template_type, template_content) 
VALUES (
  'order_ready_for_delivery',
  'order_ready_for_delivery', 
  'مرحباً {{customer_name}}! 🎉

✅ *طلبك جاهز للتسليم!*

📋 *تفاصيل الطلب:*
رقم الطلب: {{order_number}}
الخدمة: {{service_name}}
الوصف: {{description}}

💰 *المعلومات المالية:*
إجمالي المبلغ: {{amount}} ر.س
المبلغ المدفوع: {{paid_amount}} ر.س
المبلغ المتبقي: {{remaining_amount}} ر.س

📦 *بنود الطلب:*
{{order_items}}

📅 تاريخ التسليم: {{due_date}}

نشكرك لثقتك الغالية بخدماتنا ونتطلع لخدمتك مرة أخرى! 💕

🌟 *نرجو تقييم خدمتنا:*
{{evaluation_link}}

شكراً لاختيارك خدماتنا! 🙏'
);