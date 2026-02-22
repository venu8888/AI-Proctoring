/**
 * Core type definitions for the AI Proctored Examination System
 * These types are used across all phases of the system
 */

// Student and authentication types
export interface Student {
  id: string
  name: string
  email: string
  studentId: string
}

export interface Session {
  sessionId: string
  studentId: string
  studentName: string
  startTime: Date | null
  endTime: Date | null
  status: "pending" | "paired" | "active" | "completed" | "flagged"
  mobilePaired: boolean
  mobileDeviceId: string | null
  pairingTimestamp: Date | null
}

// Question and exam types
export type Difficulty = "easy" | "medium" | "hard"

export interface Question {
  questionId: string
  question: string
  options: string[]
  correctAnswer: number // Index of correct option
  difficulty: Difficulty
  minimumExpectedTime: number // in seconds
}

export interface Answer {
  questionId: string
  selectedOption: number | null
  timeSpent: number // in seconds
  answeredAt: Date | null
  isLocked: boolean
}

export interface ExamState {
  examId: string
  questions: Question[]
  answers: Answer[]
  currentQuestionIndex: number
  startTime: Date | null
  endTime: Date | null
  totalDuration: number // in seconds
  remainingTime: number // in seconds
  isSubmitted: boolean
  finalResult?: {
    score: number
    passing: boolean
    credibilityIndex: number
  }
}

// Logging and behavior analysis types
export interface QuestionLog {
  questionId: string
  difficulty: Difficulty
  timeSpent: number
  isCorrect: boolean
  answeredBelowMinTime: boolean
  timestamp: Date
}

export interface BehaviorFlag {
  type: "fast_correct" | "high_accuracy_hard" | "suspicious_pattern" | "face_absent" | "multiple_faces"
  description: string
  timestamp: Date
  severity: "low" | "medium" | "high" | "critical"
}

export interface ExamLog {
  sessionId: string
  studentId: string
  questionLogs: QuestionLog[]
  behaviorFlags: BehaviorFlag[]
  totalCorrect: number
  totalQuestions: number
  accuracy: number
  examDuration: number
  startTime: Date
  endTime: Date | null
}

// Face tracking types
export interface FaceDetection {
  isPresent: boolean
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  } | null
  confidence: number
  timestamp: Date
}

export interface FaceTrackingLog {
  totalAbsences: number
  absenceDurations: number[]
  multipleFaceDetections: number
  averageConfidence: number
}

// Recording types
export interface RecordingState {
  isRecording: boolean
  webcamStream: MediaStream | null
  screenStream: MediaStream | null
  mobileStream: MediaStream | null
  recordedChunks: Blob[]
  startTime: Date | null
}

// Mobile pairing types
export interface QRPairingData {
  sessionId: string
  studentId: string
  timestamp: number
  expiresAt: number
}

export interface MobilePairingState {
  isPaired: boolean
  deviceId: string | null
  pairingCode: string | null
  lastHeartbeat: string | Date | null
  cameraConfirmed: boolean
}

// Admin types
export interface AdminSession {
  id: string
  isAdmin: boolean
}

export interface StudentMonitoringData {
  session: Session
  currentQuestion: number
  timeSpent: number
  flags: BehaviorFlag[]
  facePresent: boolean
  mobilePaired: boolean
}

// Alert types for admin
export interface Alert {
  id: string
  sessionId: string
  studentName: string
  type: BehaviorFlag["type"]
  message: string
  timestamp: Date
  acknowledged: boolean
}

export interface StudentSession {
  sessionId: string
  examId: string
  studentId: string
  studentName: string
  status: "active" | "paused" | "completed" | "terminated" | "pending"
  startTime: number
  timeRemaining: number
  currentQuestion: number
  answeredCount: number
  totalQuestions: number
  webcamActive: boolean
  screenShareActive: boolean
  mobileConnected: boolean
  behaviorFlags: BehaviorFlag[]
  activityLog: { action: string; timestamp: number }[]
  // Live stream URLs for admin monitoring
  webcamStreamUrl?: string
  screenStreamUrl?: string
}

export const ACTIVE_SESSIONS_KEY = "proctor_active_sessions"

// Integrity report
export interface IntegrityReport {
  sessionId: string
  studentId: string
  studentName: string
  examDate: Date
  duration: number
  score: number
  accuracy: number
  integrityScore: number // 0-100
  flags: BehaviorFlag[]
  faceTrackingLog: FaceTrackingLog
  recommendation: "pass" | "review" | "investigate"
}
export interface Section {
  id: string
  name: string
  description?: string
}

export interface QuestionPaper {
  id: string
  name: string
  sections: Section[]
  questions: Record<string, Question[]> // sectionId -> questions
  totalQuestions: number
  durationMinutes: number
}
