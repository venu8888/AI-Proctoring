-- TRINETRA 2.0 Strict Role-Based Access Control (RBAC) Policies
-- Run this script in your Supabase SQL Editor

-- 0. Helper Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. PROFILES
-- Drop existing open policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create strict policies
CREATE POLICY "Admins can view and manage all profiles" ON public.profiles
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Faculty can view all profiles" ON public.profiles
FOR SELECT USING (public.get_user_role() IN ('faculty', 'admin'));

CREATE POLICY "Users can view and update their own profile" ON public.profiles
FOR ALL USING (auth.uid() = id);

-- 2. GROUPS
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Only faculty/admins can manage groups" ON public.groups;

CREATE POLICY "Faculty and Admins can manage groups" ON public.groups
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

CREATE POLICY "Students can view groups" ON public.groups
FOR SELECT USING (true); -- Optional: restrict to groups they are in

-- 3. GROUP MEMBERS
DROP POLICY IF EXISTS "Group memberships are viewable by everyone" ON public.group_students;
DROP POLICY IF EXISTS "Only faculty/admins can manage group members" ON public.group_students;

CREATE POLICY "Faculty and Admins can manage group members" ON public.group_students
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

CREATE POLICY "Students can view their own memberships" ON public.group_students
FOR SELECT USING (student_id = auth.uid() OR public.get_user_role() IN ('admin', 'faculty'));

-- 4. QUESTIONS (Critical Security)
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Only faculty/admins can manage questions" ON public.questions;

-- Faculty and Admins possess full control
CREATE POLICY "Faculty and Admins can manage questions" ON public.questions
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

-- Note: Students DO NOT have access to the questions table directly.
-- The Next.js API route (/api/student/exam) uses the Supabase Service Role Key 
-- to securely fetch and serve questions without exposing the correct answers via client queries.

-- 5. EXAMS
DROP POLICY IF EXISTS "Exams are viewable by everyone" ON public.exams;
DROP POLICY IF EXISTS "Only faculty/admins manage exams" ON public.exams;

CREATE POLICY "Faculty and Admins can manage exams" ON public.exams
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

CREATE POLICY "Students can view exams" ON public.exams
FOR SELECT USING (true);

-- 6. EXAM GROUPS
DROP POLICY IF EXISTS "Exam assignments viewable by everyone" ON public.exam_groups;
DROP POLICY IF EXISTS "Only faculty/admins manage assignments" ON public.exam_groups;

CREATE POLICY "Faculty and Admins can manage assignments" ON public.exam_groups
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

CREATE POLICY "Students can view assigned exams" ON public.exam_groups
FOR SELECT USING (true);

-- 7. EXAM SESSIONS
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.sessions;

CREATE POLICY "Faculty and Admins can view and manage all sessions" ON public.sessions
FOR ALL USING (public.get_user_role() IN ('admin', 'faculty'));

CREATE POLICY "Students can insert their own session" ON public.sessions
FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view and update their own session" ON public.sessions
FOR ALL USING (auth.uid() = student_id);

-- 8. ACTIVITY LOGS
DROP POLICY IF EXISTS "Allow all operations for anon logs" ON public.activity_logs;

CREATE POLICY "Faculty and Admins can view all activity logs" ON public.activity_logs
FOR SELECT USING (public.get_user_role() IN ('admin', 'faculty'));

-- Students insert logs directly, but shouldn't delete them. 
-- Wait, logs don't directly reference student_id, they reference session_id.
-- Let's allow insert/select if they own the session.
CREATE POLICY "Students can insert logs for their sessions" ON public.activity_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE session_id = public.activity_logs.session_id AND student_id = auth.uid()
  )
);

CREATE POLICY "Students can view logs for their sessions" ON public.activity_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE session_id = public.activity_logs.session_id AND student_id = auth.uid()
  )
);
