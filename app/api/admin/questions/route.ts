import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
    try {
        const { data: questions, error } = await supabaseAdmin
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transform from row to our component expected shape (optional based on preference, but good for compatibility)
        const formattedQuestions = (questions || []).map(q => ({
            questionId: q.id,
            question: q.text,
            options: q.options,
            correctAnswer: q.correct_answer,
            difficulty: q.difficulty,
            minimumExpectedTime: 30, // Mock for now or add to schema
            topic: q.topic
        }))

        return NextResponse.json({
            questions: formattedQuestions,
            version: 1 // Stub version for clients if needed
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { action, question, questionId, updates } = body

        if (action === 'add') {
            const { error } = await supabaseAdmin.from('questions').insert({
                topic: question.topic || 'General', // Fallback
                difficulty: question.difficulty,
                text: question.question,
                options: question.options,
                correct_answer: question.correctAnswer
            })
            if (error) throw error
        }
        else if (action === 'update') {
            const { error } = await supabaseAdmin
                .from('questions')
                .update({
                    topic: updates.topic,
                    difficulty: updates.difficulty,
                    text: updates.question,
                    options: updates.options,
                    correct_answer: updates.correctAnswer
                })
                .match({ id: questionId })
            if (error) throw error
        }
        // Note: 'reset' action is deprecated, we don't want to wipe the real database
        // save_paper / get_papers will be handled by the exams table endpoints later.

        return NextResponse.json({ success: true })

    } catch (e: any) {
        console.error("Questions API Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
