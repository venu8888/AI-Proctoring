"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { StudentSession, BehaviorFlag } from "@/types"
import { AlertTriangle, Camera, Clock, Monitor, User } from "lucide-react"

interface SessionDetailModalProps {
  session: StudentSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTerminate: (sessionId: string) => void
}

function getSeverityColor(severity: BehaviorFlag["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "low":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function SessionDetailModal({ session, open, onOpenChange, onTerminate }: SessionDetailModalProps) {
  if (!session) return null

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>{session.studentName}</span>
              <p className="text-sm font-normal text-muted-foreground">{session.studentId}</p>
            </div>
          </DialogTitle>
          <DialogDescription>Live session monitoring and behavior analysis</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flags">Flags ({session.behaviorFlags.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h4 className="font-medium">Recording Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Camera className="h-4 w-4" /> Webcam
                    </span>
                    <Badge variant={session.webcamActive ? "default" : "destructive"}>
                      {session.webcamActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Monitor className="h-4 w-4" /> Screen Share
                    </span>
                    <Badge variant={session.screenShareActive ? "default" : "destructive"}>
                      {session.screenShareActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Camera className="h-4 w-4" /> Mobile Camera
                    </span>
                    <Badge variant={session.mobileConnected ? "default" : "secondary"}>
                      {session.mobileConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <h4 className="font-medium">Exam Progress</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Questions Answered</span>
                    <span>
                      {session.answeredCount} / {session.totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Current Question</span>
                    <span>#{session.currentQuestion + 1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor(session.timeRemaining / 60)}:
                      {(session.timeRemaining % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {session.status === "active" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onTerminate(session.sessionId)
                    onOpenChange(false)
                  }}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Terminate Session
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="flags" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {session.behaviorFlags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-green-500/10 p-3 mb-3">
                    <AlertTriangle className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-muted-foreground">No behavior flags detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {session.behaviorFlags.map((flag, index) => (
                    <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className={getSeverityColor(flag.severity)}>
                          {flag.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatTime(new Date(flag.timestamp).getTime())}</span>
                      </div>
                      <p className="font-medium text-sm">{flag.type.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {(session.activityLog || []).map((log, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
