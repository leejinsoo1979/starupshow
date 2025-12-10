import { openai, AI_CONFIG, type AIResponse } from './openai'
import { PROMPTS, fillPrompt } from './prompts'
import type { Task, Startup } from '@/types'

// 태스크 분석 결과 타입
export interface TaskAnalysis {
  summary: string
  complexityScore: number
  impactLevel: 'low' | 'medium' | 'high'
  risks: string[]
  recommendedActions: string[]
}

// 커밋 인사이트 결과 타입
export interface CommitInsight {
  summary: string
  businessImpact: 'low' | 'medium' | 'high'
  productivityScore: number
  nextRecommendations: string[]
  investorHighlight: string
}

// 리스크 예측 결과 타입
export interface RiskPrediction {
  overallRiskScore: number
  financialRisk: 'low' | 'medium' | 'high' | 'critical'
  operationalRisk: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
  recommendations: string[]
}

// 주간 리포트 결과 타입
export interface WeeklyReport {
  highlights: string[]
  kpiSummary: string
  nextWeekPlan: string[]
  investorAppeal: string
}

/**
 * 태스크 분석 서비스
 */
export async function analyzeTask(task: Partial<Task>): Promise<AIResponse<TaskAnalysis>> {
  try {
    const prompt = fillPrompt(PROMPTS.TASK_ANALYSIS, {
      title: task.title || '',
      description: task.description || '설명 없음',
      status: task.status || 'TODO',
      priority: task.priority || 'MEDIUM',
      estimatedHours: task.estimated_hours || 0,
      dueDate: task.due_date || '미정',
    })

    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      messages: [
        { role: 'system', content: '당신은 JSON 형식으로만 응답하는 AI 분석가입니다.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 응답 없음')

    const data = JSON.parse(content) as TaskAnalysis
    return { success: true, data }
  } catch (error) {
    console.error('Task analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    }
  }
}

/**
 * 커밋 인사이트 생성 서비스
 */
export async function generateCommitInsight(task: Partial<Task>): Promise<AIResponse<CommitInsight>> {
  try {
    const prompt = fillPrompt(PROMPTS.COMMIT_INSIGHT, {
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'MEDIUM',
      actualHours: task.actual_hours || 0,
      completedAt: task.completed_at || new Date().toISOString(),
    })

    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      messages: [
        { role: 'system', content: '당신은 JSON 형식으로만 응답하는 AI 분석가입니다.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 응답 없음')

    const data = JSON.parse(content) as CommitInsight
    return { success: true, data }
  } catch (error) {
    console.error('Commit insight error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    }
  }
}

/**
 * 리스크 예측 서비스
 */
export async function predictRisk(
  startup: Partial<Startup>,
  taskStats: {
    totalTasks: number
    completedTasks: number
    delayedTasks: number
    blockedTasks: number
  }
): Promise<AIResponse<RiskPrediction>> {
  try {
    const prompt = fillPrompt(PROMPTS.RISK_PREDICTION, {
      name: startup.name || '',
      industry: startup.industry || '미정',
      stage: startup.stage || 'IDEA',
      monthlyRevenue: startup.monthly_revenue || 0,
      monthlyBurn: startup.monthly_burn || 0,
      runwayMonths: startup.runway_months || 0,
      employeeCount: startup.employee_count || 0,
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      delayedTasks: taskStats.delayedTasks,
      blockedTasks: taskStats.blockedTasks,
    })

    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      messages: [
        { role: 'system', content: '당신은 JSON 형식으로만 응답하는 AI 리스크 분석가입니다.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 응답 없음')

    const data = JSON.parse(content) as RiskPrediction
    return { success: true, data }
  } catch (error) {
    console.error('Risk prediction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    }
  }
}

/**
 * 주간 리포트 생성 서비스
 */
export async function generateWeeklyReport(
  startDate: string,
  endDate: string,
  completedTasks: string,
  kpiChanges: string,
  milestones: string
): Promise<AIResponse<WeeklyReport>> {
  try {
    const prompt = fillPrompt(PROMPTS.WEEKLY_REPORT, {
      startDate,
      endDate,
      completedTasks,
      kpiChanges,
      milestones,
    })

    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens,
      messages: [
        { role: 'system', content: '당신은 JSON 형식으로만 응답하는 IR 전문가입니다.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 응답 없음')

    const data = JSON.parse(content) as WeeklyReport
    return { success: true, data }
  } catch (error) {
    console.error('Weekly report error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 분석 실패'
    }
  }
}
