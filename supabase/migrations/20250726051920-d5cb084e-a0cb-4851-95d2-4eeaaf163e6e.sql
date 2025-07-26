-- إصلاح تحذير search_path للدالة
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';