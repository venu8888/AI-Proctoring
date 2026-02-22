"use client"

import { useRef, useCallback, useState, useEffect } from "react"

export interface AudioDetection {
    isSpeaking: boolean
    volume: number
    timestamp: Date
}

interface UseAudioTrackingOptions {
    stream: MediaStream | null
    enabled: boolean
    onAudioDetected?: (detection: AudioDetection) => void
}

export function useAudioTracking({ stream, enabled, onAudioDetected }: UseAudioTrackingOptions) {
    const [isTracking, setIsTracking] = useState(false)

    const audioContextRef = useRef<AudioContext | null>(null)
    const analyzerRef = useRef<AnalyserNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    const trackAudio = useCallback(() => {
        if (!analyzerRef.current || !enabled) return

        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
        analyzerRef.current.getByteFrequencyData(dataArray)

        // Calculate average volume
        const sum = dataArray.reduce((acc, val) => acc + val, 0)
        const averageVolume = sum / dataArray.length

        // Arbitrary threshold for speech/noise
        const isSpeaking = averageVolume > 30

        const detection: AudioDetection = {
            isSpeaking,
            volume: averageVolume,
            timestamp: new Date()
        }

        if (onAudioDetected) {
            onAudioDetected(detection)
        }

        animationFrameRef.current = requestAnimationFrame(trackAudio)
    }, [enabled, onAudioDetected, setIsTracking])

    const startTracking = useCallback(() => {
        if (isTracking || !stream || !enabled) return

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass()
            analyzerRef.current = audioContextRef.current.createAnalyser()
            analyzerRef.current.fftSize = 256

            // Check if stream has audio tracks
            if (stream.getAudioTracks().length === 0) return;

            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
            sourceRef.current.connect(analyzerRef.current)

            setIsTracking(true)
            trackAudio()
        } catch (e) {
            console.error("Failed to start audio tracking:", e)
        }
    }, [isTracking, stream, enabled, trackAudio, setIsTracking])

    const stopTracking = useCallback(() => {
        setIsTracking(false)
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect()
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
        }
    }, [setIsTracking])

    useEffect(() => {
        if (enabled && stream) {
            startTracking()
        } else {
            stopTracking()
        }

        return () => stopTracking()
    }, [enabled, stream, startTracking, stopTracking])

    return { isTracking }
}
