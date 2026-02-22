import type React from "react"
import { LoginForm } from "@/components/login-form"
import { Shield, Camera, Monitor, Smartphone } from "lucide-react"

/**
 * Landing/Login Page
 * Entry point for students to authenticate before taking the exam
 */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Background gradient effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">TRINETRA</h1>
          <p className="mt-3 text-lg text-muted-foreground">Secure & Intelligent Examination System</p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Features */}
        <div className="mt-12 grid max-w-2xl grid-cols-2 gap-4 px-4 sm:grid-cols-4">
          <FeatureItem icon={<Camera className="h-5 w-5" />} label="Webcam Recording" />
          <FeatureItem icon={<Monitor className="h-5 w-5" />} label="Screen Capture" />
          <FeatureItem icon={<Smartphone className="h-5 w-5" />} label="Mobile Proctoring" />
          <FeatureItem icon={<Shield className="h-5 w-5" />} label="AI Analysis" />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Proctored Examination System v1.0</p>
          <p className="mt-1">Your exam session is monitored for academic integrity</p>
        </footer>
      </div>
    </main>
  )
}

function FeatureItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-card/50 p-4 text-center">
      <div className="text-primary">{icon}</div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
