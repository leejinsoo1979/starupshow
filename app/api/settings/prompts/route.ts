import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  WORK_OPERATING_MODEL,
  HUMAN_COMMUNICATION_RULES,
  PROFESSIONAL_HABITS,
  NO_HALLUCINATION_POLICY,
  COLLABORATION_CONFLICT_RULES,
  DELIVERABLE_TEMPLATES,
  CONTEXT_ANCHOR,
  RESPONSE_FORMAT_RULES,
  MESSENGER_CHAT_RULES,
} from '@/lib/agent/shared-prompts'

// 기본값 (shared-prompts.ts에서 가져옴)
const DEFAULT_PROMPTS = {
  work_operating_model: WORK_OPERATING_MODEL,
  human_communication: HUMAN_COMMUNICATION_RULES,
  professional_habits: PROFESSIONAL_HABITS,
  no_hallucination: NO_HALLUCINATION_POLICY,
  collaboration_conflict: COLLABORATION_CONFLICT_RULES,
  deliverable_templates: DELIVERABLE_TEMPLATES,
  context_anchor: CONTEXT_ANCHOR,
  response_format: RESPONSE_FORMAT_RULES,
  messenger_rules: MESSENGER_CHAT_RULES,
}

// GET - 프롬프트 설정 조회
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 유저의 팀 ID 가져오기
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      // 팀이 없으면 기본값 반환
      return NextResponse.json(DEFAULT_PROMPTS)
    }

    // 팀의 프롬프트 설정 조회
    const { data: settings, error } = await supabase
      .from('agent_prompt_settings')
      .select('*')
      .eq('team_id', teamMember.team_id)
      .single()

    if (error || !settings) {
      // 설정이 없으면 기본값 반환
      return NextResponse.json(DEFAULT_PROMPTS)
    }

    // 빈 값은 기본값으로 대체
    return NextResponse.json({
      work_operating_model: settings.work_operating_model || DEFAULT_PROMPTS.work_operating_model,
      human_communication: settings.human_communication || DEFAULT_PROMPTS.human_communication,
      professional_habits: settings.professional_habits || DEFAULT_PROMPTS.professional_habits,
      no_hallucination: settings.no_hallucination || DEFAULT_PROMPTS.no_hallucination,
      collaboration_conflict: settings.collaboration_conflict || DEFAULT_PROMPTS.collaboration_conflict,
      deliverable_templates: settings.deliverable_templates || DEFAULT_PROMPTS.deliverable_templates,
      context_anchor: settings.context_anchor || DEFAULT_PROMPTS.context_anchor,
      response_format: settings.response_format || DEFAULT_PROMPTS.response_format,
      messenger_rules: settings.messenger_rules || DEFAULT_PROMPTS.messenger_rules,
    })
  } catch (error) {
    console.error('Error fetching prompt settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - 프롬프트 설정 업데이트
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 유저의 팀 ID 가져오기
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    // upsert (있으면 업데이트, 없으면 생성)
    const { data, error } = await supabase
      .from('agent_prompt_settings')
      .upsert({
        team_id: teamMember.team_id,
        work_operating_model: body.work_operating_model,
        human_communication: body.human_communication,
        professional_habits: body.professional_habits,
        no_hallucination: body.no_hallucination,
        collaboration_conflict: body.collaboration_conflict,
        deliverable_templates: body.deliverable_templates,
        context_anchor: body.context_anchor,
        response_format: body.response_format,
        messenger_rules: body.messenger_rules,
      }, {
        onConflict: 'team_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating prompt settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating prompt settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - 기본값으로 초기화
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 유저의 팀 ID 가져오기
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    // 기본값으로 upsert
    const { data, error } = await supabase
      .from('agent_prompt_settings')
      .upsert({
        team_id: teamMember.team_id,
        ...DEFAULT_PROMPTS,
      }, {
        onConflict: 'team_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error resetting prompt settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error resetting prompt settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
