'use client'

/**
 * SimulationController Component
 * 스키마 데이터 흐름 시뮬레이션 컨트롤러 UI
 * 프로덕션 레벨 디자인
 */

import React, { memo, useCallback, useState } from 'react'
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Repeat,
  ChevronDown,
  Database,
  GitBranch,
  Layers,
  Settings2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  SimulationMode,
  SimulationState,
  SimulationStep,
  SimulationConfig,
  SPEED_PRESETS,
  SIMULATION_COLORS,
  CrudOperation,
} from './types'

interface SimulationControllerProps {
  // 상태
  state: SimulationState
  config: SimulationConfig
  steps: SimulationStep[]
  currentStepIndex: number
  progress: number
  // 테이블 목록 (CRUD 대상 선택용)
  tables: { id: string; name: string }[]
  // 액션
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onNextStep: () => void
  onPrevStep: () => void
  onGoToStep: (index: number) => void
  onSetSpeed: (speed: number) => void
  onToggleLoop: () => void
  onSetMode: (mode: SimulationMode) => void
  onUpdateConfig: (config: Partial<SimulationConfig>) => void
  onGenerateSteps: () => void
  // UI
  className?: string
  compact?: boolean
}

// 모드 정보
const MODE_INFO: Record<SimulationMode, { icon: typeof Database; label: string; description: string }> = {
  'fk-flow': {
    icon: GitBranch,
    label: 'FK 관계 흐름',
    description: 'Foreign Key 관계를 따라 데이터 흐름 시뮬레이션',
  },
  'crud': {
    icon: Database,
    label: 'CRUD 시나리오',
    description: 'Create/Read/Update/Delete 작업 시뮬레이션',
  },
  'sequential': {
    icon: Layers,
    label: '순차 하이라이트',
    description: '테이블을 순서대로 하나씩 하이라이트',
  },
}

// CRUD 작업 정보
const CRUD_INFO: Record<CrudOperation, { label: string; color: string }> = {
  create: { label: 'CREATE', color: SIMULATION_COLORS.create },
  read: { label: 'READ', color: SIMULATION_COLORS.read },
  update: { label: 'UPDATE', color: SIMULATION_COLORS.update },
  delete: { label: 'DELETE', color: SIMULATION_COLORS.delete },
}

