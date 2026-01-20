'use client'

/**
 * Mission Control - AI Coding Agent UI
 *
 * 실제 코딩 에이전트처럼 작동하는 UI
 * - 왼쪽: 에이전트 상태 및 태스크
 * - 오른쪽: 코드/결과물 뷰어
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
  Code,
  FileText,
  TestTube,
  Eye,
  Sparkles,
  Copy,
  Check,
  File,
  Folder,
  Terminal,
  Cpu,
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
// Code Viewer - 실제 코드를 보여주는 에디터 스타일
// ============================================================================

interface CodeViewerProps {
  artifacts: Artifact[]
  selectedArtifact: Artifact | null
  onSelectArtifact: (artifact: Artifact) => void
}

function CodeViewer({ artifacts, selectedArtifact, onSelectArtifact }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (selectedArtifact?.content) {
      navigator.clipboard.writeText(selectedArtifact.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 코드에 라인 넘버 추가
  const formatCodeWithLineNumbers = (code: string) => {
    const lines = code.split('\n')
    return lines.map((line, i) => ({
      number: i + 1,
      content: line,
    }))
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* File Tabs */}
      <div className="flex items-center border-b border-zinc-800 bg-[#161b22]">
        <div className="flex items-center overflow-x-auto">
          {artifacts.map((artifact) => {
            const isSelected = selectedArtifact?.id === artifact.id
            const info = AGENT_INFO[artifact.createdBy]
            return (
              <button
                key={artifact.id}
                onClick={() => onSelectArtifact(artifact)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs border-r border-zinc-800 transition-colors',
                  isSelected
                    ? 'bg-[#0d1117] text-zinc-200 border-t-2 border-t-blue-500'
                    : 'bg-[#161b22] text-zinc-500 hover:text-zinc-300 border-t-2 border-t-transparent'
                )}
              >
                <File className="w-3.5 h-3.5" />
                <span className="max-w-32 truncate">{artifact.title}</span>
                <span className={cn('text-[10px] px-1 rounded', info.bgColor, info.color)}>
                  {info.label}
                </span>
              </button>
            )
          })}
        </div>
        {selectedArtifact && (
          <button
            onClick={handleCopy}
            className="ml-auto mr-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사됨' : '복사'}
          </button>
        )}
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        {selectedArtifact ? (
          <div className="min-h-full">
            <pre className="text-sm font-mono leading-6">
              {formatCodeWithLineNumbers(selectedArtifact.content).map((line) => (
                <div key={line.number} className="flex hover:bg-zinc-800/30">
                  <span className="w-12 px-3 text-right text-zinc-600 select-none border-r border-zinc-800 bg-[#161b22]">
                    {line.number}
                  </span>
                  <code className="flex-1 px-4 text-zinc-300 whitespace-pre-wrap">
                    {line.content || ' '}
                  </code>
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Code className="w-12 h-12 mb-3" />
            <p className="text-sm">결과물이 생성되면 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Agent Status - 작은 상태 표시
// ============================================================================

interface AgentStatusRowProps {
  role: AgentRole
  status: AgentStatus
  message?: string
}

function AgentStatusRow({ role, status, message }: AgentStatusRowProps) {
  const info = AGENT_INFO[role]
  const isActive = status === 'working' || status === 'thinking'
  const isError = status === 'error'

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
      isActive && 'bg-zinc-800/50 border border-zinc-700',
      !isActive && 'hover:bg-zinc-800/30'
    )}>
      {/* Status Indicator */}
      <div className={cn(
        'w-2 h-2 rounded-full',
        isActive && 'bg-emerald-400 animate-pulse',
        isError && 'bg-red-400',
        !isActive && !isError && 'bg-zinc-600'
      )} />

      {/* Agent Label */}
      <span className={cn(
        'text-xs font-mono font-medium w-10',
        isActive ? info.color : 'text-zinc-500'
      )}>
        {info.label}
      </span>

      {/* Message */}
      <span className={cn(
        'flex-1 text-xs truncate',
        isActive ? 'text-zinc-300' : 'text-zinc-600'
      )}>
        {message || (isActive ? '작업 중...' : '대기')}
      </span>

      {/* Spinner */}
      {isActive && (
        <Loader2 className={cn('w-3.5 h-3.5 animate-spin', info.color)} />
      )}
    </div>
  )
}

// ============================================================================
// Task List
// ============================================================================

interface TaskListProps {
  tasks: Task[]
}

function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="space-y-1">
      {tasks.map((task, i) => {
        const isActive = task.status === 'in_progress'
        const isCompleted = task.status === 'completed'
        const isFailed = task.status === 'failed'
        const info = AGENT_INFO[task.assignedAgent]

        return (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
              isActive && 'bg-blue-500/10 border border-blue-500/20'
            )}
          >
            {/* Status Icon */}
            {isActive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : isFailed ? (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-zinc-600" />
            )}

            {/* Task Title */}
            <span className={cn(
              'flex-1 truncate',
              isActive ? 'text-zinc-200' : isCompleted ? 'text-zinc-500' : 'text-zinc-500'
            )}>
              {task.title}
            </span>

            {/* Agent Badge */}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono',
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
// Main Component
// ============================================================================

interface MissionControlProps {
  className?: string
}

export function MissionControl({ className }: MissionControlProps) {
  const [input, setInput] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    currentMission,
    agents,
    isLoading,
    error,
    reset,
  } = useMissionControlStore()

  // 새 artifact 생성 시 자동 선택
  useEffect(() => {
    if (currentMission?.artifacts.length) {
      const latest = currentMission.artifacts[currentMission.artifacts.length - 1]
      setSelectedArtifact(latest)
    }
  }, [currentMission?.artifacts.length])

  const handleStart = async () => {
    if (!input.trim() || isLoading) return
    try {
      setSelectedArtifact(null)
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

  return (
    <div className={cn('flex h-full bg-[#0d1117]', className)}>
      {/* Left Panel - Status & Tasks */}
      <div className="w-80 flex flex-col border-r border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <span className="font-medium text-sm text-zinc-200">AI Agents</span>
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

        {/* Agents Status */}
        <div className="p-3 border-b border-zinc-800">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 px-1">
            에이전트 상태
          </div>
          <div className="space-y-1">
            {(Object.keys(agents) as AgentRole[]).map((role) => (
              <AgentStatusRow
                key={role}
                role={role}
                status={agents[role].status}
                message={agents[role].lastMessage}
              />
            ))}
          </div>
        </div>

        {/* Tasks */}
        {currentMission && currentMission.tasks.length > 0 && (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 px-1">
              태스크 ({currentMission.tasks.filter(t => t.status === 'completed').length}/{currentMission.tasks.length})
            </div>
            <TaskList tasks={currentMission.tasks} />
          </div>
        )}

        {/* Input */}
        <div className="mt-auto p-3 border-t border-zinc-800">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700',
            'focus-within:border-zinc-600 transition-all'
          )}>
            <Terminal className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="작업 요청 입력..."
              disabled={missionInProgress ?? false}
              className={cn(
                'flex-1 bg-transparent border-none outline-none text-sm text-zinc-200',
                'placeholder:text-zinc-600',
                missionInProgress && 'opacity-50'
              )}
            />
            {missionInProgress ? (
              <button
                onClick={() => abortMission()}
                className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
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
                    : 'text-zinc-600 cursor-not-allowed'
                )}
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Button */}
          {currentMission && !missionInProgress && (
            <button
              onClick={() => { reset(); setInput(''); setSelectedArtifact(null) }}
              className="flex items-center justify-center gap-1.5 w-full mt-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              새 작업
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - Code Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Code Viewer */}
        <div className="flex-1">
          {currentMission ? (
            <CodeViewer
              artifacts={currentMission.artifacts}
              selectedArtifact={selectedArtifact}
              onSelectArtifact={setSelectedArtifact}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#0d1117] text-center">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-6">
                <Code className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">
                AI 코딩 에이전트
              </h3>
              <p className="text-sm text-zinc-600 max-w-md leading-relaxed">
                왼쪽 입력창에 작업을 요청하면<br />
                5개의 에이전트가 협력하여 코드를 생성합니다.
              </p>
              <div className="flex items-center gap-6 mt-8">
                {(['orchestrator', 'planner', 'implementer', 'tester', 'reviewer'] as AgentRole[]).map((role) => {
                  const info = AGENT_INFO[role]
                  return (
                    <div key={role} className="flex flex-col items-center gap-1">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', info.bgColor)}>
                        <span className={cn('text-xs font-mono font-bold', info.color)}>
                          {info.label.charAt(0)}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-600">{info.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MissionControl
