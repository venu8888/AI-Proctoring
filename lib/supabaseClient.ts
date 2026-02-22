import { createClient } from './supabase/client';

// Export a singleton of the browser client for legacy components
export const supabase = createClient();
