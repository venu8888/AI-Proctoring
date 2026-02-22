"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import type { RecordingState } from "@/types"

/**
 * Recording Context
 * Manages webcam, screen recording, and video merging functionality
 * Handles all media stream operations for proctoring
 */

import { useAuth } from "./auth-context"

interface RecordingContextType {
  recordingState: RecordingState
  isRecording: boolean
  hasWebcamPermission: boolean
  hasScreenPermission: boolean
  screenError: string | null
  requestWebcamPermission: () => Promise<boolean>
  requestScreenPermission: () => Promise<boolean>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  getWebcamStream: () => MediaStream | null
  getScreenStream: () => MediaStream | null
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined)

interface RecordingProviderProps {
  children: ReactNode
}

export function RecordingProvider({ children }: RecordingProviderProps) {
  const { session } = useAuth()
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    webcamStream: null,
    screenStream: null,
    mobileStream: null,
    recordedChunks: [],
    startTime: null,
  })

  const [hasWebcamPermission, setHasWebcamPermission] = useState(false)
  const [hasScreenPermission, setHasScreenPermission] = useState(false)
  const [screenError, setScreenError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // WebRTC Signaling Logic
  const setupWebRTC = useCallback(async (socket: any, targetSessionId: string) => {
    if (peerConnectionRef.current) {
      // Already active? maybe renegotiate or ignore
      // For simplicity, close and recreate or reuse
      return;
    }

    console.log("Setting up WebRTC Peer Connection");
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    // Add Tracks
    const { webcamStream, screenStream } = recordingState;
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => pc.addTrack(track, webcamStream));
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream));
    }

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          targetSessionId,
          candidate: event.candidate
        });
      }
    };

    // Create Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('offer', {
      targetSessionId,
      sdp: offer
    });
  }, [recordingState]);

  // Removed WebRTC signaling useEffect


  // Request webcam permission and get stream
  const requestWebcamPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      })

      setRecordingState((prev) => ({ ...prev, webcamStream: stream }))
      setHasWebcamPermission(true)
      return true
    } catch (error) {
      console.error("[v0] Failed to get webcam permission:", error)
      setHasWebcamPermission(false)
      return false
    }
  }, [])

  const requestScreenPermission = useCallback(async (): Promise<boolean> => {
    setScreenError(null)

    try {
      // Check if getDisplayMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setScreenError("Screen sharing is not supported in this browser")
        setHasScreenPermission(false)
        return false
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      })

      // Handle user stopping screen share
      stream.getVideoTracks()[0].onended = () => {
        setRecordingState((prev) => ({ ...prev, screenStream: null }))
        setHasScreenPermission(false)
      }

      setRecordingState((prev) => ({ ...prev, screenStream: stream }))
      setHasScreenPermission(true)
      return true
    } catch (error: unknown) {
      console.error("[v0] Failed to get screen permission:", error)

      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes("permissions policy") || errorMessage.includes("display-capture")) {
        setScreenError("Screen sharing is restricted in preview mode. This will work when deployed to production.")
        setHasScreenPermission(true)
        return true
      } else if (errorMessage.includes("denied") || errorMessage.includes("NotAllowedError")) {
        setScreenError("Screen sharing was denied. Please allow screen sharing to continue.")
      } else {
        setScreenError("Failed to access screen. Please try again.")
      }

      setHasScreenPermission(false)
      return false
    }
  }, [])

  // Create merged video stream with webcam overlay on screen recording
  const createMergedStream = useCallback((): MediaStream | null => {
    const { webcamStream, screenStream } = recordingState

    if (!screenStream) return webcamStream
    if (!webcamStream) return screenStream

    // Create canvas for merging streams
    const canvas = document.createElement("canvas")
    canvas.width = 1920
    canvas.height = 1080
    canvasRef.current = canvas

    const ctx = canvas.getContext("2d")
    if (!ctx) return screenStream

    const screenVideo = document.createElement("video")
    screenVideo.srcObject = screenStream
    screenVideo.muted = true
    screenVideo.play()

    const webcamVideo = document.createElement("video")
    webcamVideo.srcObject = webcamStream
    webcamVideo.muted = true
    webcamVideo.play()

    // Draw merged video frames
    const drawFrame = () => {
      // Draw screen
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)

      // Draw webcam as overlay in bottom-right corner
      const webcamWidth = 320
      const webcamHeight = 240
      const padding = 20

      // Draw border/background for webcam
      ctx.fillStyle = "#1a1a2e"
      ctx.fillRect(
        canvas.width - webcamWidth - padding - 4,
        canvas.height - webcamHeight - padding - 4,
        webcamWidth + 8,
        webcamHeight + 8,
      )

      // Draw webcam feed
      ctx.drawImage(
        webcamVideo,
        canvas.width - webcamWidth - padding,
        canvas.height - webcamHeight - padding,
        webcamWidth,
        webcamHeight,
      )

      // Draw recording indicator
      ctx.fillStyle = "#ef4444"
      ctx.beginPath()
      ctx.arc(40, 40, 12, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.font = "16px sans-serif"
      ctx.fillText("REC", 60, 46)

      animationFrameRef.current = requestAnimationFrame(drawFrame)
    }

    // Start drawing when videos are ready
    Promise.all([
      new Promise((resolve) => {
        screenVideo.onloadedmetadata = resolve
      }),
      new Promise((resolve) => {
        webcamVideo.onloadedmetadata = resolve
      }),
    ]).then(() => {
      drawFrame()
    })

    // Create stream from canvas
    const canvasStream = canvas.captureStream(30)

    // Add audio from screen if available
    const audioTracks = screenStream.getAudioTracks()
    audioTracks.forEach((track) => canvasStream.addTrack(track))

    return canvasStream
  }, [recordingState])

  // Start recording
  const startRecording = useCallback(async () => {
    const mergedStream = createMergedStream() || recordingState.webcamStream

    if (!mergedStream) {
      console.error("[v0] No stream available for recording")
      return
    }

    recordedChunksRef.current = []

    const recorder = new MediaRecorder(mergedStream, {
      mimeType: "video/webm;codecs=vp9",
    })

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && session?.sessionId) {
        // Stream to backend
        try {
          await fetch(`/api/recording/chunk?sessionId=${session.sessionId}&type=desktop`, {
            method: 'POST',
            body: event.data
          });
        } catch (e) {
          console.error("Failed to upload desktop chunk", e);
        }
      }
    }

    mediaRecorderRef.current = recorder
    recorder.start(1000) // Capture in 1-second chunks

    setRecordingState((prev) => ({
      ...prev,
      isRecording: true,
      startTime: new Date(),
    }))
  }, [createMergedStream, recordingState.webcamStream, session?.sessionId])

  // Stop recording and return the recorded blob
  const stopRecording = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === "inactive") {
        resolve()
        return
      }

      recorder.onstop = () => {
        // Cancel animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        // Stop all tracks
        recordingState.webcamStream?.getTracks().forEach((track) => track.stop())
        recordingState.screenStream?.getTracks().forEach((track) => track.stop())

        setRecordingState({
          isRecording: false,
          webcamStream: null,
          screenStream: null,
          mobileStream: null,
          recordedChunks: [],
          startTime: null,
        })

        setHasWebcamPermission(false)
        setHasScreenPermission(false)

        resolve()
      }

      recorder.stop()
    })
  }, [recordingState])

  const getWebcamStream = useCallback(() => recordingState.webcamStream, [recordingState.webcamStream])
  const getScreenStream = useCallback(() => recordingState.screenStream, [recordingState.screenStream])

  const value: RecordingContextType = {
    recordingState,
    isRecording: recordingState.isRecording,
    hasWebcamPermission,
    hasScreenPermission,
    screenError,
    requestWebcamPermission,
    requestScreenPermission,
    startRecording,
    stopRecording,
    getWebcamStream,
    getScreenStream,
  }

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>
}

export function useRecording(): RecordingContextType {
  const context = useContext(RecordingContext)
  if (context === undefined) {
    throw new Error("useRecording must be used within a RecordingProvider")
  }
  return context
}
