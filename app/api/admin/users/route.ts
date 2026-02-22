import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Important: We need the SERVICE ROLE KEY to bypass RLS and auto-login issues
// when an admin is creating accounts for other users.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
    try {
        const { email, password, fullName, role } = await request.json()

        if (!email || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // 1. Create User in Auth using Admin API (does not sign out current admin)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for internal provisioning
            user_metadata: {
                full_name: fullName,
                role: role
            }
        })

        if (authError) {
            throw new Error(authError.message)
        }

        if (!authData.user) {
            throw new Error('User creation failed, no user returned')
        }

        // 2. Insert into Profiles table
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: fullName,
                role: role
            })

        if (profileError) {
            // If profile fails, ideally we rollback auth user, but for now just throw
            throw new Error(`Profile creation failed: ${profileError.message}`)
        }

        return NextResponse.json({
            success: true,
            user: {
                id: authData.user.id,
                email,
                role
            }
        })

    } catch (error: any) {
        console.error('Provisioning API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
