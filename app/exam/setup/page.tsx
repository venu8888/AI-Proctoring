"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useExam } from "@/contexts/exam-context"
import { useRecording } from "@/contexts/recording-context"
import { usePairing } from "@/contexts/pairing-context"
import { PermissionCard } from "@/components/setup/permission-card"
import { CameraTest } from "@/components/setup/camera-test"
import { SetupChecklist } from "@/components/setup/setup-checklist"
import { ExamInstructions } from "@/components/setup/exam-instructions"
import { QRPairingSection } from "@/components/pairing/qr-pairing-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { sampleQuestions, EXAM_CONFIG } from "@/data/questions"
import { getQuestions } from "@/services/question-service"
import { Shield, Camera, Monitor, Loader2, Play, LogOut, Info } from "lucide-react"

/**
 * Exam Setup Page
 * Handles all pre-exam requirements:
 * - Camera permission
 * - Screen sharing permission
 * - Mobile device pairing
 *
 * Exam cannot start until all requirements are met
 */

export default function ExamSetupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, student, logout } = useAuth()
  const { initializeExam, examState } = useExam()
  const {
    hasWebcamPermission,
    hasScreenPermission,
    screenError,
    requestWebcamPermission,
    requestScreenPermission,
    startRecording,
  } = useRecording()
  const { isPaired, bypassMobile } = usePairing()

  const [webcamLoading, setWebcamLoading] = useState(false)
  const [screenLoading, setScreenLoading] = useState(false)
  const [webcamError, setWebcamError] = useState("")
  const [localScreenError, setLocalScreenError] = useState("")
  const [isStarting, setIsStarting] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/")
    }
  }, [isAuthenticated, authLoading, router])

  // Redirect to exam if already started
  useEffect(() => {
    if (examState && !examState.isSubmitted) {
      router.replace("/exam")
    }
  }, [examState, router])

  const handleRequestWebcam = async () => {
    setWebcamLoading(true)
    setWebcamError("")
    const success = await requestWebcamPermission()
    if (!success) {
      setWebcamError("Failed to access camera. Please check your browser permissions.")
    }
    setWebcamLoading(false)
  }

  const handleRequestScreen = async () => {
    setScreenLoading(true)
    setLocalScreenError("")
    const success = await requestScreenPermission()
    if (!success && !screenError) {
      setLocalScreenError("Failed to access screen. Please select a screen or window to share.")
    }
    setScreenLoading(false)
  }

  const canStartExam = hasWebcamPermission && hasScreenPermission && isPaired

  const handleStartExam = async () => {
    if (!canStartExam) return

    setIsStarting(true)

    // Start recording
    await startRecording()

    // We pull the examId from query parameters
    const urlParams = new URLSearchParams(window.location.search)
    const examId = urlParams.get('examId')

    if (!examId) {
      console.error("Exam ID is missing from URL parameters.")
      return;
    }

    // Initialize exam with examId
    await initializeExam(examId)

    // Navigate to exam
    router.push("/exam")
  }

  const handleLogout = () => {
    logout()
    router.replace("/")
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const displayScreenError = screenError || localScreenError

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Exam Setup</h1>
              <p className="text-xs text-muted-foreground">Complete all steps to begin</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{student?.name}</p>
              <p className="text-xs text-muted-foreground">{student?.studentId}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Permission Cards */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">1. Grant Permissions</h2>

              <PermissionCard
                icon={<Camera className="h-6 w-6" />}
                title="Camera Access"
                description="Required for face recording during the exam. Your webcam will capture your face throughout the examination."
                isGranted={hasWebcamPermission}
                isLoading={webcamLoading}
                onRequest={handleRequestWebcam}
                errorMessage={webcamError}
              />

              <PermissionCard
                icon={<Monitor className="h-6 w-6" />}
                title="Screen Sharing"
                description="Required for screen recording. Your entire screen will be captured and merged with the webcam feed."
                isGranted={hasScreenPermission}
                isLoading={screenLoading}
                onRequest={handleRequestScreen}
                errorMessage={displayScreenError}
              />

              {hasScreenPermission && screenError && (
                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-200">
                    {screenError} Only webcam recording will be active in preview mode.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* QR Pairing Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">2. Pair Mobile Device</h2>
              <QRPairingSection />

              {process.env.NODE_ENV !== 'production' && (
                <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm font-medium text-yellow-500 mb-2">Development Mode</p>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20"
                    onClick={() => {
                      bypassMobile()
                    }}
                  >
                    [DEV] Bypass Mobile Pairing
                  </Button>
                </div>
              )}
            </div>

            {/* Camera Preview */}
            {hasWebcamPermission && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">3. Verify Camera</h2>
                <CameraTest />
              </div>
            )}

            {/* Start Exam Button */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Ready to Start</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Once you start the exam, the timer will begin and all recording will be active. Make sure you are
                  ready before proceeding.
                </p>

                <Button
                  onClick={handleStartExam}
                  disabled={!canStartExam || isStarting}
                  size="lg"
                  className="w-full gap-2"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Starting Exam...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Start Exam
                    </>
                  )}
                </Button>

                {!canStartExam && (
                  <p className="text-center text-xs text-warning">
                    Complete all setup requirements to enable the start button
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SetupChecklist />
            <ExamInstructions />
          </div>
        </div>
      </main>
    </div>
  )
}
