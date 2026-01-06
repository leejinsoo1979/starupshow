// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getAuthUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET: 사업계획서 상세 조회
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { user, error: authError } = await getAuthUser(supabase)

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        // 기본 플랜 조회 (template 관계 없이, admin client 사용)
        const { data: plan, error } = await adminSupabase
            .from('business_plans')
            .select(`
                *,
                program:government_programs(id, title, organization, category, apply_end_date)
            `)
            .eq('id', id)
            .single()

        // 별도로 섹션 조회
        let sections: any[] = []
        if (plan) {
            const { data: sectionData } = await adminSupabase
                .from('business_plan_sections')
                .select('*')
                .eq('plan_id', id)
                .order('section_order')
            sections = sectionData || []
        }

        if (error) throw error

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
        }

        // 질문 조회
        const { data: questions } = await supabase
            .from('plan_questions')
            .select('*')
            .eq('plan_id', id)
            .eq('status', 'pending')
            .order('priority')

        // 실행 로그 조회
        const { data: logs } = await supabase
            .from('pipeline_execution_logs')
            .select('*')
            .eq('plan_id', id)
            .order('created_at', { ascending: false })
            .limit(10)

        return NextResponse.json({
            plan: {
                ...plan,
                sections
            },
            questions,
            logs
        })
    } catch (error: any) {
        console.error('[BusinessPlan] GET Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch business plan' },
            { status: 500 }
        )
    }
}

/**
 * PUT: 사업계획서 업데이트
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()
        const { user, error: authError } = await getAuthUser(supabase)

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { title, project_name, assigned_to, reviewers } = body

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        // 본인 확인
        const { data: existing } = await adminSupabase
            .from('business_plans')
            .select('company_id')
            .eq('id', id)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Business plan not found' }, { status: 404 })
        }

        // 업데이트 데이터 구성
        const updateData: any = {}
        if (title !== undefined) updateData.title = title
        if (project_name !== undefined) updateData.project_name = project_name
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to
        if (reviewers !== undefined) updateData.reviewers = reviewers

        // 업데이트
        const { data: updated, error } = await adminSupabase
            .from('business_plans')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            plan: updated
        })

    } catch (error: any) {
        console.error('[BusinessPlan] PUT Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update business plan' },
            { status: 500 }
        )
    }
}

/**
 * DELETE: 사업계획서 삭제
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()
        const { user, error: authError } = await getAuthUser(supabase)

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // 삭제
        const { error } = await adminSupabase
            .from('business_plans')
            .delete()
            .eq('id', id)

        if (error) {
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Business plan deleted'
        })

    } catch (error: any) {
        console.error('[BusinessPlan] DELETE Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete business plan' },
            { status: 500 }
        )
    }
}
