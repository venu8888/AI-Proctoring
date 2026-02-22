"use client"

import { useAuth } from "@/contexts/auth-context"
import { useExam } from "@/contexts/exam-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Clock, AlertTriangle, LogOut, Trophy, Target, Timer, Flag } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Results Page Component
 * Displays exam results, score, and behavior flags after submission
 */

interface ResultsPageProps {
  onLogout: () => void
}

export function ResultsPage({ onLogout }: ResultsPageProps) {
  const { student, session } = useAuth()
  const { examState, examLog } = useExam()

  if (!examState || !examLog) return null

  const { questions, answers, finalResult } = examState
  const { totalCorrect, accuracy, behaviorFlags, examDuration } = examLog

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Use the verified final backend result if available, otherwise fallback to local calculation
  const passed = finalResult ? finalResult.passing : (accuracy >= 60)
  const displayScore = finalResult ? (finalResult.score / questions.length) * 100 : accuracy
  const displayCorrect = finalResult ? finalResult.score : totalCorrect
  const credibilityIndex = finalResult ? finalResult.credibilityIndex : 100

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full",
              passed ? "bg-success/20" : "bg-destructive/20",
            )}
          >
            {passed ? <Trophy className="h-10 w-10 text-success" /> : <Target className="h-10 w-10 text-destructive" />}
          </div>
          <h1 className="text-3xl font-bold">Exam Completed</h1>
          <p className="mt-2 text-muted-foreground">Thank you for completing the examination, {student?.name}</p>
        </div>

        {/* Score & Credibility Card */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card className="border-border/50 bg-card/80 flex flex-col justify-center">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <span className={cn("text-6xl font-bold", passed ? "text-success" : "text-destructive")}>
                  {displayScore.toFixed(1)}%
                </span>
                <p className="mt-2 text-muted-foreground">
                  {displayCorrect} out of {questions.length} correct
                </p>
              </div>

              <Progress value={displayScore} className="h-3" />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-muted/50 p-4">
                  <Timer className="mx-auto h-6 w-6 text-primary mb-2" />
                  <p className="text-2xl font-bold text-foreground">{formatDuration(examDuration)}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 flex flex-col justify-center">
                  <Badge variant={passed ? "default" : "destructive"} className="w-full justify-center py-2 text-lg">
                    {passed ? "PASSED" : "FAILED"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                AI Credibility Index
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="text-center mt-4">
                <span className={cn(
                  "text-6xl font-bold",
                  credibilityIndex >= 80 ? "text-success" : credibilityIndex >= 50 ? "text-warning" : "text-destructive"
                )}>
                  {credibilityIndex}/100
                </span>
              </div>

              <Progress
                value={credibilityIndex}
                className={cn("h-3", credibilityIndex >= 80 ? "[&>div]:bg-success" : credibilityIndex >= 50 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive")}
              />

              <p className="text-sm text-muted-foreground">
                Your credibility score is calculated by our AI engine based on audio, visual, and behavioral data recorded during the exam.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Behavior Flags */}
        {behaviorFlags.length > 0 && (
          <Card className="mb-6 border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Flag className="h-5 w-5" />
                Behavior Flags ({behaviorFlags.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {behaviorFlags.map((flag, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                    <AlertTriangle
                      className={cn(
                        "h-5 w-5 shrink-0 mt-0.5",
                        flag.severity === "high"
                          ? "text-destructive"
                          : flag.severity === "medium"
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium capitalize">{flag.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-auto shrink-0",
                        flag.severity === "high"
                          ? "border-destructive text-destructive"
                          : flag.severity === "medium"
                            ? "border-warning text-warning"
                            : "",
                      )}
                    >
                      {flag.severity}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Note: These flags are for administrative review. They do not automatically indicate cheating.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Question Review */}
        <Card className="mb-6 border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Question Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {questions.map((q, index) => {
                const answer = answers[index]
                const isCorrect = answer.selectedOption === q.correctAnswer
                const wasAnswered = answer.selectedOption !== null

                return (
                  <div key={q.questionId} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                      {wasAnswered ? (
                        isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">Skipped</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {q.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{answer.timeSpent}s</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onLogout} className="gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Session ID: {session?.sessionId}
          <br />
          Completed at: {examState.endTime?.toLocaleString()}
        </p>
      </div>
    </div>
  )
}
