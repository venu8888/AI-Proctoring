import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iecmngbqfazqhvnscaqt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllY21uZ2JxZmF6cWh2bnNjYXF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc3ODg0MiwiZXhwIjoyMDg3MzU0ODQyfQ.F4itfW49blFsLNnMfs1yUQFe0pqEYX1YMDgHekIr7mQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const defaultPassword = 'password123';

const usersToSeed = [
    { email: 'admin@university.edu', name: 'System Admin', role: 'admin' },
    { email: 'prof.smith@university.edu', name: 'Professor Smith', role: 'faculty' },
    { email: 'stu001@university.edu', name: 'John Doe', role: 'student' },
    { email: 'stu002@university.edu', name: 'Jane Smith', role: 'student' },
    { email: 'stu003@university.edu', name: 'Bob Wilson', role: 'student' }
];

async function seedUsers() {
    console.log('Starting user seeding...');

    for (const user of usersToSeed) {
        console.log(`Processing ${user.email}...`);

        // 1. Create or get user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: { name: user.name, role: user.role }
        });

        let userId = authData?.user?.id;

        if (authError) {
            if (authError.message.includes('already exists')) {
                console.log(`User ${user.email} already exists in Auth. Fetching ID...`);
                // Admin api to get users list could be used or just assume it's created
                // We can just rely on the existing profile if we don't have the ID
                const { data: profiles } = await supabase.from('profiles').select('id').eq('email', user.email).single();
                if (profiles) {
                    userId = profiles.id;
                } else {
                    console.error(`Could not find profile for existing auth user ${user.email}`);
                    continue;
                }
            } else {
                console.error(`Error creating auth user ${user.email}:`, authError);
                continue;
            }
        } else {
            console.log(`Successfully created auth user: ${userId}`);
        }

        if (userId) {
            // 2. Upsert into public.profiles
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: userId,
                email: user.email,
                full_name: user.name,
                role: user.role
            });

            if (profileError) {
                console.error(`Error upserting profile for ${user.email}:`, profileError);
            } else {
                console.log(`Successfully linked profile for ${user.email}`);
            }
        }
    }

    console.log('User seeding completed.');
}

seedUsers();
