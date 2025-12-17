'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  MarkerType,
  NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, Sparkles, Loader2, RefreshCw, Play, LayoutGrid, Bot, User, Calendar, Flag, MessageSquare, Pencil, Trash2, Save, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkflowNode } from './WorkflowNode'
import { WorkflowStartNode } from './WorkflowStartNode'
import { WorkflowEndNode } from './WorkflowEndNode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import type { ProjectTaskWithAssignee, ProjectTaskStatus } from '@/types/database'

interface WorkflowCanvasProps {
  projectId: string
  className?: string
}

const nodeTypes: NodeTypes = {
  taskNode: WorkflowNode,
  startNode: WorkflowStartNode,
  endNode: WorkflowEndNode,
}

const STATUS_ORDER: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED']

export function WorkflowCanvas({ projectId, className }: WorkflowCanvasProps) {
  const [tasks, setTasks] = useState<ProjectTaskWithAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedTask, setSelectedTask] = useState<ProjectTaskWithAssignee | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '' })

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Convert tasks to nodes and edges - n8n style clean layout
  useEffect(() => {
    const NODE_WIDTH = 280
    const NODE_HEIGHT = 240
    const HORIZONTAL_GAP = 150
    const VERTICAL_GAP = 80
    const START_X = 100
    const CENTER_Y = 350

    if (tasks.length === 0) {
      // Show empty state with start and end node on same horizontal line
      setNodes([
        {
          id: 'start',
          type: 'startNode',
          position: { x: START_X, y: CENTER_Y },
          data: { label: '시작' },
        },
        {
          id: 'end',
          type: 'endNode',
          position: { x: START_X + 400, y: CENTER_Y },
          data: { label: '완료' },
        },
      ])
      setEdges([
        {
          id: 'start-end',
          source: 'start',
          target: 'end',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' },
        },
      ])
      return
    }

    // Group tasks by status (only active statuses)
    const activeStatuses: ProjectTaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
    const tasksByStatus: Record<ProjectTaskStatus, ProjectTaskWithAssignee[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
      CANCELLED: [],
    }
    tasks.forEach(task => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task)
      }
    })

    // Calculate total height needed
    const maxTasksInColumn = Math.max(
      ...activeStatuses.map(status => tasksByStatus[status].length),
      1
    )
    const totalHeight = maxTasksInColumn * NODE_HEIGHT + (maxTasksInColumn - 1) * VERTICAL_GAP

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Add start node - centered vertically
    newNodes.push({
      id: 'start',
      type: 'startNode',
      position: { x: START_X, y: CENTER_Y },
      data: { label: '시작' },
    })

    let currentX = START_X + 80 + HORIZONTAL_GAP
    let previousColumnNodeIds: string[] = ['start']

    // Process each status column
    activeStatuses.forEach((status, statusIndex) => {
      const statusTasks = tasksByStatus[status]
      if (statusTasks.length === 0) return

      const columnNodeIds: string[] = []
      const columnHeight = statusTasks.length * NODE_HEIGHT + (statusTasks.length - 1) * VERTICAL_GAP
      const startY = CENTER_Y - columnHeight / 2 + NODE_HEIGHT / 2

      statusTasks.forEach((task, taskIndex) => {
        const nodeId = `task-${task.id}`
        const yPos = startY + taskIndex * (NODE_HEIGHT + VERTICAL_GAP)

        newNodes.push({
          id: nodeId,
          type: 'taskNode',
          position: { x: currentX, y: yPos },
          data: {
            task,
            onStatusChange: handleStatusChange,
            onExecute: handleExecuteTask,
            onClick: handleTaskClick,
          },
        })

        columnNodeIds.push(nodeId)
      })

      // Connect edges from previous column to current column
      if (previousColumnNodeIds.length > 0 && columnNodeIds.length > 0) {
        // For cleaner look: connect center nodes or first nodes
        const sourceIndex = Math.floor((previousColumnNodeIds.length - 1) / 2)
        const targetIndex = Math.floor((columnNodeIds.length - 1) / 2)

        const isAnimated = status === 'IN_PROGRESS'
        const edgeColor = status === 'DONE' ? '#22c55e' : '#6366f1'

        // Connect each previous node to the corresponding current node (or center)
        previousColumnNodeIds.forEach((sourceId, idx) => {
          const targetId = columnNodeIds[Math.min(idx, columnNodeIds.length - 1)]
          newEdges.push({
            id: `${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: isAnimated,
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
            style: { stroke: edgeColor, strokeWidth: 2 },
          })
        })
      }

      previousColumnNodeIds = columnNodeIds
      currentX += NODE_WIDTH + HORIZONTAL_GAP
    })

    // Add end node
    const endX = currentX
    newNodes.push({
      id: 'end',
      type: 'endNode',
      position: { x: endX, y: CENTER_Y },
      data: { label: '완료' },
    })

    // Connect last column to end
    if (previousColumnNodeIds.length > 0 && previousColumnNodeIds[0] !== 'start') {
      previousColumnNodeIds.forEach(nodeId => {
        newEdges.push({
          id: `${nodeId}-end`,
          source: nodeId,
          target: 'end',
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
          style: { stroke: '#22c55e', strokeWidth: 2 },
        })
      })
    } else {
      // Direct connection from start to end
      newEdges.push({
        id: 'start-end',
        source: 'start',
        target: 'end',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' },
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [tasks])

  // Handle status change
  const handleStatusChange = async (taskId: string, newStatus: ProjectTaskStatus) => {
    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (error) {
      console.error('Failed to update task status:', error)
      fetchTasks()
    }
  }

  // Handle agent execute
  const handleExecuteTask = async (task: ProjectTaskWithAssignee) => {
    if (!task.assignee_agent_id) return

    try {
      await fetch(`/api/projects/${projectId}/tasks/${task.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee_type: 'agent',
          assignee_agent_id: task.assignee_agent_id,
          auto_execute: true,
        }),
      })

      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, agent_executed_at: new Date().toISOString() } : t
        )
      )
    } catch (error) {
      console.error('Failed to execute task:', error)
    }
  }

  // Generate workflow with AI
  const handleGenerateWorkflow = async () => {
    if (generating) return

    const confirmed =
      tasks.length > 0
        ? window.confirm(
            '기존 태스크를 유지하고 새 워크플로우를 추가할까요? (취소를 누르면 기존 태스크를 삭제합니다)'
          )
        : true

    setGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clear_existing: tasks.length > 0 && !confirmed,
        }),
      })

      if (res.ok) {
        await fetchTasks()
      } else {
        const error = await res.json()
        alert(error.error || '워크플로우 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to generate workflow:', error)
      alert('워크플로우 생성에 실패했습니다')
    } finally {
      setGenerating(false)
    }
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  )

  // Handle task click - open modal
  const handleTaskClick = useCallback((task: ProjectTaskWithAssignee) => {
    setSelectedTask(task)
    setEditForm({ title: task.title, description: task.description || '' })
    setIsEditing(false)
  }, [])

  // Handle task update
  const handleUpdateTask = async () => {
    if (!selectedTask) return

    try {
      await fetch(`/api/projects/${projectId}/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      setTasks(prev =>
        prev.map(t => (t.id === selectedTask.id ? { ...t, ...editForm } : t))
      )
      setSelectedTask(prev => prev ? { ...prev, ...editForm } : null)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  // Handle task delete
  const handleDeleteTask = async () => {
    if (!selectedTask || !confirm('정말 삭제하시겠습니까?')) return

    try {
      await fetch(`/api/projects/${projectId}/tasks/${selectedTask.id}`, {
        method: 'DELETE',
      })

      setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
      setSelectedTask(null)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-[600px]', className)}>
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-[800px] rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              워크플로우
            </span>
          </div>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {tasks.length}개 태스크
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateWorkflow}
            disabled={generating}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25',
              'hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02]',
              generating && 'opacity-50 cursor-not-allowed'
            )}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI 워크플로우 생성
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="bg-zinc-50 dark:bg-zinc-950"
            color="#a1a1aa40"
          />
          <Controls
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg"
            showInteractive={false}
          />
          <Panel position="bottom-left" className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <span>할 일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span>진행 중</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>검토</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>완료</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden" showClose={false}>
          {selectedTask && (
            <>
              {/* Header */}
              <DialogHeader className="p-0 border-0">
                <div className="flex items-center gap-4 px-6 pt-6 pb-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    selectedTask.status === 'DONE' ? 'bg-success-500/10 text-success-500' :
                    selectedTask.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                    selectedTask.status === 'REVIEW' ? 'bg-amber-500/10 text-amber-500' :
                    selectedTask.status === 'CANCELLED' ? 'bg-danger-500/10 text-danger-500' :
                    'bg-zinc-500/10 text-zinc-500'
                  )}>
                    {selectedTask.status === 'DONE' ? <CheckCircle2 className="w-6 h-6" /> :
                     selectedTask.status === 'IN_PROGRESS' ? <Play className="w-6 h-6" /> :
                     selectedTask.status === 'REVIEW' ? <AlertCircle className="w-6 h-6" /> :
                     selectedTask.status === 'CANCELLED' ? <XCircle className="w-6 h-6" /> :
                     <Clock className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full text-lg font-semibold bg-transparent border-b-2 border-accent focus:outline-none text-zinc-900 dark:text-zinc-100"
                        autoFocus
                      />
                    ) : (
                      <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
                    )}
                    <DialogDescription className="mt-1">
                      {selectedTask.assignee_agent ? `AI 에이전트: ${selectedTask.assignee_agent.name}` :
                       selectedTask.assignee_user ? `담당자: ${selectedTask.assignee_user.name || selectedTask.assignee_user.email}` :
                       '담당자 미배정'}
                    </DialogDescription>
                  </div>
                  <DialogClose className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" />
                </div>
              </DialogHeader>

              {/* Body */}
              <DialogBody className="space-y-6 max-h-[50vh] overflow-y-auto">
                {/* Status & Priority */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedTask.status}
                    onChange={e => {
                      handleStatusChange(selectedTask.id, e.target.value as ProjectTaskStatus)
                      setSelectedTask(prev => prev ? { ...prev, status: e.target.value as ProjectTaskStatus } : null)
                    }}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="TODO">할 일</option>
                    <option value="IN_PROGRESS">진행 중</option>
                    <option value="REVIEW">검토</option>
                    <option value="DONE">완료</option>
                    <option value="CANCELLED">취소</option>
                  </select>

                  <div className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2',
                    selectedTask.priority === 'URGENT' ? 'bg-danger-500/10 text-danger-500' :
                    selectedTask.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                    selectedTask.priority === 'MEDIUM' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-zinc-500/10 text-zinc-500'
                  )}>
                    <Flag className="w-4 h-4" />
                    {selectedTask.priority === 'URGENT' ? '긴급' :
                     selectedTask.priority === 'HIGH' ? '높음' :
                     selectedTask.priority === 'MEDIUM' ? '중간' : '낮음'}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <MessageSquare className="w-4 h-4" />
                    설명
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors resize-none text-zinc-700 dark:text-zinc-300"
                      placeholder="태스크 설명을 입력하세요..."
                    />
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedTask.description || '설명이 없습니다.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Assignee Card */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                      {selectedTask.assignee_agent ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      담당자
                    </label>
                    {selectedTask.assignee_agent ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{selectedTask.assignee_agent.name}</p>
                          <p className="text-xs text-zinc-500">AI Agent</p>
                        </div>
                      </div>
                    ) : selectedTask.assignee_user ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{selectedTask.assignee_user.name || selectedTask.assignee_user.email}</p>
                          <p className="text-xs text-zinc-500">Team Member</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400">미배정</p>
                    )}
                  </div>

                  {/* Date Card */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      일정
                    </label>
                    <div className="space-y-2">
                      {selectedTask.start_date && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">시작</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {new Date(selectedTask.start_date).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}
                      {selectedTask.due_date && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500">마감</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {new Date(selectedTask.due_date).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      )}
                      {!selectedTask.start_date && !selectedTask.due_date && (
                        <p className="text-sm text-zinc-400">일정 미설정</p>
                      )}
                    </div>
                  </div>
                </div>
              </DialogBody>

              {/* Footer */}
              <DialogFooter className="justify-between">
                <Button variant="danger" size="sm" onClick={handleDeleteTask} leftIcon={<Trash2 className="w-4 h-4" />}>
                  삭제
                </Button>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        취소
                      </Button>
                      <Button variant="accent" size="sm" onClick={handleUpdateTask} leftIcon={<Save className="w-4 h-4" />}>
                        저장
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} leftIcon={<Pencil className="w-4 h-4" />}>
                      수정
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
