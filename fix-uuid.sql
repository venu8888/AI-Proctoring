-- Run this script in the Supabase SQL Editor to fix the UUID mismatch

-- 1. Drop the foreign key constraints first so we can alter the types
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_session_id_fkey;
ALTER TABLE public.behavior_flags DROP CONSTRAINT IF EXISTS behavior_flags_session_id_fkey;

-- 2. Alter the session_id column type in all tables from UUID to TEXT
ALTER TABLE public.sessions ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE public.activity_logs ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;
ALTER TABLE public.behavior_flags ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- 3. Re-add the foreign key constraints pointing to the new TEXT column
ALTER TABLE public.activity_logs
    ADD CONSTRAINT activity_logs_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE CASCADE;

ALTER TABLE public.behavior_flags
    ADD CONSTRAINT behavior_flags_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE CASCADE;
