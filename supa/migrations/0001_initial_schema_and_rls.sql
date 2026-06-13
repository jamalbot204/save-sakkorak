-- 1. التأكد من تفعيل جدار الحماية RLS على جميع الجداول (للاحتياط)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. تنظيف وحذف جميع السياسات القديمة (بكل المسميات السابقة لتجنب التكرار والتضارب)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can manage own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can manage their own medications" ON public.medications;

DROP POLICY IF EXISTS "Users can manage own glucose readings" ON public.glucose_readings;
DROP POLICY IF EXISTS "Users can manage their own glucose readings" ON public.glucose_readings;

DROP POLICY IF EXISTS "Users can manage own water logs" ON public.water_logs;
DROP POLICY IF EXISTS "Users can manage their own water logs" ON public.water_logs;

DROP POLICY IF EXISTS "Users can manage own food logs" ON public.food_logs;
DROP POLICY IF EXISTS "Users can manage their own food logs" ON public.food_logs;

DROP POLICY IF EXISTS "Users can manage own medication logs" ON public.medication_logs;
DROP POLICY IF EXISTS "Users can manage their own medication logs" ON public.medication_logs;

DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;

-- 3. إنشاء السياسات الجديدة المحكمة والآمنة 100% والتي تدعم الـ upsert

-- جدول الملف الشخصي (تم تعديله ليكون FOR ALL ليسمح بالـ upsert والقراءة والتعديل بأمان)
CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- جدول الأدوية المضافة
CREATE POLICY "Users can manage their own medications"
ON public.medications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول قراءات السكر
CREATE POLICY "Users can manage their own glucose readings"
ON public.glucose_readings
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول سجلات المياه
CREATE POLICY "Users can manage their own water logs"
ON public.water_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول سجلات الطعام
CREATE POLICY "Users can manage their own food logs"
ON public.food_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول سجلات أخذ الجرعات
CREATE POLICY "Users can manage their own medication logs"
ON public.medication_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول جلسات المحادثة
CREATE POLICY "Users can manage their own chat sessions"
ON public.chat_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- جدول رسائل المحادثة
CREATE POLICY "Users can manage their own chat messages"
ON public.chat_messages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);