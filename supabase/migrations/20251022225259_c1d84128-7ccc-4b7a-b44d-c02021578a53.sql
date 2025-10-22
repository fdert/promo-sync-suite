-- حذف الـ foreign key الموجود وإعادة إضافته للتأكد من ربطه بـ profiles
ALTER TABLE public.user_activity_logs
DROP CONSTRAINT IF EXISTS user_activity_logs_user_id_fkey;

-- إضافة foreign key جديد يربط بـ profiles
ALTER TABLE public.user_activity_logs
ADD CONSTRAINT user_activity_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;