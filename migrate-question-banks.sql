-- Migration: Add Custom Question Banks
-- 1. Create question_banks table
CREATE TABLE IF NOT EXISTS public.question_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for question_banks
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question banks are viewable by everyone" 
ON public.question_banks FOR SELECT USING (true);

CREATE POLICY "Only faculty/admins can manage question banks" 
ON public.question_banks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty'))
);

-- 2. Add bank_id to questions
-- Add column as nullable first to avoid breaking existing data
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.question_banks(id) ON DELETE CASCADE;

-- 3. Create a default question bank for existing questions
DO $$
DECLARE
    default_bank_id UUID;
    admin_id UUID;
BEGIN
    -- Get the first admin user to own the default bank
    SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Create default bank
        INSERT INTO public.question_banks (id, name, description, created_by)
        VALUES (uuid_generate_v4(), 'Default Question Bank', 'System created default bank for existing questions', admin_id)
        RETURNING id INTO default_bank_id;

        -- Update existing questions to use this bank
        UPDATE public.questions SET bank_id = default_bank_id WHERE bank_id IS NULL;
        
        -- Make bank_id required for future inserts
        ALTER TABLE public.questions ALTER COLUMN bank_id SET NOT NULL;
    END IF;
END $$;
