"use client"

import { useRef, useCallback, useState, useEffect } from "react"

export interface ObjectDetection {
    isPresent: boolean
    label: string
    confidence: number
    boundingBox: { x: number; y: number; width: number; height: number } | null
    timestamp: Date
}

interface UseObjectDetectionOptions {
    videoElement: HTMLVideoElement | null
    canvasElement: HTMLCanvasElement | null
    enabled: boolean
    onObjectDetected?: (detection: ObjectDetection) => void
}

/**
 * Object Detection Hook
 * Uses simplified image analysis to simulate object detection for phones/books
 * In Phase 3+, this would use TensorFlow.js with COCO-SSD
 */
export function useObjectDetection({
    videoElement,
    canvasElement,
    enabled,
    onObjectDetected,
}: UseObjectDetectionOptions) {
    const [isTracking, setIsTracking] = useState(false)
    const animationFrameRef = useRef<number | null>(null)

    // Track consecutive detections to avoid flicker
    const detectionCounterRef = useRef<number>(0)

    // Simulation logic for unauthorized objects (simulating cell phone detection via dark rectangles)
    const detectObject = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number): ObjectDetection | null => {
        // Check the lower third of the screen where hands/phones usually appear
        const yStart = Math.floor(height * 0.6);
        const regionHeight = Math.floor(height * 0.4);

        // Safety check in case video isn't fully loaded
        if (width === 0 || height === 0) return null;

        const imageData = ctx.getImageData(0, yStart, width, regionHeight)
        const data = imageData.data

        let darkPixels = 0
        let totalPixels = 0

        // Look for dark, rectangular-ish regions like a phone screen
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]

            totalPixels++

            // Detect dark non-skin colors (phones)
            const isDark = r < 50 && g < 50 && b < 50
            if (isDark) {
                darkPixels++
            }
        }

        const darkRatio = darkPixels / totalPixels
        // If a significant dense cluster exists
        if (darkRatio > 0.08 && darkRatio < 0.3) {
            detectionCounterRef.current++
        } else {
            detectionCounterRef.current = 0
        }

        // Require sustained detection
        if (detectionCounterRef.current > 30) {
            return {
                isPresent: true,
                label: "cell phone",
                confidence: Math.min(darkRatio * 5, 0.95),
                boundingBox: {
                    x: Math.floor(width * 0.3),
                    y: yStart + Math.floor(regionHeight * 0.2),
                    width: Math.floor(width * 0.4),
                    height: Math.floor(regionHeight * 0.6)
                },
                timestamp: new Date(),
            }
        }

        return null
    }, [])

    const trackFrame = useCallback(() => {
        if (!videoElement || !canvasElement || !enabled) return
        const ctx = canvasElement.getContext("2d")
        if (!ctx) return

        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth || 640
            canvasElement.height = videoElement.videoHeight || 480
        }

        ctx.drawImage(videoElement, 0, 0)

        // Only run object detection every few frames to save CPU
        if (Math.random() > 0.7) {
            const detection = detectObject(ctx, canvasElement.width, canvasElement.height)

            if (detection && onObjectDetected) {
                onObjectDetected(detection)

                // Draw bounding box if object found
                if (detection.boundingBox) {
                    const { x, y, width: bw, height: bh } = detection.boundingBox
                    ctx.strokeStyle = "#ef4444"
                    ctx.lineWidth = 3
                    ctx.strokeRect(x, y, bw, bh)
                    ctx.fillStyle = "#ef4444"
                    ctx.font = "14px sans-serif"
                    ctx.fillText(`${detection.label} (${(detection.confidence * 100).toFixed(0)}%)`, x, y - 5)
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(trackFrame)
    }, [videoElement, canvasElement, enabled, detectObject, onObjectDetected])

    const startTracking = useCallback(() => {
        if (isTracking) return
        setIsTracking(true)
        animationFrameRef.current = requestAnimationFrame(trackFrame)
    }, [isTracking, trackFrame])

    const stopTracking = useCallback(() => {
        setIsTracking(false)
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }
    }, [])

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [])

    return { isTracking, startTracking, stopTracking }
}
