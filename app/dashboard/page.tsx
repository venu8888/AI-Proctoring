"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, CalendarClock, Clock, Play, LogOut, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

export default function StudentDashboard() {
    const router = useRouter()
    const { user, isAuthenticated, isLoading: authLoading, logout, student } = useAuth()
    const [exams, setExams] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace("/")
        } else if (user) {
            fetchAssignedExams()
        }
    }, [isAuthenticated, authLoading, user, router])

    const fetchAssignedExams = async () => {
        setIsLoading(true)
        try {
            // 1. Get the student's groups
            const { data: groups } = await supabase
                .from('group_students')
                .select('group_id')
                .eq('student_id', user?.id)

            if (!groups || groups.length === 0) {
                setExams([])
                setIsLoading(false)
                return
            }

            const groupIds = groups.map(g => g.group_id)

            // 2. Get exams assigned to those groups
            const { data: examGroups } = await supabase
                .from('exam_groups')
                .select(`
          exam_id,
          exams (
            id,
            title,
            description,
            start_time,
            end_time,
            duration_minutes,
            pass_marks,
            blueprint
          )
        `)
                .in('group_id', groupIds)

            if (examGroups) {
                // Flatten and deduplicate
                const uniqueExams = new Map()
                examGroups.forEach(eg => {
                    if (eg.exams) uniqueExams.set((eg.exams as any).id, eg.exams)
                })
                setExams(Array.from(uniqueExams.values()).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()))
            }

        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = () => {
        logout()
        router.replace("/")
    }

    const handleStartSetup = (examId: string) => {
        // In a real flow, we'd pass the examId in the URL parameters so the setup page knows which exam to load
        router.push(`/exam/setup?examId=${examId}`)
    }

    if (authLoading || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

            <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Student Dashboard</h1>
                            <p className="text-xs text-muted-foreground">My Assigned Examinations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium">{student?.name || user?.email}</p>
                            <p className="text-xs text-muted-foreground">{student?.studentId || 'Student'}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <h2 className="text-2xl font-bold tracking-tight mb-6">Upcoming & Pending Exams</h2>

                {exams.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
                        <CalendarClock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <CardTitle className="mb-2">No Exams Assigned</CardTitle>
                        <CardDescription>You currently do not have any pending examinations assigned to your cohorts.</CardDescription>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => {
                            const now = new Date()
                            const start = new Date(exam.start_time)
                            const end = new Date(exam.end_time)
                            const isFuture = now < start
                            const isExpired = now > end
                            const isActive = !isFuture && !isExpired

                            return (
                                <Card key={exam.id} className={`flex flex-col ${isActive ? 'border-primary shadow-lg shadow-primary/5' : 'opacity-80'}`}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={isActive ? "default" : isFuture ? "secondary" : "destructive"}>
                                                {isActive ? "Active Now" : isFuture ? "Upcoming" : "Expired"}
                                            </Badge>
                                            <div className="flex items-center text-xs text-muted-foreground font-medium">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {exam.duration_minutes}m
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg leading-tight">{exam.title}</CardTitle>
                                        <CardDescription className="line-clamp-2 mt-2 text-xs">{exam.description || "No description provided."}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Opens</span>
                                                <span className="font-medium">{format(start, "MMM d, h:mm a")}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-muted-foreground">Closes</span>
                                                <span className="font-medium">{format(end, "MMM d, h:mm a")}</span>
                                            </div>
                                            <div className="flex justify-between pb-1">
                                                <span className="text-muted-foreground">Pass Mark</span>
                                                <span className="font-medium">{exam.pass_marks} points</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t bg-muted/10">
                                        <Button
                                            className="w-full gap-2"
                                            disabled={!isActive}
                                            onClick={() => handleStartSetup(exam.id)}
                                        >
                                            <Play className="h-4 w-4" />
                                            {isActive ? "Enter Exam Setup" : isFuture ? "Not Yet Available" : "Window Closed"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
