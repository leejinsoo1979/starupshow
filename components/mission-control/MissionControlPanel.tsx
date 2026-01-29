'use client'

/**
 * MissionControlPanel - Compact Mission Control for Right Panel
 *
 * 오른쪽 패널(300-400px)에 맞는 컴팩트한 오케스트레이션 UI
 * - 에이전트 상태 표시
 * - 태스크 진행 상황
 * - 아티팩트 프리뷰
 * - 작업 입력
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Play,
  Square,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  Copy,
  Check,
  File,
  Terminal,
  Cpu,
  Users,
  ListTodo,
  FileCode,
} from 'lucide-react'
import {
  useMissionControlStore,
  startMission,
  abortMission,
  type AgentRole,
  type AgentStatus,
  type Task,
  type Artifact,
} from '@/lib/mission-control'

// ============================================================================
// Agent Configuration
// ============================================================================

const AGENT_INFO: Record<AgentRole, {
  label: string
  name: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  orchestrator: {
    label: 'ORCH',
    name: '분석',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  planner: {
    label: 'PLAN',
    name: '설계',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  implementer: {
    label: 'IMPL',
    name: '구현',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  tester: {
    label: 'TEST',
    name: '테스트',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  reviewer: {
    label: 'REVW',
    name: '리뷰',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
}

// ============================================================================
// Collapsible Section
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
  isDark: boolean
}

function CollapsibleSection({ title, icon, badge, defaultOpen = true, children, isDark }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium transition-colors',
          isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
        )}
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {icon}
        <span className="uppercase tracking-wider">{title}</span>
        {badge !== undefined && (
          <span className={cn(
            'ml-auto px-1.5 py-0.5 rounded text-[10px]',
            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
          )}>
            {badge}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Agent Status Row (Compact)
// ============================================================================

interface AgentStatusRowProps {
  role: AgentRole
  status: AgentStatus
  message?: string
  isDark: boolean
}

function AgentStatusRow({ role, status, message, isDark }: AgentStatusRowProps) {
  const info = AGENT_INFO[role]
  const isActive = status === 'working' || status === 'thinking'
  const isError = status === 'error'

  return (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1.5 rounded transition-all text-xs',
      isActive && (isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'),
    )}>
      {/* Status Indicator */}
      <div className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        isActive && 'bg-emerald-400 animate-pulse',
        isError && 'bg-red-400',
        !isActive && !isError && (isDark ? 'bg-zinc-600' : 'bg-zinc-400')
      )} />

      {/* Agent Label */}
      <span className={cn(
        'font-mono font-medium w-9 flex-shrink-0',
        isActive ? info.color : (isDark ? 'text-zinc-500' : 'text-zinc-400')
      )}>
        {info.label}
      </span>

      {/* Progress Bar */}
      {isActive && (
        <div className={cn(
          'flex-1 h-1 rounded-full overflow-hidden',
          isDark ? 'bg-zinc-700' : 'bg-zinc-300'
        )}>
          <motion.div
            className={cn('h-full rounded-full', info.bgColor.replace('/10', '/50'))}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Message */}
      <span className={cn(
        'truncate text-[10px]',
        isActive ? (isDark ? 'text-zinc-300' : 'text-zinc-700') : (isDark ? 'text-zinc-600' : 'text-zinc-400')
      )}>
        {message?.slice(0, 20) || (isActive ? '작업 중...' : '대기')}
      </span>

      {/* Spinner */}
      {isActive && (
        <Loader2 className={cn('w-3 h-3 animate-spin flex-shrink-0', info.color)} />
      )}
    </div>
  )
}

// ============================================================================
// Task List (Compact)
// ============================================================================

interface TaskListProps {
  tasks: Task[]
  isDark: boolean
}

