-- Run this in the Supabase SQL Editor

-- 1. Create the Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id UUID PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, completed, terminated
    start_time BIGINT DEFAULT 0,
    end_time BIGINT,
    time_remaining INTEGER DEFAULT 3600,
    current_question INTEGER DEFAULT 0,
    answered_count INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    webcam_active BOOLEAN DEFAULT false,
    screen_share_active BOOLEAN DEFAULT false,
    mobile_connected BOOLEAN DEFAULT false,
    termination_reason TEXT,
    joined_at BIGINT NOT NULL,
    last_update BIGINT
);

-- Turn on Realtime for the sessions table
alter publication supabase_realtime add table public.sessions;

-- 2. Create Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    timestamp BIGINT NOT NULL
);

-- Turn on Realtime for the activity_logs table
alter publication supabase_realtime add table public.activity_logs;

-- 3. Create Behavior Flags Table
CREATE TABLE IF NOT EXISTS public.behavior_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.sessions(session_id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'fast_correct', 'suspicious_pattern', 'away_from_screen'
    description TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    timestamp BIGINT NOT NULL
);

-- Turn on Realtime for the behavior_flags table
alter publication supabase_realtime add table public.behavior_flags;

-- Set up Row Level Security (RLS) - FOR NOW, we allow all access for rapid prototyping. 
-- In Phase 4 (Security), we will lock this down.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON public.sessions FOR ALL USING (true);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON public.activity_logs FOR ALL USING (true);

ALTER TABLE public.behavior_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon" ON public.behavior_flags FOR ALL USING (true);
