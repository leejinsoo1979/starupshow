'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Code,
  FileText,
  Image,
  Mail,
  Calendar,
  Database,
  Bot,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  id: string
  name: string
  description?: string
  type: 'tool' | 'api' | 'condition' | 'delay' | 'notify' | 'ai'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  skillId?: string
  endpoint?: string
  inputs?: Record<string, any>
  dependsOn?: string[]
  result?: any
  error?: string
  startedAt?: string
  completedAt?: string
}

interface WorkflowStepVisualizerProps {
  steps: WorkflowStep[]
  title?: string
  className?: string
  compact?: boolean
  onStepClick?: (step: WorkflowStep) => void
}

// 도구 타입별 아이콘 & 라벨
const toolConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  web_search: { icon: Search, label: '검색' },
  browser_automation: { icon: Globe, label: '브라우저' },
  search: { icon: Search, label: '검색' },
  api: { icon: Globe, label: 'API' },
  code: { icon: Code, label: '코드' },
  file: { icon: FileText, label: '파일' },
  image: { icon: Image, label: '이미지' },
  email: { icon: Mail, label: '이메일' },
  calendar: { icon: Calendar, label: '일정' },
  database: { icon: Database, label: 'DB' },
  ai: { icon: Bot, label: 'AI' },
  tool: { icon: Bot, label: '도구' },
}

/**
 * 젠스파크 스타일 도구 사용 표시
 * 미니멀하고 깔끔한 한 줄 디자인
 */
export function WorkflowStepVisualizer({
  steps,
  title,
  className,
  compact = false,
  onStepClick
}: WorkflowStepVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 도구 사용 정보 추출
  const toolsUsed = steps
    .filter(s => s.status === 'completed' || s.status === 'running')
    .map(s => {
      const toolName = s.name.toLowerCase().replace(/\s+/g, '_')
      const config = toolConfig[toolName] || toolConfig[s.type] || toolConfig.tool
      return {
        ...s,
        icon: config.icon,
        label: config.label,
      }
    })

  const isRunning = steps.some(s => s.status === 'running')
  const hasFailed = steps.some(s => s.status === 'failed')
  const firstTool = toolsUsed[0]

  // 검색어/입력값 추출
  const getInputPreview = (step: WorkflowStep) => {
    if (!step.inputs) return ''
    const query = step.inputs.query || step.inputs.search || step.inputs.url || step.inputs.text || ''
    return typeof query === 'string' ? query.slice(0, 50) : ''
  }

  if (!steps.length) return null

  return (
    <div className={cn('my-2', className)}>
      {/* 젠스파크 스타일: 한 줄 도구 표시 */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer',
          'bg-zinc-800/60 hover:bg-zinc-800/80 border border-zinc-700/50'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 상태 아이콘 */}
        <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium shrink-0">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          ) : hasFailed ? (
            <X className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>도구 사용</span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-4 bg-zinc-700" />

        {/* 도구 아이콘 & 쿼리 */}
        <div className="flex items-center gap-2 flex-1 min-w-0 text-sm text-zinc-300">
          {firstTool && (
            <>
              <firstTool.icon className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-500">{firstTool.label}</span>
              <span className="truncate text-zinc-300">
                {getInputPreview(firstTool) || firstTool.name}
              </span>
            </>
          )}
          {toolsUsed.length > 1 && (
            <span className="text-zinc-500 shrink-0">
              +{toolsUsed.length - 1}
            </span>
          )}
        </div>

        {/* 보기 버튼 */}
        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 flex items-center gap-1">
          {isExpanded ? '접기' : '보기'}
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 확장된 상세 정보 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 pl-4">
              {steps.map((step, idx) => {
                const config = toolConfig[step.type] || toolConfig.tool
                const Icon = config.icon

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-start gap-2 py-2 px-3 rounded-md text-sm',
                      'bg-zinc-800/40 border border-zinc-700/30'
                    )}
                  >
                    {/* 상태 표시 */}
                    <div className="shrink-0 mt-0.5">
                      {step.status === 'running' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : step.status === 'completed' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : step.status === 'failed' ? (
                        <X className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-400">{step.name}</span>
                      </div>

                      {/* 입력값 */}
                      {step.inputs && Object.keys(step.inputs).length > 0 && (
                        <div className="mt-1 text-xs text-zinc-500">
                          {Object.entries(step.inputs).slice(0, 2).map(([key, val]) => (
                            <div key={key} className="truncate">
                              <span className="text-zinc-600">{key}:</span>{' '}
                              {typeof val === 'string' ? val.slice(0, 100) : JSON.stringify(val).slice(0, 100)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 에러 */}
                      {step.error && (
                        <div className="mt-1 text-xs text-red-400">
                          {step.error}
                        </div>
                      )}

                      {/* 결과 미리보기 */}
                      {step.result && step.status === 'completed' && (
                        <div className="mt-1 text-xs text-zinc-500 truncate">
                          ✓ 완료
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 컴팩트 버전 (인라인 표시용) - 더 미니멀하게
function CompactVisualizer({
  steps,
  isRunning,
  hasFailed
}: {
  steps: WorkflowStep[]
  title?: string
  progress?: number
  isRunning: boolean
  hasFailed: boolean
}) {
  const toolNames = steps
    .filter(s => s.status === 'completed')
    .map(s => s.name)
    .join(', ')

  return (
    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
      {isRunning ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : hasFailed ? (
        <X className="w-3 h-3 text-red-400" />
      ) : (
        <Check className="w-3 h-3 text-emerald-400" />
      )}
      <span>사용된 도구: {toolNames || '없음'}</span>
    </div>
  )
}

// 워크플로우 실행 훅
export function useWorkflowExecution() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isExecuting, setIsExecuting] = useState(false)

  const startWorkflow = (initialSteps: Omit<WorkflowStep, 'status'>[]) => {
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' as const })))
    setIsExecuting(true)
  }

  const updateStep = (stepId: string, update: Partial<WorkflowStep>) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, ...update } : s
    ))
  }

  const completeWorkflow = () => {
    setIsExecuting(false)
  }

  const resetWorkflow = () => {
    setSteps([])
    setIsExecuting(false)
  }

  return {
    steps,
    isExecuting,
    startWorkflow,
    updateStep,
    completeWorkflow,
    resetWorkflow
  }
}

export default WorkflowStepVisualizer
