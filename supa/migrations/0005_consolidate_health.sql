-- Consolidate 5 separate health tables into 1 JSONB blob for simplicity
-- Tables dropped: medications, glucose_readings, food_logs, medication_logs, water_logs
-- Table created: health_data (user_id PK, data JSONB, updated_at)

-- 1. Drop old RLS policies for the tables we're removing
DROP POLICY IF EXISTS "Users can manage their own medications" ON public.medications;
DROP POLICY IF EXISTS "Users can manage their own glucose readings" ON public.glucose_readings;
DROP POLICY IF EXISTS "Users can manage their own food logs" ON public.food_logs;
DROP POLICY IF EXISTS "Users can manage their own medication logs" ON public.medication_logs;
DROP POLICY IF EXISTS "Users can manage their own water logs" ON public.water_logs;

-- 2. Drop the old tables
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.glucose_readings CASCADE;
DROP TABLE IF EXISTS public.food_logs CASCADE;
DROP TABLE IF EXISTS public.medication_logs CASCADE;
DROP TABLE IF EXISTS public.water_logs CASCADE;

-- 3. Create the single health_data table
CREATE TABLE public.health_data (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{"medications":[],"glucoseReadings":[],"medicationLogs":[],"foodLogs":[],"waterLogs":{}}'::jsonb,
  updated_at timestamp with time zone
);

-- 4. Enable RLS
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;

-- 5. Single RLS policy
CREATE POLICY "Users can manage their own health data"
ON public.health_data
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Remove medications column from profiles (moved to health_data)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS medications;
