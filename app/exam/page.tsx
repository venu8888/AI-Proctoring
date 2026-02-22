"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useExam } from "@/contexts/exam-context"
import { ExamInterface } from "@/components/exam/exam-interface"
import { ResultsPage } from "@/components/exam/results-page"
import { Loader2 } from "lucide-react"
import { LiveStreamBroadcaster } from "@/components/exam/live-stream-broadcaster"

/**
 * Exam Page
 * Main exam taking page - requires authentication and setup completion
 */

export default function ExamPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, logout, user } = useAuth()
  const { examState, isExamActive } = useExam()
  const [showResults, setShowResults] = useState(false)

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/")
      } else if (user && user.role !== 'student') {
        router.replace("/admin")
      }
    }
  }, [isAuthenticated, authLoading, user, router])

  // Redirect to setup if exam not initialized
  useEffect(() => {
    if (!authLoading && isAuthenticated && !examState) {
      router.replace("/exam/setup")
    }
  }, [isAuthenticated, authLoading, examState, router])

  // Show results when exam is submitted
  useEffect(() => {
    if (examState?.isSubmitted) {
      setShowResults(true)
    }
  }, [examState?.isSubmitted])

  const handleLogout = () => {
    logout()
    router.replace("/")
  }

  const handleExamComplete = () => {
    setShowResults(true)
  }

  if (authLoading || !isAuthenticated || !examState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (showResults) {
    return <ResultsPage onLogout={handleLogout} />
  }

  return (
    <>
      <LiveStreamBroadcaster />
      <ExamInterface onExamComplete={handleExamComplete} />
    </>
  )
}
