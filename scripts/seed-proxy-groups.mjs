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
const groupsToCreate = ['CS101 Fall 2024', 'AIML Batch B', 'Data Science 102'];
const studentsPerGroup = 25;

async function seedProxyData() {
    console.log('Starting proxy data seeding...');

    // 1. Get the admin profile ID to assign as group creator
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'admin@university.edu')
        .single();

    if (!adminProfile) {
        console.error('Admin profile not found. Cannot set group creator.');
        return;
    }
    const adminId = adminProfile.id;

    let globalStudentCounter = 100; // Start STU IDs at 100 to avoid conflicts with 001, 002

    for (const groupName of groupsToCreate) {
        console.log(`\n--- Creating Group: ${groupName} ---`);

        // 2. Insert Group
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .insert({ name: groupName, created_by: adminId })
            .select('id')
            .single();

        if (groupError || !groupData) {
            console.error(`Failed to create group ${groupName}:`, groupError);
            continue;
        }

        const groupId = groupData.id;
        console.log(`Group created with ID: ${groupId}`);

        // 3. Generate Students for this group
        for (let i = 0; i < studentsPerGroup; i++) {
            globalStudentCounter++;
            const studentIdString = `stu${globalStudentCounter}`;
            const email = `${studentIdString}@university.edu`;
            const name = `Proxy Student ${globalStudentCounter}`;

            console.log(`  Processing ${studentIdString}...`);

            // Create in Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: defaultPassword,
                email_confirm: true,
                user_metadata: { name: name, role: 'student' }
            });

            let userId = authData?.user?.id;

            if (authError) {
                if (authError.message.includes('already exists')) {
                    const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).single();
                    if (profiles) userId = profiles.id;
                } else {
                    console.error(`  Error creating auth user ${email}:`, authError);
                    continue;
                }
            }

            if (userId) {
                // Upsert into profiles
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: userId,
                    email: email,
                    full_name: name,
                    role: 'student'
                });

                if (profileError) {
                    console.error(`  Error upserting profile for ${email}:`, profileError);
                    continue;
                }

                // 4. Link student to group
                const { error: linkError } = await supabase.from('group_students').insert({
                    group_id: groupId,
                    student_id: userId
                });

                if (linkError) {
                    console.error(`  Error linking student to group:`, linkError);
                }
            }
        }
    }

    console.log('\n✅ Proxy seeding completed successfully.');
}

seedProxyData();
