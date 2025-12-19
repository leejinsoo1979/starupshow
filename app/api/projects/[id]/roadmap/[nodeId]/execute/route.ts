export const dynamic = 'force-dynamic'
import { createClientForApi, getAuthUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

// POST /api/projects/[id]/roadmap/[nodeId]/execute - 노드 실행 (AI 보조)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  try {
    const supabase = createClientForApi()
    const { user } = await getAuthUser(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { input_data, force = false } = body

    // 노드 조회
    const { data: node, error: nodeError } = await (supabase as any)
      .from('roadmap_nodes')
      .select('*')
      .eq('id', params.nodeId)
      .eq('project_id', params.id)
      .single()

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    // 이미 실행 중인지 확인
    if ((node as any).status === 'running') {
      return NextResponse.json({ error: 'Node is already running' }, { status: 400 })
    }

    // 의존성 체크 (force가 아닌 경우)
    if (!force && (node as any).status === 'pending') {
      const { data: deps } = await (supabase as any)
        .from('node_dependencies')
        .select(`
          source_node:roadmap_nodes!node_dependencies_source_node_id_fkey(id, title, status)
        `)
        .eq('target_node_id', params.nodeId)

      const incompleteDeps = deps?.filter(
        (d: any) => d.source_node?.status !== 'completed'
      )

      if (incompleteDeps && incompleteDeps.length > 0) {
        return NextResponse.json({
          error: 'Dependencies not completed',
          incomplete_dependencies: incompleteDeps.map((d: any) => ({
            id: d.source_node?.id,
            title: d.source_node?.title,
            status: d.source_node?.status,
          })),
        }, { status: 400 })
      }
    }

    // 선행 노드들의 출력 수집
    const { data: prevOutputs } = await (supabase as any)
      .from('node_dependencies')
      .select(`
        source_node:roadmap_nodes!node_dependencies_source_node_id_fkey(id, title, output_data)
      `)
      .eq('target_node_id', params.nodeId)

    const collectedInputs = {
      ...input_data,
      previous_outputs: prevOutputs?.map((p: any) => ({
        node_id: p.source_node?.id,
        title: p.source_node?.title,
        output: p.source_node?.output_data,
      })) || [],
    }

    // 상태를 running으로 변경
    await (supabase as any)
      .from('roadmap_nodes')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: collectedInputs,
      })
      .eq('id', params.nodeId)

    // 로그 기록
    await (supabase as any).from('node_execution_logs').insert({
      node_id: params.nodeId,
      log_type: 'info',
      message: 'Node execution started',
      details: { input_data: collectedInputs, triggered_by: user.id },
      created_by: user.id,
    })

    // AI 보조 실행
    try {
      const aiResult = await executeWithAI(node, collectedInputs)

      // 자동화 레벨에 따른 처리
      if ((node as any).automation_level === 'full') {
        // Full: 바로 완료 처리
        await (supabase as any)
          .from('roadmap_nodes')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            output_data: aiResult.output,
            ai_suggestion: aiResult.suggestion,
            ai_analysis: aiResult.analysis,
          })
          .eq('id', params.nodeId)

        await (supabase as any).from('node_execution_logs').insert({
          node_id: params.nodeId,
          log_type: 'ai_response',
          message: 'AI execution completed (auto)',
          details: aiResult,
          ai_model: aiResult.model,
          tokens_used: aiResult.tokens,
          created_by: user.id,
        })

        return NextResponse.json({
          status: 'completed',
          result: aiResult,
          message: 'Node executed automatically',
        })
      } else {
        // Assisted/Manual: AI 추천만 저장, 대기 상태로
        await (supabase as any)
          .from('roadmap_nodes')
          .update({
            status: 'ready', // 사용자 승인 대기
            ai_suggestion: aiResult.suggestion,
            ai_analysis: aiResult.analysis,
          })
          .eq('id', params.nodeId)

        await (supabase as any).from('node_execution_logs').insert({
          node_id: params.nodeId,
          log_type: 'ai_response',
          message: 'AI suggestion generated, awaiting approval',
          details: aiResult,
          ai_model: aiResult.model,
          tokens_used: aiResult.tokens,
          created_by: user.id,
        })

        return NextResponse.json({
          status: 'awaiting_approval',
          suggestion: aiResult.suggestion,
          analysis: aiResult.analysis,
          message: 'AI suggestion ready. Please review and approve.',
        })
      }
    } catch (aiError: any) {
      // AI 실행 실패
      await (supabase as any)
        .from('roadmap_nodes')
        .update({
          status: 'failed',
          error_message: aiError.message,
          retry_count: ((node as any).retry_count || 0) + 1,
        })
        .eq('id', params.nodeId)

      await (supabase as any).from('node_execution_logs').insert({
        node_id: params.nodeId,
        log_type: 'error',
        message: `AI execution failed: ${aiError.message}`,
        details: { error: aiError.message, stack: aiError.stack },
        created_by: user.id,
      })

      return NextResponse.json({
        status: 'failed',
        error: aiError.message,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Node execute error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// AI 실행 함수
async function executeWithAI(
  node: any,
  inputData: any
): Promise<{
  output: any
  suggestion: string
  analysis: any
  model: string
  tokens: number
}> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
  })

  // 에이전트 유형에 따른 시스템 프롬프트
  const agentPrompts: Record<string, string> = {
    planner: '당신은 프로젝트 기획 전문가입니다. 요구사항을 분석하고 구체적인 실행 계획을 수립합니다.',
    designer: '당신은 UI/UX 디자인 전문가입니다. 사용자 경험을 고려한 디자인 방향을 제안합니다.',
    developer: '당신은 소프트웨어 개발 전문가입니다. 기술적 구현 방안과 코드 구조를 제안합니다.',
    qa: '당신은 QA 전문가입니다. 테스트 케이스와 품질 검증 방안을 제안합니다.',
    content: '당신은 콘텐츠 전문가입니다. 효과적인 콘텐츠 전략과 작성 방안을 제안합니다.',
    research: '당신은 리서치 전문가입니다. 시장 조사와 데이터 분석을 통해 인사이트를 도출합니다.',
    data: '당신은 데이터 분석 전문가입니다. 데이터를 분석하고 의미 있는 패턴을 찾습니다.',
    general: '당신은 프로젝트 업무 전문가입니다. 주어진 작업을 분석하고 최적의 실행 방안을 제안합니다.',
  }

  const systemPrompt = node.assigned_agent?.system_prompt ||
    agentPrompts[node.agent_type] ||
    agentPrompts.general

  const userPrompt = `
## 작업 정보
- 제목: ${node.title}
- 목표: ${node.goal || '명시되지 않음'}
- 설명: ${node.description || '없음'}

## 입력 데이터
${JSON.stringify(inputData, null, 2)}

## 요청
위 작업을 분석하고 다음을 제공해주세요:
1. **추천 실행 방안**: 이 작업을 어떻게 수행해야 하는지 구체적으로 설명
2. **예상 결과물**: 작업 완료 시 산출물 형태
3. **주의사항**: 실행 시 고려해야 할 점
4. **다음 단계 제안**: 이 작업 이후 수행할 작업

JSON 형식으로 응답해주세요:
{
  "suggestion": "추천 실행 방안 (마크다운)",
  "expected_output": "예상 결과물 설명",
  "considerations": ["주의사항1", "주의사항2"],
  "next_steps": ["다음 단계1", "다음 단계2"]
}
`

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ])

  // 응답 파싱
  let parsed: any = {}
  try {
    const content = response.content as string
    // JSON 블록 추출
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
    }
  } catch {
    parsed = {
      suggestion: response.content as string,
      expected_output: '',
      considerations: [],
      next_steps: [],
    }
  }

  return {
    output: {
      expected_output: parsed.expected_output,
      considerations: parsed.considerations,
      next_steps: parsed.next_steps,
    },
    suggestion: parsed.suggestion || response.content as string,
    analysis: {
      agent_type: node.agent_type,
      input_summary: Object.keys(inputData),
      confidence: 0.8,
    },
    model: 'gpt-4o-mini',
    tokens: response.usage_metadata?.total_tokens || 0,
  }
}
