"use client"

import { useRef, useState, useCallback } from "react"

/**
 * Mobile Recording Hook
 * Handles mobile camera recording for side-proctoring
 * Records and saves video locally on the mobile device
 */

interface UseMobileRecordingReturn {
  stream: MediaStream | null
  isRecording: boolean
  hasPermission: boolean
  error: string | null
  requestPermission: () => Promise<boolean>
  startRecording: (sessionId: string) => void
  stopRecording: () => Promise<void>
}

export function useMobileRecording(): UseMobileRecordingReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this device/browser")
      }

      // Request camera with constraints optimized for mobile
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera by default for side view
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      })

      setStream(mediaStream)
      setHasPermission(true)
      return true
    } catch (err) {
      console.error("Failed to get camera permission:", err)

      // Try front camera if back camera fails
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        })

        setStream(mediaStream)
        setHasPermission(true)
        return true
      } catch (frontErr) {
        setError("Failed to access camera. Please check your browser permissions.")
        setHasPermission(false)
        return false
      }
    }
  }, [])

  const startRecording = useCallback((sessionId: string) => {
    if (!stream) {
      setError("No camera stream available")
      return
    }

    try {
      chunksRef.current = [] // Only for fallback if needed, but we rely on streaming

      let mimeType = "video/webm;codecs=vp9"
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm"
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ""
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined
      const recorder = new MediaRecorder(stream, options)

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // chunksRef.current.push(event.data) // Disabled to save memory

          // Stream to backend
          try {
            await fetch(`/api/recording/chunk`, {
              method: 'POST',
              headers: {
                'x-session-id': sessionId,
                'x-recording-type': 'mobile'
              },
              body: event.data
            });
          } catch (e) {
            console.error("Failed to upload chunk", e);
            // Optionally retry or buffer? 
            // For now, log error.
          }
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // Capture in 1-second chunks
      setIsRecording(true)
    } catch (err) {
      console.error("Failed to start recording:", err)
      setError("Failed to start recording")
    }
  }, [stream])

  const stopRecording = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current

      if (!recorder || recorder.state === "inactive") {
        resolve()
        return
      }

      recorder.onstop = () => {
        setIsRecording(false)
        resolve()
      }

      recorder.stop()
    })
  }, [])

  return {
    stream,
    isRecording,
    hasPermission,
    error,
    requestPermission,
    startRecording,
    stopRecording,
  }
}
