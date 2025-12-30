'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  TaskWithDetails,
  TaskStatus,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskViewType,
} from '@/types/task-hub'

interface UseTaskHubOptions {
  companyId?: string
  projectId?: string
  initialView?: TaskViewType
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseTaskHubReturn {
  tasks: TaskWithDetails[]
  isLoading: boolean
  error: string | null
  view: TaskViewType
  filters: TaskFilters
  selectedTask: TaskWithDetails | null

  // 액션
  setView: (view: TaskViewType) => void
  setFilters: (filters: Partial<TaskFilters>) => void
  selectTask: (task: TaskWithDetails | null) => void
  fetchTasks: () => Promise<void>
  createTask: (data: CreateTaskRequest) => Promise<TaskWithDetails | null>
  updateTask: (id: string, data: UpdateTaskRequest) => Promise<TaskWithDetails | null>
  deleteTask: (id: string) => Promise<boolean>
  moveTask: (taskId: string, newStatus: TaskStatus, newPosition: number) => Promise<void>
  reorderTasks: (updates: Array<{ id: string; status: TaskStatus; position: number }>) => Promise<void>
}

export function useTaskHub(options: UseTaskHubOptions = {}): UseTaskHubReturn {
  const {
    companyId,
    projectId,
    initialView = 'kanban',
    autoRefresh = false,
    refreshInterval = 30000,
  } = options

  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<TaskViewType>(initialView)
  const [filters, setFiltersState] = useState<TaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)

  // 필터 업데이트
  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Task 선택
  const selectTask = useCallback((task: TaskWithDetails | null) => {
    setSelectedTask(task)
  }, [])

  // Task 목록 조회
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (companyId) params.set('company_id', companyId)
      if (projectId) params.set('project_id', projectId)
      if (view) params.set('view', view)

      // 필터 적용
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status.join(',') : filters.status
        params.set('status', statuses)
      }
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority
        params.set('priority', priorities)
      }
      if (filters.type) params.set('type', filters.type)
      if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
      if (filters.search) params.set('search', filters.search)
      if (filters.due_date_from) params.set('due_date_from', filters.due_date_from)
      if (filters.due_date_to) params.set('due_date_to', filters.due_date_to)
      if (filters.tags?.length) params.set('tags', filters.tags.join(','))

      // 최상위 Task만 조회 (하위 Task는 parent_task_id로 별도 조회)
      params.set('parent_task_id', 'null')
      params.set('limit', '200')

      const response = await fetch(`/api/task-hub?${params.toString()}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Task 조회 실패')
      }

      setTasks(result.data.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Task 조회 중 오류가 발생했습니다.'
      setError(message)
      console.error('[useTaskHub] fetchTasks error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, projectId, view, filters])

  // Task 생성
  const createTask = useCallback(async (data: CreateTaskRequest): Promise<TaskWithDetails | null> => {
    try {
      const requestData = {
        ...data,
        company_id: companyId,
        project_id: projectId || data.project_id,
      }

      const response = await fetch('/api/task-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Task 생성 실패')
      }

      // 로컬 상태에 추가
      setTasks(prev => [...prev, result.data])
      return result.data
    } catch (err) {
      console.error('[useTaskHub] createTask error:', err)
      throw err
    }
  }, [companyId, projectId])

  // Task 수정
  const updateTask = useCallback(async (id: string, data: UpdateTaskRequest): Promise<TaskWithDetails | null> => {
    try {
      const response = await fetch(`/api/task-hub/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Task 수정 실패')
      }

      // 로컬 상태 업데이트
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...result.data } : t))

      // 선택된 Task 업데이트
      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, ...result.data })
      }

      return result.data
    } catch (err) {
      console.error('[useTaskHub] updateTask error:', err)
      throw err
    }
  }, [selectedTask])

  // Task 삭제
  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/task-hub/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Task 삭제 실패')
      }

      // 로컬 상태에서 제거
      setTasks(prev => prev.filter(t => t.id !== id))

      // 선택 해제
      if (selectedTask?.id === id) {
        setSelectedTask(null)
      }

      return true
    } catch (err) {
      console.error('[useTaskHub] deleteTask error:', err)
      throw err
    }
  }, [selectedTask])

  // Task 이동 (드래그앤드롭)
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    // Optimistic update
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId)
      if (taskIndex === -1) return prev

      const task = prev[taskIndex]
      const updated = [...prev]

      // 기존 위치에서 제거
      updated.splice(taskIndex, 1)

      // 새 상태의 Task들 position 재계산
      const sameStatusTasks = updated.filter(t => t.status === newStatus)

      // 새 위치에 삽입
      const insertIndex = updated.findIndex(
        t => t.status === newStatus && t.position >= newPosition
      )

      const updatedTask = {
        ...task,
        status: newStatus,
        position: newPosition,
      }

      if (insertIndex === -1) {
        updated.push(updatedTask)
      } else {
        updated.splice(insertIndex, 0, updatedTask)
      }

      return updated
    })

    // 서버에 업데이트
    try {
      await updateTask(taskId, { status: newStatus, position: newPosition })
    } catch (err) {
      // 실패 시 다시 조회
      fetchTasks()
    }
  }, [updateTask, fetchTasks])

  // 일괄 위치 변경
  const reorderTasks = useCallback(async (
    updates: Array<{ id: string; status: TaskStatus; position: number }>
  ) => {
    try {
      const response = await fetch('/api/task-hub/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          tasks: updates,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '위치 변경 실패')
      }

      // 로컬 상태 업데이트
      setTasks(prev => {
        const updateMap = new Map(updates.map(u => [u.id, u]))
        return prev.map(t => {
          const update = updateMap.get(t.id)
          if (update) {
            return { ...t, status: update.status, position: update.position }
          }
          return t
        })
      })
    } catch (err) {
      console.error('[useTaskHub] reorderTasks error:', err)
      fetchTasks()
    }
  }, [fetchTasks])

  // 초기 로드 및 필터 변경 시 재조회
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchTasks, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchTasks])

  return {
    tasks,
    isLoading,
    error,
    view,
    filters,
    selectedTask,
    setView,
    setFilters,
    selectTask,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTasks,
  }
}
