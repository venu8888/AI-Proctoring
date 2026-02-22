"use client"

import { useEffect, useRef } from "react"
import { useRecording } from "@/contexts/recording-context"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabaseClient"

export function LiveStreamBroadcaster() {
    const { session } = useAuth()
    const { recordingState } = useRecording()

    // Use a ref to access current streams in callbacks without triggering re-runs
    const streamsRef = useRef({ webcamStream: recordingState.webcamStream, screenStream: recordingState.screenStream })
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const channelRef = useRef<any>(null)

    useEffect(() => {
        streamsRef.current = {
            webcamStream: recordingState.webcamStream,
            screenStream: recordingState.screenStream
        }
    }, [recordingState.webcamStream, recordingState.screenStream])

    useEffect(() => {
        if (!session?.sessionId) return

        // 1. Join a specific channel for this exam session
        const roomName = `webrtc-${session.sessionId}`
        const channel = supabase.channel(roomName)

        channelRef.current = channel

        // 2. Handle incoming WebRTC signaling messages from Admins
        channel.on('broadcast', { event: 'webrtc-signal' }, async (payload) => {
            const { target, sender, signal } = payload.payload

            // Ignore messages not meant for the student broadcaster
            if (target !== 'broadcaster') return

            let pc = peerConnectionsRef.current.get(sender)

            // Initialize PeerConnection if it doesn't exist
            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                })

                peerConnectionsRef.current.set(sender, pc)

                // Add local streams to the connection (Webcam + Screen)
                const streams = streamsRef.current
                if (streams.webcamStream) {
                    streams.webcamStream.getTracks().forEach(track => {
                        pc!.addTrack(track, streams.webcamStream!)
                    })
                }
                if (streams.screenStream) {
                    streams.screenStream.getTracks().forEach(track => {
                        pc!.addTrack(track, streams.screenStream!)
                    })
                }

                // Send ICE candidates to the admin
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        channel.send({
                            type: 'broadcast',
                            event: 'webrtc-signal',
                            payload: {
                                target: sender,
                                sender: 'broadcaster',
                                signal: { type: 'candidate', candidate: event.candidate }
                            }
                        })
                    }
                }
            }

            // Process signaling data
            try {
                if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.description))
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)

                    channel.send({
                        type: 'broadcast',
                        event: 'webrtc-signal',
                        payload: {
                            target: sender,
                            sender: 'broadcaster',
                            signal: { type: 'answer', description: pc.localDescription }
                        }
                    })
                } else if (signal.type === 'candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
                } else if (signal.type === 'peer-disconnect') {
                    pc.close()
                    peerConnectionsRef.current.delete(sender)
                }
            } catch (err) {
                console.error('WebRTC Error:', err)
            }
        })

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`LiveStreamBroadcaster subscribed to ${roomName}`)
            }
        })

        return () => {
            // Cleanup all peer connections and the channel
            peerConnectionsRef.current.forEach(pc => pc.close())
            peerConnectionsRef.current.clear()

            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [session?.sessionId])

    return null // Headless component
}
