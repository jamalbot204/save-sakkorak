-- 1. إضافة عمود updated_at لجميع الجداول لتمكين المزامنة الذكية (Delta Sync)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.glucose_readings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.medication_logs ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

-- 2. إضافة أعمدة المرفقات لجدول رسائل المحادثة (chat_messages) لدعم إرسال الصور
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_mime_type text;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_data_url text;

-- 3. جعل عمود session_id يقبل القيم الفارغة (Nullable)
-- هذا ضروري لأن المزامنة الخلفية من جهاز المستخدم لا ترسل session_id محلياً
ALTER TABLE public.chat_messages ALTER COLUMN session_id DROP NOT NULL;

-- 4. حل مشكلة تعليق المحادثة (Pending) بسبب شرط الحذف الناعم
-- سنقوم بإزالة قيد NOT NULL عن عمود is_deleted في جدول chat_messages وجعله يقبل NULL كقيمة افتراضية
-- ليتوافق تماماً مع فلتر السيرفر (.is("is_deleted", null))
ALTER TABLE public.chat_messages ALTER COLUMN is_deleted DROP NOT NULL;
ALTER TABLE public.chat_messages ALTER COLUMN is_deleted SET DEFAULT NULL;

-- 5. تحديث الرسائل الحالية في قاعدة البيانات لتصبح NULL بدلاً من false لتظهر فوراً في التطبيق
UPDATE public.chat_messages SET is_deleted = NULL WHERE is_deleted = false;