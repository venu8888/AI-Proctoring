"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Student, Session } from "@/types"

interface User {
  id: string
  name: string
  email: string
  role: "student" | "admin" | "faculty"
  studentId?: string
}

interface AuthContextType {
  student: Student | null
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (studentId: string, password: string) => Promise<boolean>
  adminLogin: (username: string, password: string) => Promise<boolean>
  logout: () => void
  updateSession: (updates: Partial<Session>) => void
  addStudent: (studentId: string, name: string, email: string, password: string) => Promise<boolean> // made async
  removeStudent: (studentId: string) => Promise<boolean> // made async
  getStudents: () => Array<{ studentId: string; name: string; email: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = createClient()
  const [student, setStudent] = useState<Student | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Keep local state for the provisional UI of adding students, though in production 
  // this would fetch directly from the database or an admin API.
  const [students, setStudents] = useState<Record<string, { password: string; student: Student }>>({})

  const fetchProfile = async (authId: string, email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authId)
      .single()

    if (error || !data) return null;

    const authUser: User = {
      id: data.id,
      name: data.full_name,
      email: data.email,
      role: data.role,
      studentId: data.email.split('@')[0].toUpperCase(), // Infer from email for students
    }
    return authUser;
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()

        if (authSession?.user) {
          const profile = await fetchProfile(authSession.user.id, authSession.user.email || '');
          if (profile) {
            setUser(profile)
            if (profile.role === 'student') {
              setStudent({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                studentId: profile.studentId || ''
              })
            }
          }
        }

        // Restore exam session state if exists
        const storedSession = sessionStorage.getItem("proctor_session")
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession)
            if (parsedSession.startTime) parsedSession.startTime = new Date(parsedSession.startTime)
            if (parsedSession.endTime) parsedSession.endTime = new Date(parsedSession.endTime)
            if (parsedSession.pairingTimestamp) parsedSession.pairingTimestamp = new Date(parsedSession.pairingTimestamp)
            setSession(parsedSession)
          } catch (error) {
            sessionStorage.removeItem("proctor_session")
          }
        }
      } catch (e) {
        console.error("Auth initialization error", e)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (event === 'SIGNED_IN' && authSession?.user) {
        const profile = await fetchProfile(authSession.user.id, authSession.user.email || '');
        if (profile) {
          setUser(profile)
          if (profile.role === 'student') {
            setStudent({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              studentId: profile.studentId || ''
            })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setStudent(null)
        setSession(null)
        sessionStorage.removeItem("proctor_session")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Save exam session to storage
  useEffect(() => {
    if (session) {
      sessionStorage.setItem("proctor_session", JSON.stringify(session))
    }
  }, [session])

  const login = useCallback(async (studentId: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      // Map studentId to email format for Supabase Auth
      const email = `${studentId.toLowerCase()}@university.edu`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login failed:", error.message)
        setIsLoading(false)
        return false
      }

      // Profile is fetched in onAuthStateChange, but we set session here
      if (data.user) {
        const profile = await fetchProfile(data.user.id, data.user.email || '')
        if (profile && profile.role === 'student') {
          const newSession: Session = {
            sessionId: generateSessionId(),
            studentId: studentId.toUpperCase(),
            studentName: profile.name,
            startTime: null,
            endTime: null,
            status: "pending",
            mobilePaired: false,
            mobileDeviceId: null,
            pairingTimestamp: null,
          }
          setSession(newSession)
          setIsLoading(false)
          return true
        }
      }
    } catch (e) {
      console.error("Login error", e)
    }

    setIsLoading(false)
    return false
  }, [supabase])

  const adminLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      // Allow username 'admin' to map to 'admin@university.edu'
      const email = username === 'admin' ? 'admin@university.edu' :
        (username.includes('@') ? username : `${username}@university.edu`)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        const profile = await fetchProfile(data.user.id, data.user.email || '')
        if (profile && (profile.role === 'admin' || profile.role === 'faculty')) {
          setIsLoading(false)
          return true
        } else {
          // Not an admin
          await supabase.auth.signOut()
        }
      }
    } catch (e) {
      console.error("Admin login failed", e)
    }

    setIsLoading(false)
    return false
  }, [supabase])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setStudent(null)
    setUser(null)
    setSession(null)
    sessionStorage.removeItem("proctor_session")
  }, [supabase])

  const updateSession = useCallback((updates: Partial<Session>) => {
    setSession((prev) => {
      if (!prev) return null
      return { ...prev, ...updates }
    })
  }, [])

  // These three functions are for the provisional UI. Since we can't easily create Auth users 
  // from the client without the service_role key, we will store them in local state for the UI,
  // but note that they won't actually be able to log in unless seeded via script.
  const addStudent = useCallback(async (studentId: string, name: string, email: string, password: string): Promise<boolean> => {
    const normalizedId = studentId.toUpperCase()
    if (students[normalizedId]) return false

    const newStudent: Student = {
      id: `student_${Date.now()}`,
      name,
      email,
      studentId: normalizedId,
    }

    setStudents((prev) => ({
      ...prev,
      [normalizedId]: { password, student: newStudent },
    }))

    return true
  }, [students])

  const removeStudent = useCallback(async (studentId: string): Promise<boolean> => {
    const normalizedId = studentId.toUpperCase()
    if (!students[normalizedId]) return false

    setStudents((prev) => {
      const updated = { ...prev }
      delete updated[normalizedId]
      return updated
    })
    return true
  }, [students])

  const getStudents = useCallback(() => {
    return Object.entries(students).map(([id, data]) => ({
      studentId: id,
      name: data.student.name,
      email: data.student.email,
    }))
  }, [students])

  const value: AuthContextType = {
    student,
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    login,
    adminLogin,
    logout,
    updateSession,
    addStudent,
    removeStudent,
    getStudents,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
