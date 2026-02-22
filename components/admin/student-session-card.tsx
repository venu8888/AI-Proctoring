"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { StudentSession, BehaviorFlag } from "@/types"
import { AlertTriangle, Camera, Eye, Monitor, MoreVertical, User, Video, Smartphone } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface StudentSessionCardProps {
  session: StudentSession
  onViewDetails: (session: StudentSession) => void
  onTerminate: (sessionId: string) => void
  onWarn?: (sessionId: string, message: string) => void
  onWatchLive?: (session: StudentSession) => void
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

function getStatusColor(status: StudentSession["status"]) {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    case "paused":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    case "pending": // Handle pending
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    case "completed":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "terminated":
      return "bg-red-500/20 text-red-400 border-red-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function StudentSessionCard({ session, onViewDetails, onTerminate, onWatchLive, onWarn }: StudentSessionCardProps) {
  const criticalFlags = (session.behaviorFlags || []).filter((f) => f.severity === "critical" || f.severity === "high")
  const progress = session.totalQuestions > 0 ? (session.answeredCount / session.totalQuestions) * 100 : 0
  const timeRemaining = session.timeRemaining ?? 0


  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">{session.studentName}</CardTitle>
              <p className="text-xs text-muted-foreground">{session.studentId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(session.status)}>
              {session.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {session.status === "active" && onWatchLive && (
                  <DropdownMenuItem onClick={() => onWatchLive(session)}>
                    <Video className="mr-2 h-4 w-4" />
                    Watch Live
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onViewDetails(session)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onTerminate(session.sessionId)}
                  className="text-red-400 focus:text-red-400"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Terminate Session
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const msg = prompt("Enter warning message for student:");
                    if (msg) onWarn?.(session.sessionId, msg);
                  }}
                  className="text-orange-400 focus:text-orange-400"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Warn Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Camera className={`h-4 w-4 ${session.webcamActive ? "text-green-400" : "text-red-400"}`} />
            <span className="text-muted-foreground">Webcam</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Monitor className={`h-4 w-4 ${session.screenShareActive ? "text-green-400" : "text-red-400"}`} />
            <span className="text-muted-foreground">Screen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className={`h-4 w-4 ${session.mobileConnected ? "text-green-400" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground">Mobile</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span>
              {session.answeredCount}/{session.totalQuestions} questions
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time Remaining</span>
            <span>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {criticalFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              {criticalFlags.length} Alert{criticalFlags.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {criticalFlags.slice(0, 3).map((flag, i) => (
                <Badge key={i} variant="outline" className={getSeverityColor(flag.severity)}>
                  {flag.type.replace(/_/g, " ")}
                </Badge>
              ))}
              {criticalFlags.length > 3 && (
                <Badge variant="outline" className="bg-muted">
                  +{criticalFlags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {session.status === "active" && onWatchLive && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-transparent"
            onClick={() => onWatchLive(session)}
          >
            <Video className="h-4 w-4" />
            Watch Live Feed
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