export const SimulationController = memo(function SimulationController({
  state,
  config,
  steps,
  currentStepIndex,
  progress,
  tables,
  onPlay,
  onPause,
  onStop,
  onNextStep,
  onPrevStep,
  onGoToStep,
  onSetSpeed,
  onToggleLoop,
  onSetMode,
  onUpdateConfig,
  onGenerateSteps,
  className,
  compact = false,
}: SimulationControllerProps) {
  const [showSettings, setShowSettings] = useState(false)

  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'
  const isIdle = state === 'idle'
  const isCompleted = state === 'completed'

  const currentStep = steps[currentStepIndex]
  const ModeIcon = MODE_INFO[config.mode].icon

  // 재생/일시정지 토글
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause()
    } else {
      onPlay()
    }
  }, [isPlaying, onPlay, onPause])

  // 모드 변경 시 스텝 재생성
  const handleModeChange = useCallback((mode: SimulationMode) => {
    onSetMode(mode)
    // 자동으로 스텝 재생성됨
  }, [onSetMode])

  // CRUD 작업 변경
  const handleCrudOperationChange = useCallback((operation: CrudOperation) => {
    onUpdateConfig({
      crud: {
        ...config.crud!,
        operation,
      },
    })
    onGenerateSteps()
  }, [config.crud, onUpdateConfig, onGenerateSteps])

  // CRUD 대상 테이블 변경
  const handleCrudTargetChange = useCallback((tableId: string) => {
    onUpdateConfig({
      crud: {
        ...config.crud!,
        targetTableId: tableId,
      },
    })
    onGenerateSteps()
  }, [config.crud, onUpdateConfig, onGenerateSteps])

  // 프로그레스 바 클릭으로 스텝 이동
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (steps.length === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const stepIndex = Math.floor(percentage * steps.length)

    onGoToStep(Math.max(0, Math.min(steps.length - 1, stepIndex)))
  }, [steps.length, onGoToStep])

  // Compact 모드: 미니멀 컨트롤러
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm',
          className
        )}
      >
        {/* 모드 아이콘 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ModeIcon className="h-4 w-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {(Object.keys(MODE_INFO) as SimulationMode[]).map((mode) => {
              const info = MODE_INFO[mode]
              const Icon = info.icon
              return (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(config.mode === mode && 'bg-accent')}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {info.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 이전 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevStep}
          disabled={isIdle || (currentStepIndex <= 0 && !config.loop)}
          className="h-8 w-8"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        {/* 재생/일시정지 */}
        <Button
          onClick={handlePlayPause}
          size="icon"
          className={cn(
            'h-10 w-10 rounded-full',
            isPlaying && 'bg-primary shadow-lg shadow-primary/30'
          )}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </Button>

        {/* 다음 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNextStep}
          disabled={isIdle || (currentStepIndex >= steps.length - 1 && !config.loop)}
          className="h-8 w-8"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* 정지 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onStop}
          disabled={isIdle}
          className="h-8 w-8"
        >
          <Square className="h-3 w-3" />
        </Button>

        {/* 반복 */}
        <Button
          variant={config.loop ? 'default' : 'ghost'}
          size="icon"
          onClick={onToggleLoop}
          className="h-8 w-8"
        >
          <Repeat className="h-4 w-4" />
        </Button>

        {/* 속도 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              {config.speed}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SPEED_PRESETS.map((preset) => (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => onSetSpeed(preset.value)}
                className={cn(config.speed === preset.value && 'bg-accent')}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 스텝 카운터 */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentStepIndex + 1}/{steps.length || '-'}
        </span>
      </div>
    )
  }

  // Full 모드
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur-sm',
        'transition-all duration-300 w-[400px]',
        className
      )}
    >
      {/* 헤더: 모드 선택 */}
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <ModeIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">{MODE_INFO[config.mode].label}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            <DropdownMenuLabel>시뮬레이션 모드</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(MODE_INFO) as SimulationMode[]).map((mode) => {
              const info = MODE_INFO[mode]
              const Icon = info.icon
              return (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    'flex flex-col items-start gap-1 py-2',
                    config.mode === mode && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{info.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{info.description}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 설정 버튼 */}
        <div className="flex items-center gap-1">
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[300px]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">시뮬레이션 설정</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowSettings(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* FK 모드 설정 */}
                {config.mode === 'fk-flow' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">FK 흐름 옵션</label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.fkFlow?.bidirectional ?? true}
                        onChange={(e) => onUpdateConfig({
                          fkFlow: { ...config.fkFlow!, bidirectional: e.target.checked }
                        })}
                        className="rounded"
                      />
                      양방향 탐색
                    </label>
                  </div>
                )}

                {/* CRUD 모드 설정 */}
                {config.mode === 'crud' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">대상 테이블</label>
                      <select
                        value={config.crud?.targetTableId || ''}
                        onChange={(e) => handleCrudTargetChange(e.target.value)}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        {tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">작업 유형</label>
                      <div className="flex gap-1">
                        {(Object.keys(CRUD_INFO) as CrudOperation[]).map((op) => (
                          <Button
                            key={op}
                            variant={config.crud?.operation === op ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            style={{
                              backgroundColor: config.crud?.operation === op ? CRUD_INFO[op].color : undefined,
                              borderColor: CRUD_INFO[op].color,
                            }}
                            onClick={() => handleCrudOperationChange(op)}
                          >
                            {CRUD_INFO[op].label[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.crud?.includeRelated ?? true}
                        onChange={(e) => onUpdateConfig({
                          crud: { ...config.crud!, includeRelated: e.target.checked }
                        })}
                        className="rounded"
                      />
                      연관 테이블 포함
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.crud?.showCascade ?? true}
                        onChange={(e) => onUpdateConfig({
                          crud: { ...config.crud!, showCascade: e.target.checked }
                        })}
                        className="rounded"
                      />
                      CASCADE 효과 표시
                    </label>
                  </div>
                )}

                {/* 순차 모드 설정 */}
                {config.mode === 'sequential' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">정렬 기준</label>
                      <select
                        value={config.sequential?.sortBy || 'connections'}
                        onChange={(e) => onUpdateConfig({
                          sequential: { ...config.sequential!, sortBy: e.target.value as 'name' | 'connections' | 'custom' }
                        })}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="connections">연결 수 (많은 순)</option>
                        <option value="name">이름 (알파벳)</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config.sequential?.includeColumns ?? false}
                        onChange={(e) => onUpdateConfig({
                          sequential: { ...config.sequential!, includeColumns: e.target.checked }
                        })}
                        className="rounded"
                      />
                      컬럼도 개별 표시
                    </label>
                  </div>
                )}

                <Button onClick={onGenerateSteps} className="w-full" size="sm">
                  스텝 재생성
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 현재 스텝 정보 */}
      <div className="min-h-[40px] rounded-lg bg-muted/50 px-3 py-2">
        {currentStep ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{currentStep.description}</p>
            {currentStep.metadata?.operation && (
              <span
                className="w-fit rounded px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: CRUD_INFO[currentStep.metadata.operation].color }}
              >
                {CRUD_INFO[currentStep.metadata.operation].label}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {steps.length > 0
              ? '재생 버튼을 눌러 시뮬레이션을 시작하세요'
              : '시뮬레이션을 생성하려면 스텝 재생성을 클릭하세요'}
          </p>
        )}
      </div>

      {/* 프로그레스 바 */}
      <div
        className="relative h-2 cursor-pointer overflow-hidden rounded-full bg-muted"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        {/* 스텝 마커 */}
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute top-0 h-full w-0.5 transition-colors',
              i <= currentStepIndex ? 'bg-primary-foreground/30' : 'bg-muted-foreground/20'
            )}
            style={{ left: `${((i + 1) / steps.length) * 100}%` }}
          />
        ))}
      </div>

      {/* 스텝 카운터 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{currentStepIndex + 1} / {steps.length || '-'}</span>
        <span>{progress}%</span>
      </div>

      {/* 메인 컨트롤 */}
      <div className="flex items-center justify-between">
        {/* 스텝 컨트롤 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevStep}
            disabled={isIdle || (currentStepIndex <= 0 && !config.loop)}
            className="h-9 w-9"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextStep}
            disabled={isIdle || (currentStepIndex >= steps.length - 1 && !config.loop)}
            className="h-9 w-9"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* 재생/정지 컨트롤 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            disabled={isIdle}
            className="h-9 w-9"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            onClick={handlePlayPause}
            size="icon"
            className={cn(
              'h-11 w-11 rounded-full transition-all',
              isPlaying && 'bg-primary shadow-lg shadow-primary/30'
            )}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </Button>
        </div>

        {/* 반복 & 속도 */}
        <div className="flex items-center gap-1">
          <Button
            variant={config.loop ? 'default' : 'ghost'}
            size="icon"
            onClick={onToggleLoop}
            className="h-9 w-9"
          >
            <Repeat className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-14 text-xs">
                {config.speed}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>재생 속도</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SPEED_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.value}
                  onClick={() => onSetSpeed(preset.value)}
                  className={cn(
                    config.speed === preset.value && 'bg-accent'
                  )}
                >
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 속도 슬라이더 (compact가 아닐 때만) */}
      {!compact && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">속도</span>
          <Slider
            value={[config.speed]}
            onValueChange={([value]) => onSetSpeed(value)}
            min={0.5}
            max={3}
            step={0.25}
            className="flex-1"
          />
          <span className="w-10 text-right text-xs font-medium">{config.speed}x</span>
        </div>
      )}
    </div>
  )
})

export default SimulationController
