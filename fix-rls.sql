-- Run this in the Supabase SQL Editor to fix the RLS policies for INSERT/UPDATE

-- Fix policies for the sessions table
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.sessions;
CREATE POLICY "Allow all operations for anon" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- Fix policies for the activity_logs table
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.activity_logs;
CREATE POLICY "Allow all operations for anon" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Fix policies for the behavior_flags table
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.behavior_flags;
CREATE POLICY "Allow all operations for anon" ON public.behavior_flags FOR ALL USING (true) WITH CHECK (true);
