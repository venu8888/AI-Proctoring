import { useEffect, useState, useRef } from "react"
import { useExam } from "@/contexts/exam-context"
import { useFaceTracking } from "@/hooks/use-face-tracking"
import { useObjectDetection, type ObjectDetection } from "@/hooks/use-object-detection"
import { useAudioTracking } from "@/hooks/use-audio-tracking"
import { useRecording } from "@/contexts/recording-context"
import { ExamHeader } from "./exam-header"
import { QuestionCard } from "./question-card"
import { QuestionNavigator } from "./question-navigator"
import { WebcamPreview } from "./webcam-preview"
import { SubmitDialog } from "./submit-dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AdminWarningToast } from "./admin-warning-toast"

/**
 * Exam Interface Component
 * Main exam taking interface with question display, navigation, and controls
 */

interface ExamInterfaceProps {
  onExamComplete: () => void
}

export function ExamInterface({ onExamComplete }: ExamInterfaceProps) {
  const { examState, navigateToQuestion, adminMessage, clearAdminMessage, addBehaviorFlag } = useExam()
  const { recordingState } = useRecording()

  // Create an invisible video element to pipeline the stream into the canvas
  const hiddenVideoRef = useRef<HTMLVideoElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)

  const [faceAbsenceTimer, setFaceAbsenceTimer] = useState<number | null>(null)

  const { startTracking, stopTracking } = useFaceTracking({
    videoElement: hiddenVideoRef.current,
    canvasElement: hiddenCanvasRef.current,
    enabled: !!recordingState.webcamStream,
    onFaceDetected: (detection) => {
      if (!detection.isPresent) {
        // Start a timer if face is not present and timer isn't already running
        if (!faceAbsenceTimer) {
          const timer = window.setTimeout(() => {
            addBehaviorFlag({
              type: "face_absent",
              severity: "high",
              description: "No face detected in webcam feed for over 5 seconds."
            })
          }, 5000)
          setFaceAbsenceTimer(timer)
        }
      } else {
        // Face is present, clear the absence timer
        if (faceAbsenceTimer) {
          clearTimeout(faceAbsenceTimer)
          setFaceAbsenceTimer(null)
        }
      }
    }
  })

  // Object Detection Tracking (Cell Phones / Books)
  const [objectDetectionTimer, setObjectDetectionTimer] = useState<number | null>(null)

  const { startTracking: startObjectTracking, stopTracking: stopObjectTracking } = useObjectDetection({
    videoElement: hiddenVideoRef.current,
    canvasElement: hiddenCanvasRef.current,
    enabled: !!recordingState.webcamStream,
    onObjectDetected: (detection: ObjectDetection) => {
      if (detection.isPresent) {
        if (!objectDetectionTimer) {
          addBehaviorFlag({
            type: "suspicious_pattern",
            severity: "critical",
            description: `Unauthorized object detected: ${detection.label} (${Math.round(detection.confidence * 100)}% confidence)`
          });
          // Silence for 15 seconds to avoid spam
          const timer = window.setTimeout(() => {
            setObjectDetectionTimer(null)
          }, 15000);
          setObjectDetectionTimer(timer);
        }
      }
    }
  })

  // Audio Tracking
  const [audioTimer, setAudioTimer] = useState<number | null>(null)
  const { isTracking: isAudioTracking } = useAudioTracking({
    stream: recordingState.webcamStream,
    enabled: !!recordingState.webcamStream,
    onAudioDetected: (detection) => {
      if (detection.isSpeaking) {
        if (!audioTimer) {
          addBehaviorFlag({
            type: "suspicious_pattern",
            severity: "medium",
            description: `Loud background noise/speech detected. Volume level: ${Math.round(detection.volume)}`
          })
          // Prevent spamming flags by silencing detection for 10 seconds
          const timer = window.setTimeout(() => {
            setAudioTimer(null)
          }, 10000)
          setAudioTimer(timer)
        }
      }
    }
  })

  useEffect(() => {
    if (recordingState.webcamStream && hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = recordingState.webcamStream
      startTracking()
      startObjectTracking()
    }

    return () => {
      stopTracking()
      stopObjectTracking()
    }
  }, [recordingState.webcamStream, startTracking, stopTracking, startObjectTracking, stopObjectTracking])

  if (!examState) return null

  const { questions, answers, currentQuestionIndex } = examState
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestionIndex]

  // Browser Monitoring (Tab Switching & Focus Loss)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addBehaviorFlag({
          type: "suspicious_pattern",
          severity: "high",
          description: "Student switched to a different tab or minimized the browser.",
        })
      }
    }

    const handleBlur = () => {
      addBehaviorFlag({
        type: "suspicious_pattern",
        severity: "medium",
        description: "Exam window lost focus. Possible use of another application.",
      })
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)

    // Lockdown Features: Prevent Copy/Paste and Context Menu
    const preventDefault = (e: Event) => {
      e.preventDefault()
      addBehaviorFlag({
        type: "suspicious_pattern",
        severity: "medium",
        description: "Student attempted to use clipboard or context menu."
      })
    }

    document.addEventListener("contextmenu", preventDefault)
    document.addEventListener("copy", preventDefault)
    document.addEventListener("paste", preventDefault)

    // Ensure Fullscreen
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
        }
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err)
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addBehaviorFlag({
          type: "suspicious_pattern",
          severity: "high",
          description: "Student exited fullscreen mode."
        })
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    // Attempt to enter fullscreen immediately
    enterFullscreen()

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("contextmenu", preventDefault)
      document.removeEventListener("copy", preventDefault)
      document.removeEventListener("paste", preventDefault)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [addBehaviorFlag])

  const canGoBack = currentQuestionIndex > 0
  const canGoForward = currentQuestionIndex < questions.length - 1

  return (
    <div className="min-h-screen bg-background select-none">
      <ExamHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Question Card */}
            <QuestionCard question={currentQuestion} answer={currentAnswer} questionNumber={currentQuestionIndex + 1} />

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                disabled={!canGoBack}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>

              {canGoForward ? (
                <Button onClick={() => navigateToQuestion(currentQuestionIndex + 1)} className="gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <SubmitDialog onSubmitComplete={onExamComplete} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Webcam Preview */}
            <div className="sticky top-24">
              <WebcamPreview size="lg" className="w-full aspect-video" />
              <p className="mt-2 text-center text-xs text-muted-foreground">Live webcam preview</p>
            </div>

            {/* Question Navigator */}
            <QuestionNavigator />
          </div>
        </div>
      </main>

      <AdminWarningToast
        message={adminMessage || null}
        onClose={clearAdminMessage || (() => { })}
      />

      {/* Hidden elements for face tracking */}
      <video ref={hiddenVideoRef} className="hidden" muted playsInline />
      <canvas ref={hiddenCanvasRef} className="hidden" />
    </div>
  )
}
