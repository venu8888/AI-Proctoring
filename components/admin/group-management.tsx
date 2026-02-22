"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Loader2, Plus, Users, UserPlus, Trash2 } from "lucide-react"

type Profile = {
    id: string
    full_name: string
    email: string
}

type Group = {
    id: string
    name: string
    created_at: string
    students: Profile[]
}

export function GroupManagement() {
    const { user } = useAuth()
    const [groups, setGroups] = useState<Group[]>([])
    const [availableStudents, setAvailableStudents] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Create Group State
    const [newGroupName, setNewGroupName] = useState("")
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)

    // Add Student State
    const [selectedGroupId, setSelectedGroupId] = useState<string>("")
    const [selectedStudentId, setSelectedStudentId] = useState<string>("")
    const [isAddingStudent, setIsAddingStudent] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Groups with their students
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select(`
          id,
          name,
          created_at,
          group_students (
            student_id,
            profiles (
              id,
              full_name,
              email
            )
          )
        `)
                .order('created_at', { ascending: false })

            if (groupsError) throw groupsError

            // Format the nested response
            const formattedGroups: Group[] = (groupsData || []).map(g => ({
                id: g.id,
                name: g.name,
                created_at: g.created_at,
                // @ts-ignore - Supabase nested types are tricky
                students: g.group_students?.map((gs: any) => gs.profiles).filter(Boolean) || []
            }))

            setGroups(formattedGroups)

            // 2. Fetch all students to add
            const { data: studentsData, error: studentsError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'student')

            if (studentsError) throw studentsError
            setAvailableStudents(studentsData || [])

        } catch (error: any) {
            console.error("Error fetching data:", error)
            toast.error("Failed to load groups")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user) return

        setIsCreatingGroup(true)
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error

            toast.success("Group created successfully")
            setNewGroupName("")
            setCreateDialogOpen(false)
            fetchData() // Refresh list

        } catch (error: any) {
            console.error("Error creating group:", error)
            toast.error(error.message || "Failed to create group")
        } finally {
            setIsCreatingGroup(false)
        }
    }

    const handleAddStudent = async (groupId: string) => {
        if (!selectedStudentId) {
            toast.error("Please select a student")
            return
        }

        setIsAddingStudent(true)
        try {
            // Check if already in group
            const targetGroup = groups.find(g => g.id === groupId)
            if (targetGroup?.students.some(s => s.id === selectedStudentId)) {
                toast.error("Student is already in this group")
                setIsAddingStudent(false)
                return
            }

            const { error } = await supabase
                .from('group_students')
                .insert({
                    group_id: groupId,
                    student_id: selectedStudentId
                })

            if (error) throw error

            toast.success("Student added to group")
            setSelectedStudentId("") // Reset selection
            fetchData() // Refresh list

        } catch (error: any) {
            console.error("Error adding student:", error)
            toast.error(error.message || "Failed to add student")
        } finally {
            setIsAddingStudent(false)
        }
    }

    const handleRemoveStudent = async (groupId: string, studentId: string) => {
        if (!confirm("Remove this student from the group?")) return

        try {
            const { error } = await supabase
                .from('group_students')
                .delete()
                .match({ group_id: groupId, student_id: studentId })

            if (error) throw error
            toast.success("Student removed")
            fetchData()
        } catch (error: any) {
            console.error("Error removing student", error)
            toast.error("Failed to remove student")
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Group Management</h2>
                    <p className="text-muted-foreground">Manage student cohorts for exam assignments.</p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                            <DialogDescription>
                                Create a new cohort to easily assign exams to multiple students at once.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Group Name</Label>
                                <Input
                                    placeholder="e.g. AIML Batch 2024"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateGroup} disabled={isCreatingGroup || !newGroupName.trim()}>
                                {isCreatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Group
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {groups.map((group) => (
                    <Card key={group.id} className="flex flex-col">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    {group.name}
                                </CardTitle>
                                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                    {group.students.length} Students
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 flex flex-col">

                            {/* Add Student Form */}
                            <div className="flex gap-2 mb-4">
                                <Select value={selectedGroupId === group.id ? selectedStudentId : ""} onValueChange={(val) => {
                                    setSelectedGroupId(group.id)
                                    setSelectedStudentId(val)
                                }}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select student to add" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableStudents.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.full_name} ({student.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => handleAddStudent(group.id)}
                                    disabled={isAddingStudent || selectedGroupId !== group.id || !selectedStudentId}
                                >
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Student List */}
                            <div className="border rounded-md overflow-hidden flex-1 max-h-64 overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0">
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.students.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                                    No students in this group yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            group.students.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{student.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleRemoveStudent(group.id, student.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                        </CardContent>
                    </Card>
                ))}

                {groups.length === 0 && !isLoading && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border bg-muted/20">
                        <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-1">No Groups Found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                            Create your first student cohort to start assigning exams.
                        </p>
                        <Button onClick={() => setCreateDialogOpen(true)}>Create First Group</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
