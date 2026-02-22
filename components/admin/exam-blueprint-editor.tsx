"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Loader2, Plus, Clock, FileEdit, Trash2, Component } from "lucide-react"

type Group = {
    id: string
    name: string
}

type TopicStats = {
    topic: string
    easy: number
    medium: number
    hard: number
}

// Representing one row in the Blueprint Builder
type BlueprintRule = {
    id: string
    topic: string
    easyCount: number
    mediumCount: number
    hardCount: number
}

export function ExamBlueprintEditor() {
    const { user } = useAuth()

    // Form State
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [passMarks, setPassMarks] = useState(40)
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    // Blueprint engine state
    const [rules, setRules] = useState<BlueprintRule[]>([])
    const [marksPerDifficulty, setMarksPerDifficulty] = useState({ easy: 1, medium: 2, hard: 5 })

    // Data for selects
    const [groups, setGroups] = useState<Group[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState<string>("")
    const [availableTopics, setAvailableTopics] = useState<string[]>([])
    const [topicStats, setTopicStats] = useState<TopicStats[]>([])

    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch available groups
            const { data: groupsData } = await supabase.from('groups').select('id, name')
            if (groupsData) setGroups(groupsData)

            // 2. Fetch question stats to know what topics/difficulties exist
            const { data: questionsData } = await supabase.from('questions').select('topic, difficulty')

            if (questionsData) {
                // Calculate counts
                const statsMap = new Map<string, TopicStats>()
                questionsData.forEach(q => {
                    const t = q.topic || 'General'
                    if (!statsMap.has(t)) {
                        statsMap.set(t, { topic: t, easy: 0, medium: 0, hard: 0 })
                    }
                    const stat = statsMap.get(t)!
                    if (q.difficulty === 'easy') stat.easy++
                    if (q.difficulty === 'medium') stat.medium++
                    if (q.difficulty === 'hard') stat.hard++
                })

                const statsArray = Array.from(statsMap.values())
                setTopicStats(statsArray)
                setAvailableTopics(statsArray.map(s => s.topic))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddRule = () => {
        if (availableTopics.length === 0) return
        setRules([...rules, {
            id: Math.random().toString(36).substring(7),
            topic: availableTopics[0],
            easyCount: 0,
            mediumCount: 0,
            hardCount: 0
        }])
    }

    const updateRule = (id: string, field: keyof BlueprintRule, value: any) => {
        setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const handleRemoveRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id))
    }

    // Calculate totals
    const totalQuestions = rules.reduce((acc, r) => acc + r.easyCount + r.mediumCount + r.hardCount, 0)
    const totalMarks = rules.reduce((acc, r) =>
        acc + (r.easyCount * marksPerDifficulty.easy) +
        (r.mediumCount * marksPerDifficulty.medium) +
        (r.hardCount * marksPerDifficulty.hard),
        0)

    const handleCreateBlueprint = async () => {
        if (!title || !startTime || !endTime || !selectedGroupId) {
            toast.error("Please fill in all general settings")
            return
        }
        if (rules.length === 0) {
            toast.error("Please add at least one topic rule to the blueprint")
            return
        }
        if (totalQuestions === 0) {
            toast.error("The blueprint must include at least 1 question")
            return
        }

        setIsSubmitting(true)
        try {
            // Create the JSON blueprint structure
            const finalBlueprint = rules.map(r => ({
                topic: r.topic,
                easy: r.easyCount,
                medium: r.mediumCount,
                hard: r.hardCount,
                marks_per_difficulty: marksPerDifficulty
            }))

            // 1. Create the Exam
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .insert({
                    title,
                    description,
                    start_time: (new Date(startTime)).toISOString(),
                    end_time: (new Date(endTime)).toISOString(),
                    duration_minutes: durationMinutes,
                    pass_marks: passMarks,
                    blueprint: finalBlueprint,
                    created_by: user?.id
                })
                .select()
                .single()

            if (examError) throw examError

            // 2. Assign to Group
            if (examData) {
                const { error: assignError } = await supabase
                    .from('exam_groups')
                    .insert({
                        exam_id: examData.id,
                        group_id: selectedGroupId
                    })

                if (assignError) throw assignError
            }

            toast.success("Exam Blueprint Created & Assigned Successfully")

            // Reset form
            setRules([])
            setTitle("")
            setDescription("")

        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Failed to create exam")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">

            {/* 1. General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileEdit className="h-5 w-5 text-primary" />
                        General Settings
                    </CardTitle>
                    <CardDescription>Configure the basic details and schedule for this exam.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">

                    <div className="space-y-2 col-span-2">
                        <Label>Exam Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mid-Term Assessment: Computer Vision" />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Assign to Cohort/Group</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Group" />
                            </SelectTrigger>
                            <SelectContent>
                                {groups.map(g => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Duration (Minutes)</Label>
                        <Input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} />
                    </div>

                    <div className="space-y-2">
                        <Label>Start Window</Label>
                        <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>End Window</Label>
                        <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>

                </CardContent>
            </Card>


            {/* 2. Blueprint Builder */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Component className="h-5 w-5 text-primary" />
                                Dynamic Blueprint Engine
                            </CardTitle>
                            <CardDescription>Define rules for the system to auto-generate the exam from the Question Bank.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={handleAddRule} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Topic Rule
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Grading Scale */}
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                        <div className="text-sm font-medium mr-4">Marks per Question:</div>
                        <div className="grid grid-cols-3 gap-4 flex-1">
                            <div>
                                <Label className="text-xs text-muted-foreground">Easy</Label>
                                <Input type="number" value={marksPerDifficulty.easy} onChange={e => setMarksPerDifficulty(p => ({ ...p, easy: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Medium</Label>
                                <Input type="number" value={marksPerDifficulty.medium} onChange={e => setMarksPerDifficulty(p => ({ ...p, medium: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Hard</Label>
                                <Input type="number" value={marksPerDifficulty.hard} onChange={e => setMarksPerDifficulty(p => ({ ...p, hard: Number(e.target.value) }))} />
                            </div>
                        </div>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-4">
                        {rules.map((rule, idx) => {
                            const currentStats = topicStats.find(t => t.topic === rule.topic)

                            return (
                                <div key={rule.id} className="flex items-end gap-4 p-4 border rounded-lg bg-card">
                                    <div className="flex-1 space-y-2">
                                        <Label>Topic Area</Label>
                                        <Select value={rule.topic} onValueChange={(val) => updateRule(rule.id, 'topic', val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-24 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-success">Easy</Label>
                                            <span className="text-[10px] text-muted-foreground">Max {currentStats?.easy || 0}</span>
                                        </div>
                                        <Input type="number" min="0" max={currentStats?.easy || 0} value={rule.easyCount} onChange={e => updateRule(rule.id, 'easyCount', Number(e.target.value))} />
                                    </div>

                                    <div className="w-24 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-warning">Medium</Label>
                                            <span className="text-[10px] text-muted-foreground">Max {currentStats?.medium || 0}</span>
                                        </div>
                                        <Input type="number" min="0" max={currentStats?.medium || 0} value={rule.mediumCount} onChange={e => updateRule(rule.id, 'mediumCount', Number(e.target.value))} />
                                    </div>

                                    <div className="w-24 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-destructive">Hard</Label>
                                            <span className="text-[10px] text-muted-foreground">Max {currentStats?.hard || 0}</span>
                                        </div>
                                        <Input type="number" min="0" max={currentStats?.hard || 0} value={rule.hardCount} onChange={e => updateRule(rule.id, 'hardCount', Number(e.target.value))} />
                                    </div>

                                    <Button variant="ghost" size="icon" className="mb-0.5 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveRule(rule.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )
                        })}

                        {rules.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                No blueprint rules defined yet. Click "Add Topic Rule" to configure the exam content.
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t p-6 bg-muted/10">
                    <div className="flex gap-8">
                        <div>
                            <div className="text-sm font-medium">Total Questions</div>
                            <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium">Total Marks</div>
                            <div className="text-2xl font-bold text-primary">{totalMarks}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-sm font-medium">Passing Marks</div>
                            <div className="flex items-center gap-2">
                                <Input type="number" className="w-20" value={passMarks} onChange={e => setPassMarks(Number(e.target.value))} />
                                <span className="text-xs text-muted-foreground">/ {totalMarks} ({totalMarks > 0 ? Math.round((passMarks / totalMarks) * 100) : 0}%)</span>
                            </div>
                        </div>
                    </div>

                    <Button size="lg" onClick={handleCreateBlueprint} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Publish Global Exam
                    </Button>
                </CardFooter>
            </Card>


        </div>
    )
}
