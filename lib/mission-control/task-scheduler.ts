/**
 * Mission Control - Task Scheduler
 *
 * 태스크 의존성 관리 및 스케줄링
 * - 의존성 그래프 구성
 * - 실행 순서 결정
 * - 병렬 실행 최적화
 */

import { Task, TaskStatus, TaskPriority } from './types'

// ============================================================================
// Types
// ============================================================================

interface DependencyNode {
  task: Task
  inDegree: number          // 들어오는 의존성 수
  outDegree: number         // 나가는 의존성 수 (이 태스크를 기다리는 수)
  level: number             // 의존성 트리에서의 레벨 (0 = 루트)
}

interface ScheduleResult {
  phases: SchedulePhase[]
  criticalPath: string[]    // 가장 긴 경로의 태스크 ID들
  estimatedDuration: number // 예상 소요 시간 (병렬 처리 고려)
}

interface SchedulePhase {
  level: number
  tasks: Task[]
  canParallelize: boolean
}

// ============================================================================
// Task Scheduler Class
// ============================================================================

export class TaskScheduler {
  private tasks: Task[]
  private nodes: Map<string, DependencyNode>

  constructor(tasks: Task[]) {
    this.tasks = tasks
    this.nodes = new Map()
    this.buildDependencyGraph()
  }

  /**
   * 의존성 그래프 구성
   */
  private buildDependencyGraph(): void {
    // 노드 초기화
    this.tasks.forEach((task) => {
      this.nodes.set(task.id, {
        task,
        inDegree: task.dependencies.length,
        outDegree: 0,
        level: -1,
      })
    })

    // outDegree 계산
    this.tasks.forEach((task) => {
      task.dependencies.forEach((depId) => {
        const depNode = this.nodes.get(depId)
        if (depNode) {
          depNode.outDegree++
        }
      })
    })

    // 레벨 계산 (BFS)
    this.calculateLevels()
  }

