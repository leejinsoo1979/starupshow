/**
 * Agent Memory Compression Scheduler
 *
 * 메모리 자동 압축 및 정리 스케줄러
 * - 미압축 메모리 배치 처리
 * - 일일 요약 생성
 * - 오래된 메모리 정리
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  compressMemoriesBatch,
  generateDailySummary,
} from './agent-compression-service'

// ============================================
// Types
// ============================================

export interface SchedulerResult {
  success: boolean
  agentsProcessed: number
  memoriesCompressed: number
  dailySummariesGenerated: number
  errors: string[]
  duration: number
}

export interface CompressionThresholds {
  minUncompressedCount: number  // 압축 시작 최소 개수
  maxBatchSize: number          // 배치당 최대 처리 개수
  maxAgeHours: number           // 압축 대상 메모리 최대 나이 (시간)
}

const DEFAULT_THRESHOLDS: CompressionThresholds = {
  minUncompressedCount: 5,
  maxBatchSize: 50,
  maxAgeHours: 24 * 7,  // 1주일
}

// ============================================
// Core Scheduler Functions
// ============================================

/**
 * 모든 에이전트에 대해 압축 실행
 */
export async function runCompressionScheduler(
  thresholds: CompressionThresholds = DEFAULT_THRESHOLDS
): Promise<SchedulerResult> {
  const startTime = Date.now()
  const result: SchedulerResult = {
    success: false,
    agentsProcessed: 0,
    memoriesCompressed: 0,
    dailySummariesGenerated: 0,
    errors: [],
    duration: 0,
  }

  try {
    const supabase = createAdminClient()

    // 1. 미압축 메모리가 있는 에이전트 조회
    const { data: agentsWithUncompressed } = await (supabase as any)
      .from('agent_memories')
      .select('agent_id')
      .is('summary', null)
      .gte('created_at', new Date(Date.now() - thresholds.maxAgeHours * 60 * 60 * 1000).toISOString())

    if (!agentsWithUncompressed || agentsWithUncompressed.length === 0) {
      result.success = true
      result.duration = Date.now() - startTime
      console.log('[Scheduler] No uncompressed memories found')
      return result
    }

    // 고유 에이전트 ID 추출
    const uniqueAgentIds = Array.from(new Set(agentsWithUncompressed.map((a: any) => a.agent_id))) as string[]
    console.log(`[Scheduler] Found ${uniqueAgentIds.length} agents with uncompressed memories`)

    // 2. 각 에이전트에 대해 압축 실행
    for (const agentId of uniqueAgentIds) {
      try {
        // 미압축 메모리 개수 확인
        const { count } = await (supabase as any)
          .from('agent_memories')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agentId)
          .is('summary', null)

        if ((count || 0) < thresholds.minUncompressedCount) {
          continue
        }

        // 배치 압축 실행
        const batchResult = await compressMemoriesBatch(agentId, thresholds.maxBatchSize)

        result.agentsProcessed++
        result.memoriesCompressed += batchResult.processed

        if (batchResult.failed > 0) {
          result.errors.push(`Agent ${agentId}: ${batchResult.failed} failed`)
        }

        console.log(`[Scheduler] Agent ${agentId}: ${batchResult.processed} compressed, ${batchResult.failed} failed`)
      } catch (error: any) {
        result.errors.push(`Agent ${agentId}: ${error.message}`)
        console.error(`[Scheduler] Agent ${agentId} error:`, error)
      }
    }

    result.success = result.errors.length === 0
    result.duration = Date.now() - startTime

    console.log(`[Scheduler] Completed in ${result.duration}ms:`, {
      agentsProcessed: result.agentsProcessed,
      memoriesCompressed: result.memoriesCompressed,
      errors: result.errors.length,
    })

    return result
  } catch (error: any) {
    result.errors.push(`Scheduler error: ${error.message}`)
    result.duration = Date.now() - startTime
    console.error('[Scheduler] Fatal error:', error)
    return result
  }
}

/**
 * 일일 요약 생성 스케줄러
 * 어제 날짜의 일일 요약을 생성
 */
