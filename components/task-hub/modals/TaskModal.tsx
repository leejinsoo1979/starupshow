'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Save,
  Loader2,
  Calendar,
  Tag,
  User,
  Bot,
  Folder,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type {
  Task,
  TaskWithDetails,
  TaskStatus,
  TaskPriority,
  TaskType,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '@/types/task-hub'
import { TASK_STATUS_COLUMNS, TASK_PRIORITIES } from '@/types/task-hub'
import { cn } from '@/lib/utils'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>
  task?: TaskWithDetails | null  // 편집 모드일 때 기존 Task
  initialStatus?: TaskStatus     // 새로 만들 때 초기 상태
  projects?: Array<{ id: string; name: string }>
  agents?: Array<{ id: string; name: string }>
  users?: Array<{ id: string; name: string; email: string }>
}

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  initialStatus = 'TODO',
  projects = [],
  agents = [],
  users = [],
}: TaskModalProps) {
  const isEditing = !!task

  // 폼 상태
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<TaskPriority>('NONE')
  const [type, setType] = useState<TaskType>('PERSONAL')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [assigneeType, setAssigneeType] = useState<'USER' | 'AGENT'>('USER')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Task 데이터로 폼 초기화
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setPriority(task.priority)
      setType(task.type)
      setDueDate(task.due_date?.split('T')[0] || '')
      setEstimatedHours(task.estimated_hours?.toString() || '')
      setAssigneeId(task.assignee_id || '')
      setAssigneeType(task.assignee_type === 'AGENT' ? 'AGENT' : 'USER')
      setProjectId(task.project_id || '')
      setTags(task.tags?.join(', ') || '')
    } else {
      // 새 Task 생성 시 초기화
      setTitle('')
      setDescription('')
      setStatus(initialStatus)
      setPriority('NONE')
      setType('PERSONAL')
      setDueDate('')
      setEstimatedHours('')
      setAssigneeId('')
      setAssigneeType('USER')
      setProjectId('')
      setTags('')
    }
    setError('')
  }, [task, initialStatus, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    setIsSaving(true)

    try {
      const data: CreateTaskRequest | UpdateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        type,
        due_date: dueDate || undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        assignee_id: assigneeId || undefined,
        assignee_type: assigneeId ? assigneeType : undefined,
        project_id: projectId || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }

      await onSave(data)
      onClose()
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.')
      console.error('[TaskModal] Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            {isEditing ? 'Task 수정' : '새 Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task 제목을 입력하세요"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent focus:border-transparent"
                autoFocus
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상세 설명 (선택사항)"
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
              />
            </div>

            {/* 상태 & 우선순위 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  상태
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                >
                  {TASK_STATUS_COLUMNS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  우선순위
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                >
                  {TASK_PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 마감일 & 예상 시간 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  마감일
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Clock className="w-4 h-4" />
                  예상 시간 (시간)
                </label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* 담당자 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                담당자
              </label>
              <div className="flex gap-2">
                {/* 담당자 유형 선택 */}
                <div className="flex border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setAssigneeType('USER'); setAssigneeId('') }}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                      assigneeType === 'USER'
                        ? 'bg-accent text-white'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    )}
                  >
                    <User className="w-4 h-4" />
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssigneeType('AGENT'); setAssigneeId('') }}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 text-sm transition-colors',
                      assigneeType === 'AGENT'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    )}
                  >
                    <Bot className="w-4 h-4" />
                    Agent
                  </button>
                </div>

                {/* 담당자 선택 */}
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                >
                  <option value="">미할당</option>
                  {assigneeType === 'USER'
                    ? users.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))
                    : agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))
                  }
                </select>
              </div>
            </div>

            {/* 프로젝트 */}
            {projects.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  <Folder className="w-4 h-4" />
                  프로젝트
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
                >
                  <option value="">프로젝트 없음</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 태그 */}
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                <Tag className="w-4 h-4" />
                태그
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="쉼표로 구분 (예: frontend, urgent)"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? '수정' : '생성'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