  /**
   * 각 태스크의 레벨 계산 (위상 정렬 기반)
   */
  private calculateLevels(): void {
    const queue: string[] = []
    const visited = new Set<string>()

    // 의존성 없는 태스크들 (레벨 0)
    this.nodes.forEach((node, id) => {
      if (node.inDegree === 0) {
        node.level = 0
        queue.push(id)
      }
    })

    // BFS로 레벨 전파
    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const currentNode = this.nodes.get(currentId)!

      // 이 태스크를 의존하는 태스크들의 레벨 업데이트
      this.tasks.forEach((task) => {
        if (task.dependencies.includes(currentId)) {
          const dependentNode = this.nodes.get(task.id)!
          dependentNode.level = Math.max(dependentNode.level, currentNode.level + 1)

          // 모든 의존성이 처리되었으면 큐에 추가
          const allDepsProcessed = task.dependencies.every((depId) => visited.has(depId))
          if (allDepsProcessed && !visited.has(task.id)) {
            queue.push(task.id)
          }
        }
      })
    }
  }

  /**
   * 실행 가능한 태스크 조회 (의존성 충족된 것들)
   */
  getReadyTasks(completedTaskIds: Set<string>): Task[] {
    return this.tasks.filter((task) => {
      // 이미 완료되었거나 진행 중이면 제외
      if (task.status !== 'pending') return false

      // 모든 의존성이 완료되었는지 확인
      return task.dependencies.every((depId) => completedTaskIds.has(depId))
    })
  }

  /**
   * 스케줄 생성 - 최적의 실행 순서 계획
   */
  createSchedule(): ScheduleResult {
    const phases: SchedulePhase[] = []
    const maxLevel = Math.max(...Array.from(this.nodes.values()).map((n) => n.level))

    // 레벨별로 태스크 그룹화
    for (let level = 0; level <= maxLevel; level++) {
      const levelTasks = this.tasks.filter((task) => {
        const node = this.nodes.get(task.id)
        return node?.level === level
      })

      if (levelTasks.length > 0) {
        // 우선순위로 정렬
        levelTasks.sort((a, b) => this.comparePriority(a.priority, b.priority))

        phases.push({
          level,
          tasks: levelTasks,
          canParallelize: levelTasks.length > 1,
        })
      }
    }

    // 크리티컬 패스 계산
    const criticalPath = this.findCriticalPath()

    // 예상 소요 시간 (Phase 수 * 평균 시간)
    const estimatedDuration = phases.length * 5 // 분 단위

    return {
      phases,
      criticalPath,
      estimatedDuration,
    }
  }

  /**
   * 크리티컬 패스 찾기 (가장 긴 의존성 체인)
   */
  private findCriticalPath(): string[] {
    let longestPath: string[] = []
    let maxLength = 0

    // 의존성 없는 태스크들에서 시작하는 모든 경로 탐색
    const startTasks = this.tasks.filter((task) => task.dependencies.length === 0)

    const dfs = (taskId: string, currentPath: string[]): void => {
      const newPath = [...currentPath, taskId]

      // 이 태스크를 의존하는 태스크들 찾기
      const dependents = this.tasks.filter((t) => t.dependencies.includes(taskId))

      if (dependents.length === 0) {
        // 리프 노드
        if (newPath.length > maxLength) {
          maxLength = newPath.length
          longestPath = newPath
        }
      } else {
        dependents.forEach((dep) => dfs(dep.id, newPath))
      }
    }

    startTasks.forEach((task) => dfs(task.id, []))

    return longestPath
  }

  /**
   * 우선순위 비교
   */
  private comparePriority(a: TaskPriority, b: TaskPriority): number {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }
    return priorityOrder[a] - priorityOrder[b]
  }

  /**
   * 순환 의존성 검사
   */
  hasCyclicDependency(): boolean {
    const visited = new Set<string>()
    const recStack = new Set<string>()

    const hasCycle = (taskId: string): boolean => {
      if (!visited.has(taskId)) {
        visited.add(taskId)
        recStack.add(taskId)

        const task = this.tasks.find((t) => t.id === taskId)
        if (task) {
          // 이 태스크를 의존하는 태스크들 검사
          const dependents = this.tasks.filter((t) => t.dependencies.includes(taskId))
          for (const dep of dependents) {
            if (!visited.has(dep.id) && hasCycle(dep.id)) {
              return true
            } else if (recStack.has(dep.id)) {
              return true
            }
          }
        }
      }
      recStack.delete(taskId)
      return false
    }

    for (const task of this.tasks) {
      if (hasCycle(task.id)) {
        return true
      }
    }

    return false
  }

  /**
   * 태스크 완료 시 다음 실행 가능한 태스크들 반환
   */
  getUnblockedTasks(completedTaskId: string, completedTaskIds: Set<string>): Task[] {
    const newlyReady: Task[] = []

    // completedTaskId를 의존하는 태스크들 확인
    this.tasks.forEach((task) => {
      if (task.status !== 'pending') return
      if (!task.dependencies.includes(completedTaskId)) return

      // 모든 의존성이 충족되었는지 확인
      const allDepsCompleted = task.dependencies.every((depId) => completedTaskIds.has(depId))

      if (allDepsCompleted) {
        newlyReady.push(task)
      }
    })

    return newlyReady
  }

  /**
   * 병렬 실행 가능한 최대 태스크 수 계산
   */
  getMaxParallelism(): number {
    const levelCounts = new Map<number, number>()

    this.nodes.forEach((node) => {
      const count = levelCounts.get(node.level) || 0
      levelCounts.set(node.level, count + 1)
    })

    return Math.max(...Array.from(levelCounts.values()), 1)
  }

  /**
   * 의존성 트리 시각화 (디버깅용)
   */
  visualize(): string {
    const lines: string[] = ['=== Task Dependency Graph ===']

    const maxLevel = Math.max(...Array.from(this.nodes.values()).map((n) => n.level))

    for (let level = 0; level <= maxLevel; level++) {
      const levelTasks = Array.from(this.nodes.values())
        .filter((n) => n.level === level)
        .map((n) => `[${n.task.title}]`)

      lines.push(`Level ${level}: ${levelTasks.join(' | ')}`)
    }

    lines.push('')
    lines.push('Dependencies:')
    this.tasks.forEach((task) => {
      if (task.dependencies.length > 0) {
        const depNames = task.dependencies
          .map((depId) => this.tasks.find((t) => t.id === depId)?.title || depId)
          .join(', ')
        lines.push(`  ${task.title} <- [${depNames}]`)
      }
    })

    return lines.join('\n')
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 태스크 배열에서 스케줄러 생성
 */
export function createScheduler(tasks: Task[]): TaskScheduler {
  return new TaskScheduler(tasks)
}

/**
 * 간단한 위상 정렬 (토폴로지 정렬)
 */
export function topologicalSort(tasks: Task[]): Task[] {
  const result: Task[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  const visit = (task: Task): void => {
    if (temp.has(task.id)) {
      throw new Error(`Cyclic dependency detected at task: ${task.title}`)
    }
    if (visited.has(task.id)) {
      return
    }

    temp.add(task.id)

    // 의존하는 태스크들 먼저 방문
    task.dependencies.forEach((depId) => {
      const depTask = tasks.find((t) => t.id === depId)
      if (depTask) {
        visit(depTask)
      }
    })

    temp.delete(task.id)
    visited.add(task.id)
    result.push(task)
  }

  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      visit(task)
    }
  })

  return result
}