export async function runDailySummaryScheduler(): Promise<SchedulerResult> {
  const startTime = Date.now()
  const result: SchedulerResult = {
    success: false,
    agentsProcessed: 0,
    memoriesCompressed: 0,
    dailySummariesGenerated: 0,
    errors: [],
    duration: 0,
  }

  try {
    const supabase = createAdminClient()

    // 어제 날짜
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    // 어제 활동이 있었던 에이전트 조회
    const startOfDay = `${dateStr}T00:00:00Z`
    const endOfDay = `${dateStr}T23:59:59Z`

    const { data: activeAgents } = await (supabase as any)
      .from('agent_memories')
      .select('agent_id')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    if (!activeAgents || activeAgents.length === 0) {
      result.success = true
      result.duration = Date.now() - startTime
      console.log('[Scheduler] No agents with activity yesterday')
      return result
    }

    const uniqueAgentIds = Array.from(new Set(activeAgents.map((a: any) => a.agent_id))) as string[]
    console.log(`[Scheduler] Generating daily summaries for ${uniqueAgentIds.length} agents`)

    for (const agentId of uniqueAgentIds) {
      try {
        // 이미 요약이 있는지 확인
        const { data: existingSummary } = await (supabase as any)
          .from('agent_daily_summaries')
          .select('id')
          .eq('agent_id', agentId)
          .eq('date', dateStr)
          .single()

        if (existingSummary) {
          continue  // 이미 요약 있음
        }

        const dailySummary = await generateDailySummary(agentId, dateStr)

        if (dailySummary) {
          // 요약 저장
          const { error: insertError } = await (supabase as any)
            .from('agent_daily_summaries')
            .insert({
              agent_id: agentId,
              date: dateStr,
              summary: dailySummary.summary,
              highlights: dailySummary.highlights,
              stats: dailySummary.stats,
            })

          if (!insertError) {
            result.dailySummariesGenerated++
            result.agentsProcessed++
          } else {
            result.errors.push(`Agent ${agentId}: ${insertError.message}`)
          }
        }
      } catch (error: any) {
        result.errors.push(`Agent ${agentId}: ${error.message}`)
        console.error(`[Scheduler] Agent ${agentId} daily summary error:`, error)
      }
    }

    result.success = result.errors.length === 0
    result.duration = Date.now() - startTime

    console.log(`[Scheduler] Daily summaries completed in ${result.duration}ms:`, {
      agentsProcessed: result.agentsProcessed,
      summariesGenerated: result.dailySummariesGenerated,
    })

    return result
  } catch (error: any) {
    result.errors.push(`Daily summary scheduler error: ${error.message}`)
    result.duration = Date.now() - startTime
    console.error('[Scheduler] Fatal error:', error)
    return result
  }
}

/**
 * 오래된 메모리 정리
 * 3개월 이상 된 낮은 중요도 메모리 아카이브
 */
export async function runCleanupScheduler(
  maxAgeDays: number = 90,
  maxImportance: number = 3
): Promise<{ archived: number; errors: string[] }> {
  const result = { archived: 0, errors: [] as string[] }

  try {
    const supabase = createAdminClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

    // 오래된 낮은 중요도 메모리 아카이브 처리
    const { data: oldMemories, error } = await (supabase as any)
      .from('agent_memories')
      .update({ is_archived: true })
      .lt('created_at', cutoffDate.toISOString())
      .lte('importance', maxImportance)
      .eq('is_archived', false)
      .select('id')

    if (error) {
      result.errors.push(`Cleanup error: ${error.message}`)
    } else {
      result.archived = oldMemories?.length || 0
    }

    console.log(`[Scheduler] Cleanup: ${result.archived} memories archived`)

    return result
  } catch (error: any) {
    result.errors.push(`Cleanup error: ${error.message}`)
    console.error('[Scheduler] Cleanup error:', error)
    return result
  }
}

/**
 * 전체 스케줄러 실행 (Cron Job용)
 */
export async function runFullScheduler(): Promise<{
  compression: SchedulerResult
  dailySummary: SchedulerResult
  cleanup: { archived: number; errors: string[] }
}> {
  console.log('[Scheduler] Starting full scheduler run')

  const compression = await runCompressionScheduler()
  const dailySummary = await runDailySummaryScheduler()
  const cleanup = await runCleanupScheduler()

  console.log('[Scheduler] Full scheduler completed:', {
    compression: compression.memoriesCompressed,
    dailySummaries: dailySummary.dailySummariesGenerated,
    archived: cleanup.archived,
  })

  return { compression, dailySummary, cleanup }
}

/**
 * 특정 에이전트의 메모리 압축 트리거
 * 대화 후 비동기로 호출 가능
 */
export async function triggerAgentCompression(
  agentId: string,
  options?: {
    minCount?: number
    maxBatch?: number
  }
): Promise<{ processed: number; failed: number }> {
  const minCount = options?.minCount ?? 10
  const maxBatch = options?.maxBatch ?? 20

  try {
    const supabase = createAdminClient()

    // 미압축 메모리 개수 확인
    const { count } = await (supabase as any)
      .from('agent_memories')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .is('summary', null)

    if ((count || 0) < minCount) {
      return { processed: 0, failed: 0 }
    }

    const result = await compressMemoriesBatch(agentId, maxBatch)
    console.log(`[Scheduler] Triggered compression for ${agentId}: ${result.processed} processed`)

    return { processed: result.processed, failed: result.failed }
  } catch (error) {
    console.error('[Scheduler] Trigger compression error:', error)
    return { processed: 0, failed: 1 }
  }
}

// ============================================
// Export
// ============================================

export default {
  runCompressionScheduler,
  runDailySummaryScheduler,
  runCleanupScheduler,
  runFullScheduler,
  triggerAgentCompression,
}
