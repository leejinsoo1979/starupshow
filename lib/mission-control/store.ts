/**
 * Mission Control - Zustand Store
 *
 * 멀티 에이전트 오케스트레이션 상태 관리
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  AgentRole,
  AgentState,
  AgentStatus,
  Mission,
  MissionStatus,
  Task,
  TaskStatus,
  Artifact,
  MissionEvent,
  MissionControlSettings,
  MissionAnalysis,
  TaskCreateInput,
} from './types'

// ============================================================================
// Initial States
// ============================================================================

const initialAgentState = (role: AgentRole): AgentState => ({
  role,
  status: 'idle',
  progress: 0,
  tokenUsage: 0,
})

const initialAgents: Record<AgentRole, AgentState> = {
  orchestrator: initialAgentState('orchestrator'),
  planner: initialAgentState('planner'),
  implementer: initialAgentState('implementer'),
  tester: initialAgentState('tester'),
  reviewer: initialAgentState('reviewer'),
}

const initialSettings: MissionControlSettings = {
  maxConcurrentTasks: 3,
  autoApprove: true,
  defaultModel: 'gemini-2.0-flash-exp',
  showThinking: true,
  soundEnabled: false,
}

// ============================================================================
// Store Interface
// ============================================================================

interface MissionControlStore {
  // State
  currentMission: Mission | null
  agents: Record<AgentRole, AgentState>
  events: MissionEvent[]
  isLoading: boolean
  error: string | null
  settings: MissionControlSettings

  // Mission Actions
  createMission: (userRequest: string) => Mission
  updateMission: (updates: Partial<Mission>) => void
  setMissionStatus: (status: MissionStatus) => void
  setMissionAnalysis: (analysis: MissionAnalysis) => void
  completeMission: () => void
  failMission: (error: string) => void
  cancelMission: () => void
  clearMission: () => void

  // Task Actions
  addTask: (input: TaskCreateInput) => Task
  addTasks: (inputs: TaskCreateInput[]) => Task[]
  updateTask: (taskId: string, updates: Partial<Task>) => void
  setTaskStatus: (taskId: string, status: TaskStatus) => void
  completeTask: (taskId: string, output: string, artifacts?: string[]) => void
  failTask: (taskId: string, error: string) => void
  getTask: (taskId: string) => Task | undefined
  getReadyTasks: () => Task[]
  getPendingTasks: () => Task[]
  getCompletedTasks: () => Task[]

  // Agent Actions
  setAgentStatus: (role: AgentRole, status: AgentStatus, message?: string) => void
  setAgentProgress: (role: AgentRole, progress: number) => void
  setAgentTask: (role: AgentRole, taskId: string | undefined) => void
  setAgentError: (role: AgentRole, error: string) => void
  resetAgent: (role: AgentRole) => void
  resetAllAgents: () => void

  // Artifact Actions
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => Artifact
  updateArtifact: (artifactId: string, updates: Partial<Artifact>) => void
  getArtifact: (artifactId: string) => Artifact | undefined
  getArtifactsByTask: (taskId: string) => Artifact[]
  getArtifactsByType: (type: Artifact['type']) => Artifact[]

  // Event Actions
  addEvent: (event: Omit<MissionEvent, 'timestamp'>) => void
  clearEvents: () => void

  // Settings Actions
  updateSettings: (updates: Partial<MissionControlSettings>) => void

  // Utility Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Computed
  getMissionProgress: () => number
  getActiveAgents: () => AgentRole[]
  canStartNewTask: () => boolean
  updateMissionProgress: () => void
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// ============================================================================
// Store Implementation
// ============================================================================

export const useMissionControlStore = create<MissionControlStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        currentMission: null,
        agents: initialAgents,
        events: [],
        isLoading: false,
        error: null,
        settings: initialSettings,

        // ========================================================================
        // Mission Actions
        // ========================================================================

        createMission: (userRequest: string) => {
          const mission: Mission = {
            id: generateId(),
            userRequest,
            status: 'created',
            tasks: [],
            artifacts: [],
            progress: 0,
            currentPhase: '미션 생성됨',
            createdAt: Date.now(),
            totalTokensUsed: 0,
            estimatedCost: 0,
          }

          set((state) => {
            state.currentMission = mission
            state.events = []
            state.error = null
          })

          get().addEvent({
            type: 'mission:created',
            missionId: mission.id,
            data: { userRequest },
          })

          return mission
        },

        updateMission: (updates: Partial<Mission>) => {
          set((state) => {
            if (state.currentMission) {
              Object.assign(state.currentMission, updates)
            }
          })
        },

        setMissionStatus: (status: MissionStatus) => {
          set((state) => {
            if (state.currentMission) {
              state.currentMission.status = status

              if (status === 'executing') {
                state.currentMission.startedAt = Date.now()
              }
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: status === 'completed' ? 'mission:completed' : 'mission:progress',
              missionId: mission.id,
              data: { status },
            })
          }
        },

        setMissionAnalysis: (analysis: MissionAnalysis) => {
          set((state) => {
            if (state.currentMission) {
              state.currentMission.analysis = analysis
              state.currentMission.status = 'planning'
              state.currentMission.currentPhase = '태스크 계획 수립'
            }
          })
        },

        completeMission: () => {
          set((state) => {
            if (state.currentMission) {
              state.currentMission.status = 'completed'
              state.currentMission.progress = 100
              state.currentMission.completedAt = Date.now()
              state.currentMission.currentPhase = '미션 완료'
            }
          })

          get().resetAllAgents()

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'mission:completed',
              missionId: mission.id,
              data: { completedAt: Date.now() },
            })
          }
        },

        failMission: (error: string) => {
          set((state) => {
            if (state.currentMission) {
              state.currentMission.status = 'failed'
              state.currentMission.currentPhase = '미션 실패'
            }
            state.error = error
          })

          get().resetAllAgents()

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'mission:failed',
              missionId: mission.id,
              data: { error },
            })
          }
        },

        cancelMission: () => {
          set((state) => {
            if (state.currentMission) {
              state.currentMission.status = 'cancelled'
              state.currentMission.currentPhase = '미션 취소됨'
            }
          })

          get().resetAllAgents()
        },

        clearMission: () => {
          set((state) => {
            state.currentMission = null
            state.events = []
            state.error = null
          })

          get().resetAllAgents()
        },

        // ========================================================================
        // Task Actions
        // ========================================================================

        addTask: (input: TaskCreateInput) => {
          const task: Task = {
            id: generateId(),
            missionId: get().currentMission?.id || '',
            type: input.type,
            assignedAgent: input.assignedAgent,
            status: 'pending',
            priority: input.priority || 'medium',
            title: input.title,
            description: input.description,
            input: input.input,
            dependencies: input.dependencies || [],
            dependents: [],
            artifacts: [],
            retryCount: 0,
            maxRetries: 3,
            createdAt: Date.now(),
          }

          set((state) => {
            if (state.currentMission) {
              state.currentMission.tasks.push(task)

              // Update dependents for dependency tasks
              task.dependencies.forEach((depId) => {
                const depTask = state.currentMission!.tasks.find((t) => t.id === depId)
                if (depTask && !depTask.dependents.includes(task.id)) {
                  depTask.dependents.push(task.id)
                }
              })
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'task:created',
              missionId: mission.id,
              data: { task },
            })
          }

          return task
        },

        addTasks: (inputs: TaskCreateInput[]) => {
          return inputs.map((input) => get().addTask(input))
        },

        updateTask: (taskId: string, updates: Partial<Task>) => {
          set((state) => {
            if (state.currentMission) {
              const task = state.currentMission.tasks.find((t) => t.id === taskId)
              if (task) {
                Object.assign(task, updates)
              }
            }
          })
        },

        setTaskStatus: (taskId: string, status: TaskStatus) => {
          set((state) => {
            if (state.currentMission) {
              const task = state.currentMission.tasks.find((t) => t.id === taskId)
              if (task) {
                task.status = status
                if (status === 'in_progress') {
                  task.startedAt = Date.now()
                }
              }
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: status === 'in_progress' ? 'task:started' : 'task:progress',
              missionId: mission.id,
              data: { taskId, status },
            })
          }

          // Update mission progress
          get().updateMissionProgress()
        },

        completeTask: (taskId: string, output: string, artifacts?: string[]) => {
          set((state) => {
            if (state.currentMission) {
              const task = state.currentMission.tasks.find((t) => t.id === taskId)
              if (task) {
                task.status = 'completed'
                task.output = output
                task.completedAt = Date.now()
                if (artifacts) {
                  task.artifacts = artifacts
                }
              }
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'task:completed',
              missionId: mission.id,
              data: { taskId, output },
            })
          }

          // Update mission progress
          get().updateMissionProgress()
        },

        failTask: (taskId: string, error: string) => {
          set((state) => {
            if (state.currentMission) {
              const task = state.currentMission.tasks.find((t) => t.id === taskId)
              if (task) {
                task.status = 'failed'
                task.error = error
                task.completedAt = Date.now()
              }
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'task:failed',
              missionId: mission.id,
              data: { taskId, error },
            })
          }
        },

        getTask: (taskId: string) => {
          return get().currentMission?.tasks.find((t) => t.id === taskId)
        },

        getReadyTasks: () => {
          const mission = get().currentMission
          if (!mission) return []

          return mission.tasks.filter((task) => {
            if (task.status !== 'pending') return false

            // Check if all dependencies are completed
            return task.dependencies.every((depId) => {
              const depTask = mission.tasks.find((t) => t.id === depId)
              return depTask?.status === 'completed'
            })
          })
        },

        getPendingTasks: () => {
          return get().currentMission?.tasks.filter((t) => t.status === 'pending') || []
        },

        getCompletedTasks: () => {
          return get().currentMission?.tasks.filter((t) => t.status === 'completed') || []
        },

        // ========================================================================
        // Agent Actions
        // ========================================================================

        setAgentStatus: (role: AgentRole, status: AgentStatus, message?: string) => {
          set((state) => {
            state.agents[role].status = status
            if (message) {
              state.agents[role].lastMessage = message
            }
            if (status === 'working') {
              state.agents[role].startedAt = Date.now()
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'agent:status',
              missionId: mission.id,
              data: { role, status, message },
            })
          }
        },

        setAgentProgress: (role: AgentRole, progress: number) => {
          set((state) => {
            state.agents[role].progress = Math.min(100, Math.max(0, progress))
          })
        },

        setAgentTask: (role: AgentRole, taskId: string | undefined) => {
          set((state) => {
            state.agents[role].currentTaskId = taskId
          })
        },

        setAgentError: (role: AgentRole, error: string) => {
          set((state) => {
            state.agents[role].status = 'error'
            state.agents[role].error = error
          })
        },

        resetAgent: (role: AgentRole) => {
          set((state) => {
            state.agents[role] = initialAgentState(role)
          })
        },

        resetAllAgents: () => {
          set((state) => {
            state.agents = { ...initialAgents }
          })
        },

        // ========================================================================
        // Artifact Actions
        // ========================================================================

        addArtifact: (input: Omit<Artifact, 'id' | 'createdAt'>) => {
          const artifact: Artifact = {
            ...input,
            id: generateId(),
            createdAt: Date.now(),
          }

          set((state) => {
            if (state.currentMission) {
              state.currentMission.artifacts.push(artifact)
            }
          })

          const mission = get().currentMission
          if (mission) {
            get().addEvent({
              type: 'artifact:created',
              missionId: mission.id,
              data: { artifact },
            })
          }

          return artifact
        },

        updateArtifact: (artifactId: string, updates: Partial<Artifact>) => {
          set((state) => {
            if (state.currentMission) {
              const artifact = state.currentMission.artifacts.find((a) => a.id === artifactId)
              if (artifact) {
                Object.assign(artifact, updates, { updatedAt: Date.now() })
              }
            }
          })
        },

        getArtifact: (artifactId: string) => {
          return get().currentMission?.artifacts.find((a) => a.id === artifactId)
        },

        getArtifactsByTask: (taskId: string) => {
          return get().currentMission?.artifacts.filter((a) => a.taskId === taskId) || []
        },

        getArtifactsByType: (type: Artifact['type']) => {
          return get().currentMission?.artifacts.filter((a) => a.type === type) || []
        },

        // ========================================================================
        // Event Actions
        // ========================================================================

        addEvent: (event: Omit<MissionEvent, 'timestamp'>) => {
          const fullEvent: MissionEvent = {
            ...event,
            timestamp: Date.now(),
          }

          set((state) => {
            state.events.push(fullEvent)
            // Keep only last 100 events
            if (state.events.length > 100) {
              state.events = state.events.slice(-100)
            }
          })
        },

        clearEvents: () => {
          set((state) => {
            state.events = []
          })
        },

        // ========================================================================
        // Settings Actions
        // ========================================================================

        updateSettings: (updates: Partial<MissionControlSettings>) => {
          set((state) => {
            Object.assign(state.settings, updates)
          })
        },

        // ========================================================================
        // Utility Actions
        // ========================================================================

        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading
          })
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error
          })
        },

        reset: () => {
          set((state) => {
            state.currentMission = null
            state.agents = { ...initialAgents }
            state.events = []
            state.isLoading = false
            state.error = null
          })
        },

        // ========================================================================
        // Computed (Helper Methods)
        // ========================================================================

        getMissionProgress: () => {
          const mission = get().currentMission
          if (!mission || mission.tasks.length === 0) return 0

          const completed = mission.tasks.filter((t) => t.status === 'completed').length
          return Math.round((completed / mission.tasks.length) * 100)
        },

        getActiveAgents: () => {
          const agents = get().agents
          return (Object.keys(agents) as AgentRole[]).filter(
            (role) => agents[role].status === 'working' || agents[role].status === 'thinking'
          )
        },

        canStartNewTask: () => {
          const activeCount = get().getActiveAgents().length
          const maxConcurrent = get().settings.maxConcurrentTasks
          return activeCount < maxConcurrent
        },

        updateMissionProgress: () => {
          const mission = get().currentMission
          if (!mission) return

          const progress = get().getMissionProgress()
          get().updateMission({ progress })

          // Update current phase based on task states
          const tasks = mission.tasks
          const inProgress = tasks.filter((t) => t.status === 'in_progress')

          if (inProgress.length > 0) {
            const agents = inProgress.map((t) => t.assignedAgent)
            const uniqueAgents = [...new Set(agents)]
            const agentNames: Record<AgentRole, string> = {
              orchestrator: '분석',
              planner: '설계',
              implementer: '구현',
              tester: '테스트',
              reviewer: '리뷰',
            }
            const phaseNames = uniqueAgents.map((a) => agentNames[a])
            get().updateMission({ currentPhase: `${phaseNames.join(', ')} 진행 중` })
          }
        },
      }))
    ),
    { name: 'mission-control-store' }
  )
)

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectCurrentMission = (state: MissionControlStore) => state.currentMission
export const selectAgents = (state: MissionControlStore) => state.agents
export const selectEvents = (state: MissionControlStore) => state.events
export const selectIsLoading = (state: MissionControlStore) => state.isLoading
export const selectError = (state: MissionControlStore) => state.error
export const selectSettings = (state: MissionControlStore) => state.settings

export const selectAgentByRole = (role: AgentRole) => (state: MissionControlStore) => state.agents[role]
export const selectMissionProgress = (state: MissionControlStore) => state.getMissionProgress()
export const selectReadyTasks = (state: MissionControlStore) => state.getReadyTasks()
export const selectActiveAgents = (state: MissionControlStore) => state.getActiveAgents()
