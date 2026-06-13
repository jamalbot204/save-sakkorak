-- 1. إضافة عمود "معرف الجهاز الحالي" لجدول الملف الشخصي لضمان تسجيل الدخول من جهاز واحد فقط
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_device_id text;

-- 2. إضافة عمود "الحذف الناعم" (is_deleted) لجميع جداول البيانات
-- القيمة الافتراضية ستكون false (أي أن البيانات غير محذوفة)
ALTER TABLE public.glucose_readings 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.water_logs 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.food_logs 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.medication_logs 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false NOT NULL;