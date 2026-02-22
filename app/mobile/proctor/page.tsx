"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useMobileRecording } from "@/hooks/use-mobile-recording"
import { MobileCameraPreview } from "@/components/mobile/camera-preview"
import { PlacementGuide } from "@/components/mobile/placement-guide"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CheckCircle, Loader2, AlertTriangle, RefreshCw, Shield, Wifi, WifiOff } from "lucide-react"

const PAIRING_STORAGE_KEY = "proctor_pairing_state"

function MobileProctorContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")

  const { stream, isRecording, hasPermission, error, requestPermission, startRecording, stopRecording } =
    useMobileRecording()

  const [step, setStep] = useState<"permission" | "position" | "active" | "complete">("permission")
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [examActive, setExamActive] = useState(false)

  const [deviceId, setDeviceId] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setDeviceId(`mobile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  }, [])



  useEffect(() => {
    if (!sessionId || step !== "active") return
    setIsConnected(true)
  }, [sessionId, step, deviceId])

  const handleRequestPermission = async () => {
    const success = await requestPermission()
    if (success) {
      setStep("position")
    }
  }

  const handleConfirmPlacement = useCallback(async () => {
    if (!sessionId) return

    setIsConfirming(true)

    try {
      // Removed legacy socket confirmation

      // Backend API call for persistence (optional if server.js handles it, but good for redundancy)
      await fetch('/api/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'confirm_camera'
        })
      })

    } catch (e) {
      console.error("Failed to pair", e)
    }

    startRecording(sessionId!)
    setExamActive(true)
    setStep("active")
    setIsConfirming(false)
  }, [sessionId, deviceId, startRecording])

  const handleExamEnd = async () => {
    if (isRecording) {
      await stopRecording()
    }
    setExamActive(false)
    setStep("complete")
  }

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (step === "permission") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Camera Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Grant camera access to enable side-proctoring during the exam.
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleRequestPermission} className="w-full" size="lg">
              Grant Camera Access
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Your camera will record your side profile during the exam
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "position") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex-1 relative">
          <MobileCameraPreview stream={stream} isRecording={false} />
        </div>

        <div className="p-4 space-y-4 bg-card/95 backdrop-blur-sm border-t border-border/50">
          <PlacementGuide />

          <Button onClick={handleConfirmPlacement} disabled={isConfirming} className="w-full" size="lg">
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Confirm Placement
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (step === "active") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/50 bg-card/95 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-medium">Proctoring Active</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi className="h-4 w-4" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400 text-sm">
                <WifiOff className="h-4 w-4" />
                <span>Reconnecting...</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 relative">
          <MobileCameraPreview stream={stream} isRecording={isRecording} />
        </div>

        <div className="p-4 bg-card/95 backdrop-blur-sm border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 text-destructive">
                  <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium">Recording</span>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">Session: {sessionId?.slice(-8)}</div>
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Keep this screen active and your phone stationary throughout the exam. Do not close this page.
            </AlertDescription>
          </Alert>

          <Button variant="outline" onClick={handleExamEnd} className="w-full mt-4 bg-transparent">
            End Proctoring Session
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle>Proctoring Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            The exam session has ended. Your proctoring recording has been saved and uploaded to the server.
          </p>

          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              You can now close this page. Thank you for completing the proctored exam.
            </p>
          </div>

          <Button variant="outline" onClick={() => window.location.reload()} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Start New Session
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MobileProctorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MobileProctorContent />
    </Suspense>
  )
}