function TaskList({ tasks, isDark }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className={cn('text-xs text-center py-2', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
        아직 태스크가 없습니다
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => {
        const isActive = task.status === 'in_progress'
        const isCompleted = task.status === 'completed'
        const isFailed = task.status === 'failed'
        const info = AGENT_INFO[task.assignedAgent]

        return (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
              isActive && (isDark ? 'bg-blue-500/10' : 'bg-blue-50')
            )}
          >
            {/* Status Icon */}
            {isActive ? (
              <Loader2 className="w-3 h-3 animate-spin text-blue-400 flex-shrink-0" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            ) : isFailed ? (
              <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
            ) : (
              <Circle className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
            )}

            {/* Task Title */}
            <span className={cn(
              'flex-1 truncate',
              isActive
                ? (isDark ? 'text-zinc-200' : 'text-zinc-800')
                : (isDark ? 'text-zinc-500' : 'text-zinc-500')
            )}>
              {task.title}
            </span>

            {/* Agent Badge */}
            <span className={cn(
              'px-1 py-0.5 rounded text-[9px] font-mono flex-shrink-0',
              info.bgColor, info.color
            )}>
              {info.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Artifact List (Compact with Expandable Content)
// ============================================================================

interface ArtifactListProps {
  artifacts: Artifact[]
  isDark: boolean
}

function ArtifactList({ artifacts, isDark }: ArtifactListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  if (artifacts.length === 0) {
    return (
      <p className={cn('text-xs text-center py-2', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
        생성된 결과물이 없습니다
      </p>
    )
  }

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-1">
      {artifacts.map((artifact) => {
        const info = AGENT_INFO[artifact.createdBy]
        const isExpanded = expandedId === artifact.id

        return (
          <div key={artifact.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : artifact.id)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors',
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
              )}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
              )}
              <File className={cn('w-3 h-3 flex-shrink-0', info.color)} />
              <span className={cn(
                'flex-1 truncate text-left',
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              )}>
                {artifact.title}
              </span>
              <span className={cn(
                'px-1 py-0.5 rounded text-[9px] font-mono flex-shrink-0',
                info.bgColor, info.color
              )}>
                {info.label}
              </span>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    'mt-1 rounded border overflow-hidden',
                    isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                  )}>
                    {/* Copy Button */}
                    <div className={cn(
                      'flex justify-end px-2 py-1 border-b',
                      isDark ? 'border-zinc-700' : 'border-zinc-200'
                    )}>
                      <button
                        onClick={() => handleCopy(artifact.id, artifact.content)}
                        className={cn(
                          'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors',
                          isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
                        )}
                      >
                        {copied === artifact.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            복사
                          </>
                        )}
                      </button>
                    </div>
                    {/* Code Content */}
                    <pre className={cn(
                      'p-2 text-[10px] font-mono overflow-x-auto max-h-48',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      {artifact.content.slice(0, 2000)}
                      {artifact.content.length > 2000 && '\n... (더 많은 내용)'}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface MissionControlPanelProps {
  isDark: boolean
  className?: string
  mapId?: string | null // 🔥 Neural Map 연결 ID
}

export function MissionControlPanel({ isDark, className, mapId }: MissionControlPanelProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    currentMission,
    agents,
    isLoading,
    error,
    reset,
    updateSettings,
  } = useMissionControlStore()

  // 🔥 Neural Map ID를 Mission Control에 연결
  useEffect(() => {
    if (mapId) {
      updateSettings({ linkedMapId: mapId })
    }
  }, [mapId, updateSettings])

  const handleStart = async () => {
    if (!input.trim() || isLoading) return
    try {
      await startMission(input.trim())
      setInput('')
    } catch (err) {
      console.error('Mission start error:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleStart()
    }
  }

  const missionInProgress = currentMission && !['completed', 'failed', 'cancelled'].includes(currentMission.status)
  const completedTasks = currentMission?.tasks.filter(t => t.status === 'completed').length || 0
  const totalTasks = currentMission?.tasks.length || 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Progress */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-400" />
          <span className={cn(
            'font-medium text-sm',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            Team Orchestration
          </span>
        </div>
        {currentMission && (
          <span className={cn(
            'px-2 py-0.5 rounded text-[10px] font-medium',
            missionInProgress
              ? 'bg-emerald-500/10 text-emerald-400'
              : currentMission.status === 'completed'
                ? 'bg-zinc-500/10 text-zinc-400'
                : 'bg-red-500/10 text-red-400'
          )}>
            {currentMission.progress}%
          </span>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className={cn(
          'px-3 py-2 text-xs',
          isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
        )}>
          {error}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Agents Section */}
        <CollapsibleSection
          title="에이전트"
          icon={<Users className="w-3 h-3" />}
          defaultOpen={true}
          isDark={isDark}
        >
          <div className="space-y-0.5">
            {(Object.keys(agents) as AgentRole[]).map((role) => (
              <AgentStatusRow
                key={role}
                role={role}
                status={agents[role].status}
                message={agents[role].lastMessage}
                isDark={isDark}
              />
            ))}
          </div>
        </CollapsibleSection>

        {/* Tasks Section */}
        <CollapsibleSection
          title="태스크"
          icon={<ListTodo className="w-3 h-3" />}
          badge={totalTasks > 0 ? `${completedTasks}/${totalTasks}` : undefined}
          defaultOpen={true}
          isDark={isDark}
        >
          <TaskList
            tasks={currentMission?.tasks || []}
            isDark={isDark}
          />
        </CollapsibleSection>

        {/* Artifacts Section */}
        <CollapsibleSection
          title="결과물"
          icon={<FileCode className="w-3 h-3" />}
          badge={currentMission?.artifacts.length || undefined}
          defaultOpen={true}
          isDark={isDark}
        >
          <ArtifactList
            artifacts={currentMission?.artifacts || []}
            isDark={isDark}
          />
        </CollapsibleSection>

        {/* Empty State */}
        {!currentMission && (
          <div className={cn(
            'flex flex-col items-center justify-center py-8 px-4 text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <Cpu className="w-6 h-6 text-violet-400" />
            </div>
            <p className="text-sm font-medium mb-1">
              5개 에이전트가 협업합니다
            </p>
            <p className="text-xs">
              아래에 작업을 입력하세요
            </p>
            <div className="flex items-center gap-2 mt-4">
              {(['orchestrator', 'planner', 'implementer', 'tester', 'reviewer'] as AgentRole[]).map((role) => {
                const info = AGENT_INFO[role]
                return (
                  <div
                    key={role}
                    className={cn('w-6 h-6 rounded flex items-center justify-center', info.bgColor)}
                    title={info.name}
                  >
                    <span className={cn('text-[9px] font-mono font-bold', info.color)}>
                      {info.label.charAt(0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className={cn(
        'p-3 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
          isDark
            ? 'bg-zinc-800/50 border-zinc-700 focus-within:border-zinc-600'
            : 'bg-zinc-50 border-zinc-200 focus-within:border-zinc-300'
        )}>
          <Terminal className={cn(
            'w-4 h-4 flex-shrink-0',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="작업 요청 입력..."
            disabled={missionInProgress ?? false}
            className={cn(
              'flex-1 bg-transparent border-none outline-none text-sm',
              isDark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400',
              missionInProgress && 'opacity-50'
            )}
          />
          {missionInProgress ? (
            <button
              onClick={() => abortMission()}
              className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              title="중단"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!input.trim()}
              className={cn(
                'p-1.5 rounded transition-colors',
                input.trim()
                  ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                  : (isDark ? 'text-zinc-600' : 'text-zinc-400') + ' cursor-not-allowed'
              )}
              title="시작"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Reset Button */}
        {currentMission && !missionInProgress && (
          <button
            onClick={() => { reset(); setInput('') }}
            className={cn(
              'flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            새 작업
          </button>
        )}
      </div>
    </div>
  )
}

export default MissionControlPanel
