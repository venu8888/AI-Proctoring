"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Clock, Play, Pause, FastForward, Rewind } from "lucide-react"
import { cn } from "@/lib/utils"

interface BehaviorFlag {
    type: string
    description: string
    timestamp: string | Date
    severity: 'low' | 'medium' | 'high' | 'critical'
}

interface VideoReviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sessionId: string
    studentName: string
    examTitle: string
    startTime: string | Date
    behaviorFlags: BehaviorFlag[]
}

export function VideoReviewModal({
    open,
    onOpenChange,
    sessionId,
    studentName,
    examTitle,
    startTime,
    behaviorFlags = []
}: VideoReviewModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)

    // Calculate offsets for each flag
    const sessionStart = new Date(startTime).getTime()
    const flagsWithOffsets = behaviorFlags.map(flag => {
        const flagTime = new Date(flag.timestamp).getTime()
        const offsetSeconds = Math.max(0, (flagTime - sessionStart) / 1000)
        return { ...flag, offset: offsetSeconds }
    }).sort((a, b) => a.offset - b.offset)

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration)
        }
    }

    const jumpToTime = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds
            videoRef.current.play()
            setIsPlaying(true)
        }
    }

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause()
            else videoRef.current.play()
            setIsPlaying(!isPlaying)
        }
    }

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60)
        const sec = Math.floor(seconds % 60)
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span>Exam Review: {studentName}</span>
                            <span className="text-sm font-normal text-muted-foreground">{examTitle}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Session: {sessionId.substring(0, 8)}...
                            </Badge>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Video Area */}
                    <div className="flex-1 flex flex-col bg-black">
                        <div className="flex-1 relative group flex items-center justify-center">
                            <video
                                ref={videoRef}
                                src={`/api/admin/recordings/${sessionId}`}
                                className="max-h-full w-auto"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onClick={togglePlay}
                            />

                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
                                    <div className="h-20 w-20 rounded-full bg-primary/80 flex items-center justify-center text-white scale-110 transition-transform active:scale-95">
                                        <Play className="h-10 w-10 fill-current" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Controls & Timeline */}
                        <div className="p-4 bg-muted/10 border-t border-white/10 space-y-4">
                            <div className="flex items-center gap-4 text-white">
                                <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={togglePlay}>
                                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </Button>

                                <span className="text-xs font-mono w-24">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>

                                {/* Timeline Toolbar */}
                                <div className="flex-1 h-3 rounded-full bg-white/20 relative cursor-pointer"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const x = e.clientX - rect.left
                                        const pct = x / rect.width
                                        jumpToTime(pct * duration)
                                    }}>
                                    <div
                                        className="absolute top-0 left-0 h-full bg-primary rounded-full"
                                        style={{ width: `${(currentTime / duration) * 100}%` }}
                                    />

                                    {/* Performance Flags Markers */}
                                    {flagsWithOffsets.map((flag, i) => {
                                        const pos = (flag.offset / duration) * 100
                                        if (pos > 100) return null

                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "absolute top-1/2 -translate-y-1/2 h-4 w-1 transform -translate-x-1/2 cursor-pointer border-x border-black/50 select-none",
                                                    flag.severity === 'critical' ? 'bg-destructive h-6 z-30' :
                                                        flag.severity === 'high' ? 'bg-destructive z-20' :
                                                            flag.severity === 'medium' ? 'bg-warning z-10' : 'bg-info'
                                                )}
                                                style={{ left: `${pos}%` }}
                                                title={`${flag.type}: ${flag.description}`}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    jumpToTime(flag.offset)
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Behavior Sidebar */}
                    <div className="w-80 border-l bg-card flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-warning" />
                                AI Observations
                            </h3>
                            <Badge variant="secondary">{flagsWithOffsets.length}</Badge>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-3">
                                {flagsWithOffsets.length === 0 ? (
                                    <p className="text-sm text-center text-muted-foreground py-10">No AI flags detected for this session.</p>
                                ) : (
                                    flagsWithOffsets.map((flag, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-colors",
                                                currentTime >= flag.offset && currentTime < (flag.offset + 5)
                                                    ? "bg-primary/10 border-primary"
                                                    : "bg-muted/30 hover:bg-muted/50 border-transparent"
                                            )}
                                            onClick={() => jumpToTime(flag.offset)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant={
                                                    flag.severity === 'critical' ? 'destructive' :
                                                        flag.severity === 'high' ? 'destructive' :
                                                            flag.severity === 'medium' ? 'outline' : 'default'
                                                } className={cn(
                                                    "text-[10px] px-1.5 py-0 h-4",
                                                    flag.severity === 'medium' && "border-warning text-warning"
                                                )}>
                                                    {flag.type}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {formatTime(flag.offset)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-foreground leading-relaxed">
                                                {flag.description}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close Review</Button>
                    <Button variant="destructive" className="gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Void Session
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ShieldAlert(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </svg>
    )
}
