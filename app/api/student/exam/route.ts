import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
    try {
        const { action, examId, studentId, sessionId, answers, behaviorFlags } = await req.json()

        // 1. Fetch Exam Details and Blueprint
        if (action === 'start') {
            if (!sessionId) throw new Error("Missing sessionId")
            const { data: exam, error: examError } = await supabaseAdmin
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single()

            if (examError || !exam) throw new Error("Exam not found or inactive.")

            // 2. Process Blueprint to get dynamic questions
            let finalQuestions: any[] = []

            // Helper to shuffle array
            const shuffleArray = (array: any[]) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            };

            // Ensure blueprint exists
            if (exam.blueprint && Array.isArray(exam.blueprint)) {
                for (const rule of exam.blueprint) {
                    // Fetch random questions matching topic + easy
                    if (rule.easy > 0) {
                        const { data: easyQs } = await supabaseAdmin
                            .from('questions')
                            .select('id, text, options, difficulty, correct_answer, topic')
                            .eq('topic', rule.topic)
                            .eq('difficulty', 'easy')
                            .limit(rule.easy * 3) // Fetch a larger pool

                        if (easyQs && easyQs.length > 0) {
                            const randomized = shuffleArray(easyQs).slice(0, rule.easy);
                            finalQuestions.push(...randomized.map(q => ({ ...q, marks: rule.marks_per_difficulty?.easy || 1 })))
                        }
                    }

                    if (rule.medium > 0) {
                        const { data: medQs } = await supabaseAdmin
                            .from('questions')
                            .select('id, text, options, difficulty, correct_answer, topic')
                            .eq('topic', rule.topic)
                            .eq('difficulty', 'medium')
                            .limit(rule.medium * 3)

                        if (medQs && medQs.length > 0) {
                            const randomized = shuffleArray(medQs).slice(0, rule.medium);
                            finalQuestions.push(...randomized.map(q => ({ ...q, marks: rule.marks_per_difficulty?.medium || 2 })))
                        }
                    }

                    if (rule.hard > 0) {
                        const { data: hardQs } = await supabaseAdmin
                            .from('questions')
                            .select('id, text, options, difficulty, correct_answer, topic')
                            .eq('topic', rule.topic)
                            .eq('difficulty', 'hard')
                            .limit(rule.hard * 3)

                        if (hardQs && hardQs.length > 0) {
                            const randomized = shuffleArray(hardQs).slice(0, rule.hard);
                            finalQuestions.push(...randomized.map(q => ({ ...q, marks: rule.marks_per_difficulty?.hard || 5 })))
                        }
                    }
                }
            }


            // 3. Format Questions for the Client (Hide correct answers in a production system, but for now we keep it to match the existing type schema)
            const formattedQuestions = finalQuestions.map((q, index) => ({
                questionId: q.id,
                question: q.text,
                options: q.options,
                correctAnswer: q.correct_answer,
                difficulty: q.difficulty,
                minimumExpectedTime: q.difficulty === 'hard' ? 45 : q.difficulty === 'medium' ? 30 : 15, // Dynamic time based on difficulty
            }))

            // 4. Create Active Session in Database
            const { error: sessionError } = await supabaseAdmin
                .from('sessions')
                .upsert({
                    session_id: sessionId,
                    exam_id: examId,
                    student_id: studentId,
                    status: 'in_progress',
                    start_time: new Date().toISOString()
                })
            // we assume student_id + exam_id is a unique constraint

            return NextResponse.json({
                success: true,
                examDetails: {
                    id: exam.id,
                    title: exam.title,
                    durationMinutes: exam.duration_minutes,
                    passMarks: exam.pass_marks
                },
                questions: formattedQuestions
            })
        }

        // Auto-Save Answer implementation
        if (action === 'autosave') {
            const { error } = await supabaseAdmin
                .from('sessions')
                .update({ answers: answers })
                .match({ exam_id: examId, student_id: studentId })

            if (error) throw error
            return NextResponse.json({ success: true })
        }

        if (action === 'submit') {
            // 1. Fetch Exam Details
            const { data: exam, error: examError } = await supabaseAdmin
                .from('exams')
                .select('duration_minutes, pass_marks')
                .eq('id', examId)
                .single()

            if (examError || !exam) throw new Error("Could not fetch exam details for grading.")

            // 2. Fetch Questions to Check Answers
            // We need to fetch the exact questions the student was given
            // For now, we will query all questions and match them with the answered keys
            const questionIds = Object.keys(answers || {})
            let totalScore = 0;
            let totalPossibleMarks = 0;

            if (questionIds.length > 0) {
                const { data: questionsData, error: qError } = await supabaseAdmin
                    .from('questions')
                    .select('id, correct_answer')
                    .in('id', questionIds)

                if (!qError && questionsData) {
                    // Grade the answers (Assuming all questions are 1 mark for simplicity in standard tests if not defined in blueprint, 
                    // but ideally we'd store the specific marks per student-question)
                    for (const question of questionsData) {
                        totalPossibleMarks += 1; // Increment possible marks
                        const studentAnswer = answers[question.id]

                        if (studentAnswer && studentAnswer === question.correct_answer) {
                            totalScore += 1;
                        }
                    }
                }
            }

            // Determine Pass/Fail Status
            const isPassing = totalScore >= (exam.pass_marks || 0)

            // 3. Calculate Credibility Score
            const finalFlags = behaviorFlags || []
            let credibilityIndex = 100;

            // Deduct credibility based on severity
            finalFlags.forEach((flag: any) => {
                if (flag.severity === 'critical') credibilityIndex -= 25;
                else if (flag.severity === 'high') credibilityIndex -= 15;
                else if (flag.severity === 'medium') credibilityIndex -= 5;
                else credibilityIndex -= 1;
            })

            // Floor the score at 0
            credibilityIndex = Math.max(0, credibilityIndex)

            // 4. Update Session Final Results
            const { error: submitError } = await supabaseAdmin
                .from('sessions')
                .update({
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    answers: answers,
                    score: totalScore,
                    trust_score: credibilityIndex,
                    behavior_flags: finalFlags
                })
                .match({ exam_id: examId, student_id: studentId })

            if (submitError) throw submitError

            return NextResponse.json({
                success: true,
                grading: {
                    score: totalScore,
                    passing: isPassing,
                    credibilityIndex
                }
            })
        }

    } catch (error: any) {
        console.error("Exam API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
