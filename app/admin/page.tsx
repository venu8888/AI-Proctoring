"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminStats } from "@/components/admin/admin-stats"
import { LiveMonitorGrid } from "@/components/admin/live-monitor-grid"
import { SessionDetailModal } from "@/components/admin/session-detail-modal"
import { QuestionEditor } from "@/components/admin/question-editor"
import { StudentManager } from "@/components/admin/student-manager"
import { UserProvisioning } from "@/components/admin/user-provisioning"
import { GroupManagement } from "@/components/admin/group-management"
import { ExamBlueprintEditor } from "@/components/admin/exam-blueprint-editor"
import { LiveVideoViewer } from "@/components/admin/live-video-viewer"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActiveSessions, toStudentSession } from "@/services/session-registry"
import type { StudentSession } from "@/types"
import { LayoutDashboard, FileQuestion, Activity, Users, UserPlus, Component, FileEdit } from "lucide-react"

export default function AdminDashboard() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<StudentSession[]>([])
  const [selectedSession, setSelectedSession] = useState<StudentSession | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [watchingSession, setWatchingSession] = useState<StudentSession | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin/login")
      return
    }
    if (user?.role !== "admin") {
      router.push("/exam/setup")
    }
  }, [isAuthenticated, user, router])

  // Removed Socket.io real-time monitoring. Will be replaced by Supabase Realtime in Phase 3.

  const handleViewDetails = (session: StudentSession) => {
    setSelectedSession(session)
    setDetailModalOpen(true)
  }

  const handleWatchLive = useCallback((session: StudentSession) => {
    setWatchingSession(session)
  }, [])

  const handleTerminate = (sessionId: string) => {
    // Optimistic update
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, status: 'terminated' } : s))
  }

  const handleWarn = async (sessionId: string, message: string) => {
    console.log("Warn student", sessionId, message)
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container py-6 space-y-6">
        {watchingSession && (
          <LiveVideoViewer
            session={watchingSession}
            onClose={() => setWatchingSession(null)}
            onWarn={handleWarn}
          />
        )}

        <Tabs defaultValue="monitor" className="space-y-6">
          <TabsList>
            <TabsTrigger value="monitor" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <Users className="h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Component className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <FileEdit className="h-4 w-4" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Users
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <FileQuestion className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Activity className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-6">
            <AdminStats sessions={sessions} />
            <LiveMonitorGrid
              sessions={sessions}
              onViewDetails={handleViewDetails}
              onTerminate={handleTerminate}
              onWatchLive={handleWatchLive}
              onWarn={handleWarn}
            />
          </TabsContent>

          <TabsContent value="students">
            <StudentManager />
          </TabsContent>

          <TabsContent value="users">
            <div className="flex justify-center pt-8">
              <UserProvisioning />
            </div>
          </TabsContent>

          <TabsContent value="groups">
            <GroupManagement />
          </TabsContent>

          <TabsContent value="exams">
            <ExamBlueprintEditor />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionEditor />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </main>

      <SessionDetailModal
        session={selectedSession}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onTerminate={handleTerminate}
      />
    </div>
  )
}
