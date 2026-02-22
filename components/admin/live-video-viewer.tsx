"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StudentSession } from "@/types"
import { X, Maximize2, Minimize2, Camera, Monitor, Smartphone, AlertTriangle, Loader2 } from "lucide-react"

import { supabase } from "@/lib/supabaseClient"

interface LiveVideoViewerProps {
  session: StudentSession
  onClose: () => void
  onWarn?: (sessionId: string, message: string) => void
}

/**
 * Live Video Viewer Component
 * Shows screen recording with webcam overlay in bottom-right corner
 * Used by admin to monitor student activity in real-time
 */

export function LiveVideoViewer({ session, onClose, onWarn }: LiveVideoViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  // Refs for WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const videoRef = useState<HTMLVideoElement | null>(null) // We use one video element for the merged stream or primary stream

  // We will assume MERGED stream for simplicity and robustness in this "existing codebase" constraint, 
  // unless user strictly enforces separate displays.
  // The prompt said "Separate streams for camera and screen", but also "Backend acts ONLY as signaling server".
  // If I send separate tracks, I can display them separately. 
  // Let's try to handle incoming tracks.

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  const hasAlerts = session.behaviorFlags.some((f) => f.severity === "critical" || f.severity === "high")

  useEffect(() => {
    if (!session?.sessionId) return

    const roomName = `webrtc-${session.sessionId}`
    const channel = supabase.channel(roomName)

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    pcRef.current = pc

    pc.ontrack = (event) => {
      // We expect 2 video tracks: one screen (usually higher res), one webcam
      const stream = event.streams[0]
      const videoTrack = event.track

      // Simple heuristic: if label contains 'screen' or 'monitor' or size is larger
      // But MediaStreamTracks might not have reliable labels across browsers in a combined stream
      // Since we are adding tracks individually on broadcaster, they might arrive as separate streams or one.
      // Let's assume the first track is webcam and second is screen based on the addTrack order in broadcaster.
      // A robust way mapping is usually done via M-lines or transceiver mid, but a simple state toggle works for demo.

      setWebcamStream(prev => {
        if (!prev) return stream;
        return prev;
      })

      setScreenStream(prev => {
        // If webcam is already set, this must be the second track (screen)
        if (webcamStream) return stream;
        return prev;
      })
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            target: 'broadcaster',
            sender: 'admin',
            signal: { type: 'candidate', candidate: event.candidate }
          }
        })
      }
    }

    channel.on('broadcast', { event: 'webrtc-signal' }, async (payload) => {
      const { target, sender, signal } = payload.payload
      if (target !== 'admin') return

      try {
        if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.description))
        } else if (signal.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      } catch (err) {
        console.error("Admin WebRTC Error:", err)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Admin subscribed to ${roomName}`)

        // Create an offer to start the connection
        pc.addTransceiver('video', { direction: 'recvonly' })
        pc.addTransceiver('video', { direction: 'recvonly' }) // Two transceivers for two streams

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            target: 'broadcaster',
            sender: 'admin',
            signal: { type: 'offer', description: pc.localDescription }
          }
        })
      }
    })

    return () => {
      pc.close()
      supabase.removeChannel(channel)
    }
  }, [session.sessionId]);

  return (
    <Card
      className={`border-border bg-card ${isFullscreen ? "fixed inset-4 z-50" : "relative"} ${hasAlerts ? "border-red-500/50" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-medium">{session.studentName}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {session.studentId}
          </Badge>
          {hasAlerts && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Alert
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1 bg-orange-500 hover:bg-orange-600 text-white border-none"
            onClick={() => {
              const msg = prompt("Enter warning message for student:");
              if (msg) onWarn?.(session.sessionId, msg);
            }}
          >
            <AlertTriangle className="h-3 w-3" />
            Warn
          </Button>
          <div className="flex items-center gap-3 mr-4 text-xs">
            {/* Indicators */}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div
          className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? "h-[calc(100vh-12rem)]" : "aspect-video"}`}
        >
          {/* Screen Recording (Main View) */}
          <div className="absolute inset-0 flex items-center justify-center">
            {screenStream ? (
              <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
                ref={el => { if (el) el.srcObject = screenStream }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm">Waiting for live feed...</p>
                <p className="text-xs opacity-50">Checking connection...</p>
              </div>
            )}
          </div>

          {/* Webcam Overlay (Bottom Right Corner) */}
          <div className="absolute bottom-3 right-3 w-32 h-24 md:w-48 md:h-36 bg-slate-900 rounded-lg border-2 border-border/50 overflow-hidden shadow-lg z-10">
            {webcamStream ? (
              <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                ref={el => { if (el) el.srcObject = webcamStream }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/50">
                {/* Fallback or waiting state */}
                <Camera className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
            {/* Recording indicator */}
            <div className="absolute top-1 left-1 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-red-400 font-medium">LIVE</span>
            </div>
          </div>

        </div>

        {/* Recent Activity */}
        {session.activityLog.length > 0 && (
          <div className="mt-2 p-2 bg-muted/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Recent Activity:</p>
            <div className="flex flex-wrap gap-1">
              {session.activityLog.slice(-3).map((log, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {log.action}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
