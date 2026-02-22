"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Target, Activity, CheckCircle, AlertTriangle, ShieldAlert, Video } from "lucide-react"
import { VideoReviewModal } from "./video-review-modal"

export function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true)
    const [sessions, setSessions] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalCompleted: 0,
        averageScore: 0,
        averageCredibility: 0,
        totalViolations: 0,
    })

    const [reviewOpen, setReviewOpen] = useState(false)
    const [selectedReviewSession, setSelectedReviewSession] = useState<any>(null)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)

            // Fetch all completed sessions
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select(`
          session_id,
          score,
          trust_score,
          start_time,
          end_time,
          behavior_flags,
          profiles:student_id ( full_name ),
          exams:exam_id ( title, pass_marks, duration_minutes )
        `)
                .eq('status', 'completed')
                .order('end_time', { ascending: false })

            if (sessionError) throw sessionError

            if (sessionData) {
                setSessions(sessionData)

                // Calculate aggregate stats
                let totalScore = 0
                let totalCred = 0
                let violationsCount = 0

                sessionData.forEach(s => {
                    totalScore += s.score || 0
                    totalCred += s.trust_score || 0

                    if (Array.isArray(s.behavior_flags)) {
                        violationsCount += s.behavior_flags.length
                    }
                })

                setStats({
                    totalCompleted: sessionData.length,
                    averageScore: sessionData.length > 0 ? (totalScore / sessionData.length) : 0,
                    averageCredibility: sessionData.length > 0 ? (totalCred / sessionData.length) : 0,
                    totalViolations: violationsCount,
                })
            }
        } catch (err) {
            console.error("Failed to load analytics", err)
        } finally {
            setLoading(false)
        }
    }

    const handleReview = (session: any) => {
        setSelectedReviewSession(session)
        setReviewOpen(true)
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Analytics Data...</div>
    }

    return (
        <div className="space-y-6">
            {/* Top Level Aggregate Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Exams Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                        <p className="text-xs text-muted-foreground">Total finished sessions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Class Score</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">Across all subjects</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credibility Index</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${stats.averageCredibility >= 80 ? 'text-success' : stats.averageCredibility >= 50 ? 'text-warning' : 'text-destructive'}`}>
                                {stats.averageCredibility.toFixed(1)}
                            </div>
                            <Progress value={stats.averageCredibility} className="h-2 w-16" />
                        </div>
                        <p className="text-xs text-muted-foreground">Systemwide average</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalViolations}</div>
                        <p className="text-xs text-muted-foreground">AI Flags generated</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Session List */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Student Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">No completed exams found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Exam</TableHead>
                                    <TableHead>Raw Score</TableHead>
                                    <TableHead>Credibility</TableHead>
                                    <TableHead>Violations</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((s) => {
                                    const studentName = s.profiles?.full_name || "Unknown Student";
                                    const examTitle = s.exams?.title || "Unknown Exam";
                                    const violations = Array.isArray(s.behavior_flags) ? s.behavior_flags.length : 0;
                                    const passMark = s.exams?.pass_marks || 0;
                                    const passed = (s.score || 0) >= passMark;

                                    return (
                                        <TableRow key={s.session_id}>
                                            <TableCell className="font-medium">{studentName}</TableCell>
                                            <TableCell>{examTitle}</TableCell>
                                            <TableCell>
                                                <Badge variant={passed ? "default" : "destructive"}>
                                                    {s.score}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={s.trust_score >= 80 ? "outline" : s.trust_score >= 50 ? "secondary" : "destructive"}
                                                    className={s.trust_score >= 80 ? "border-success text-success" : ""}>
                                                    {s.trust_score}/100
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {violations > 0 ? (
                                                    <span className="flex items-center gap-1 text-destructive">
                                                        <AlertTriangle className="h-3 w-3" /> {violations}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" className="gap-2" onClick={() => handleReview(s)}>
                                                    <Video className="h-3 w-3" />
                                                    Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selectedReviewSession && (
                <VideoReviewModal
                    open={reviewOpen}
                    onOpenChange={setReviewOpen}
                    sessionId={selectedReviewSession.session_id}
                    studentName={selectedReviewSession.profiles?.full_name || "Unknown"}
                    examTitle={selectedReviewSession.exams?.title || "Unknown"}
                    startTime={selectedReviewSession.start_time}
                    behaviorFlags={selectedReviewSession.behavior_flags}
                />
            )}
        </div>
    )
}
