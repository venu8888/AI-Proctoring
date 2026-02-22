-- TRINETRA 2.0 Comprehensive Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ⚠️ CLEANUP PREVIOUS V1 TEST TABLES ⚠️
-- Since we are moving to a fully relational (V2) database where "students" are actual User Profiles
-- and "exams" are actual Exam records, we need to drop the old unconnected testing tables.
-- ==========================================
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.behavior_flags CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.exam_groups CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.group_students CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-----------------------------------------
-- 1. PROFILES (Extends Supabase Auth)
-----------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-----------------------------------------
-- 2. GROUPS (Cohorts)
-----------------------------------------
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Only faculty/admins can manage groups" ON public.groups FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-----------------------------------------
-- 3. GROUP MEMBERS (Students in Groups)
-----------------------------------------
CREATE TABLE public.group_students (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, student_id)
);

ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group memberships are viewable by everyone" ON public.group_students FOR SELECT USING (true);
CREATE POLICY "Only faculty/admins can manage group members" ON public.group_students FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-----------------------------------------
-- 4. QUESTIONS (Question Bank)
-----------------------------------------
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings
    correct_answer INTEGER NOT NULL, -- Index of correct option
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Only faculty/admins can manage questions" ON public.questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-----------------------------------------
-- 5. EXAMS
-----------------------------------------
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    pass_marks INTEGER NOT NULL,
    blueprint JSONB NOT NULL, -- e.g. [{"topic":"DB", "easy": 5, "medium": 3, "hard": 2, "marks_per_difficulty": {"easy":1, "medium":2, "hard":5}}]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exams are viewable by everyone" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Only faculty/admins manage exams" ON public.exams FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-----------------------------------------
-- 6. EXAM ASSIGNMENTS (Which groups take which exam)
-----------------------------------------
CREATE TABLE public.exam_groups (
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    PRIMARY KEY (exam_id, group_id)
);

ALTER TABLE public.exam_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exam assignments viewable by everyone" ON public.exam_groups FOR SELECT USING (true);
CREATE POLICY "Only faculty/admins manage assignments" ON public.exam_groups FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-----------------------------------------
-- 7. EXAM SESSIONS (Student Taking Exam)
-----------------------------------------
CREATE TABLE public.sessions (
    session_id TEXT PRIMARY KEY,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'flagged', 'terminated')),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    current_question INTEGER DEFAULT 0,
    answered_count INTEGER DEFAULT 0,
    behavior_flags JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '{}'::jsonb, -- Store selected answers
    score INTEGER,
    trust_score INTEGER DEFAULT 100
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- Using 'true' for anon access to support unauthenticated students during dev if needed, 
-- but ideally should check auth.uid()
CREATE POLICY "Allow all operations for anon" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-----------------------------------------
-- 8. ACTIVITY LOGS (Browser Events, Violations)
-----------------------------------------
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
