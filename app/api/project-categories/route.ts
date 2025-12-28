export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDevMode, DEV_USER } from '@/lib/dev-user'

// GET: 카테고리 목록 조회
export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('project_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Categories fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// POST: 새 카테고리 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: '카테고리 이름이 필요합니다' }, { status: 400 })
    }

    // 최대 sort_order 조회
    const { data: maxOrder } = await (adminClient as any)
      .from('project_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const newSortOrder = ((maxOrder as any)?.sort_order || 0) + 1

    const { data, error } = await (adminClient as any)
      .from('project_categories')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        icon: body.icon || 'Folder',
        color: body.color || '#8B5CF6',
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Category create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Category create API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// PATCH: 카테고리 수정
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: '카테고리 ID가 필요합니다' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.color !== undefined) updateData.color = body.color
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

    const { data, error } = await (adminClient as any)
      .from('project_categories')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Category update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Category update API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}

// DELETE: 카테고리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    let user: any = isDevMode() ? DEV_USER : null
    if (!user) {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '카테고리 ID가 필요합니다' }, { status: 400 })
    }

    // 기본 카테고리는 삭제 불가
    const defaultIds = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
    ]
    if (defaultIds.includes(id)) {
      return NextResponse.json({ error: '기본 카테고리는 삭제할 수 없습니다' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('project_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Category delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category delete API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}
