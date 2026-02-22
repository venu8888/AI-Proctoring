"use client"

import { useState, useEffect } from "react"
import type { Question, Difficulty } from "@/types"
import { updateQuestion, addQuestion, getQuestions, resetQuestionBank } from "@/services/question-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit2, Plus, RefreshCw, Check, X } from "lucide-react"

/**
 * Question Editor Component (Admin)
 * Allows administrators to manage questions during exams
 * Changes are reflected in student apps via polling
 */

export function QuestionEditor() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Question>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Load questions on mount
  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    const data = await getQuestions()
    setQuestions(data)
  }

  const difficultyColors: Record<Difficulty, string> = {
    easy: "bg-success/20 text-success",
    medium: "bg-warning/20 text-warning",
    hard: "bg-destructive/20 text-destructive",
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.questionId)
    setEditForm({ ...question })
  }

  const handleSave = async () => {
    if (!editingId || !editForm.questionId) return

    const success = await updateQuestion(editingId, editForm)
    if (success) {
      await loadQuestions()
      setEditingId(null)
      setEditForm({})
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
    setIsAddingNew(false)
  }

  const handleAddNew = async () => {
    const newQuestion: any = {
      questionId: `q${Date.now()}`,
      question: editForm.question || "",
      options: editForm.options || ["", "", "", ""],
      correctAnswer: editForm.correctAnswer || 0,
      difficulty: (editForm.difficulty as Difficulty) || "medium",
      minimumExpectedTime: editForm.minimumExpectedTime || 30,
      topic: (editForm as any).topic || "General",
    }

    await addQuestion(newQuestion)
    await loadQuestions()
    setIsAddingNew(false)
    setEditForm({})
  }

  const handleReset = async () => {
    await resetQuestionBank()
    await loadQuestions()
  }



  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Question Management</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAddingNew(true)
              setEditForm({
                options: ["", "", "", ""],
                correctAnswer: 0,
                difficulty: "medium",
                minimumExpectedTime: 30,
              })
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Question Form */}
        {isAddingNew && (
          <Card className="border-primary/50 bg-primary/5 p-4">
            <QuestionForm
              form={editForm}
              setForm={setEditForm}
              onSave={handleAddNew}
              onCancel={handleCancel}
              isNew={true}
            />
          </Card>
        )}

        {/* Question List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {questions.map((q, index) => (
            <div key={q.questionId} className="rounded-lg border border-border/50 bg-secondary/30 p-4">
              {editingId === q.questionId ? (
                <QuestionForm
                  form={editForm}
                  setForm={setEditForm}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isNew={false}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                      <Badge variant="outline">{(q as any).topic || "General"}</Badge>
                      <Badge className={difficultyColors[q.difficulty]}>{q.difficulty}</Badge>
                      <span className="text-xs text-muted-foreground">Min time: {q.minimumExpectedTime}s</span>
                    </div>
                    <p className="text-sm mb-2">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {q.options.map((opt, i) => (
                        <span key={i} className={i === q.correctAnswer ? "text-success font-medium" : ""}>
                          {String.fromCharCode(65 + i)}. {opt.slice(0, 30)}
                          {opt.length > 30 ? "..." : ""}
                          {i === q.correctAnswer && " ✓"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuestionFormProps {
  form: Partial<Question>
  setForm: (form: Partial<Question>) => void
  onSave: () => void
  onCancel: () => void
  isNew: boolean
}

function QuestionForm({ form, setForm, onSave, onCancel, isNew }: QuestionFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Question Text</Label>
        <Textarea
          value={form.question || ""}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          placeholder="Enter the question..."
          rows={2}
        />
      </div>

      <div>
        <Label>Topic</Label>
        <Input
          value={(form as any).topic || ""}
          onChange={(e) => setForm({ ...form, topic: e.target.value } as any)}
          placeholder="e.g. Database, Data Structures, OOP"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Difficulty</Label>
          <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as Difficulty })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Min Time (seconds)</Label>
          <Input
            type="number"
            value={form.minimumExpectedTime || 30}
            onChange={(e) => setForm({ ...form, minimumExpectedTime: Number.parseInt(e.target.value) || 30 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Options (correct answer has green border)</Label>
        {(form.options || ["", "", "", ""]).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={opt}
              onChange={(e) => {
                const newOptions = [...(form.options || ["", "", "", ""])]
                newOptions[i] = e.target.value
                setForm({ ...form, options: newOptions })
              }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className={form.correctAnswer === i ? "border-success" : ""}
            />
            <Button
              type="button"
              variant={form.correctAnswer === i ? "default" : "outline"}
              size="sm"
              onClick={() => setForm({ ...form, correctAnswer: i })}
            >
              {form.correctAnswer === i ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={onSave}>
          <Check className="mr-2 h-4 w-4" />
          {isNew ? "Add Question" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
