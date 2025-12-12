import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Team interface
interface Team {
  id: string
  name: string
  founder_id: string
  work_style: string
  industry?: string
  description?: string
  logo_url?: string
  website?: string
  is_open_call: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

interface TeamMemberRow {
  user_id: string
  role: string
}

// GET /api/teams/[id] - Get single team details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = params.id

  try {
    // Get team
    const { data: team, error: teamError } = await (adminClient
      .from('teams') as any)
      .select('*')
      .eq('id', teamId)
      .single() as { data: Team | null; error: any }

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check access: must be founder or member
    const isFounder = team.founder_id === user.id

    if (!isFounder) {
      const { data: membership } = await (adminClient
        .from('team_members') as any)
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single() as { data: { role: string } | null; error: any }

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get member count
    const { data: members } = await (adminClient
      .from('team_members') as any)
      .select('user_id, role')
      .eq('team_id', teamId) as { data: TeamMemberRow[] | null; error: any }

    return NextResponse.json({
      data: {
        ...team,
        userRole: isFounder ? 'founder' : 'member',
        memberCount: (members?.length || 0) + 1,
      }
    })
  } catch (error) {
    console.error('GET /api/teams/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = params.id

  try {
    // Check if user is founder of this team
    const { data: team, error: teamError } = await (adminClient
      .from('teams') as any)
      .select('founder_id')
      .eq('id', teamId)
      .single() as { data: { founder_id: string } | null; error: any }

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.founder_id !== user.id) {
      return NextResponse.json({ error: 'Only the founder can update the team' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, industry, work_style, website, is_open_call, is_public } = body

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (industry !== undefined) updateData.industry = industry
    if (work_style !== undefined) updateData.work_style = work_style
    if (website !== undefined) updateData.website = website
    if (is_open_call !== undefined) updateData.is_open_call = is_open_call
    if (is_public !== undefined) updateData.is_public = is_public

    // Update team
    const { data: updatedTeam, error: updateError } = await (adminClient
      .from('teams') as any)
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single() as { data: Team | null; error: any }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updatedTeam })
  } catch (error) {
    console.error('PATCH /api/teams/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminClient = createAdminClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teamId = params.id

  try {
    // Check if user is founder of this team
    const { data: teamData, error: teamError } = await (adminClient
      .from('teams') as any)
      .select('founder_id')
      .eq('id', teamId)
      .single() as { data: { founder_id: string } | null; error: any }

    if (teamError || !teamData) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (teamData.founder_id !== user.id) {
      return NextResponse.json({ error: 'Only the founder can delete the team' }, { status: 403 })
    }

    // Delete team members first
    await (adminClient
      .from('team_members') as any)
      .delete()
      .eq('team_id', teamId)

    // Delete the team
    const { error: deleteError } = await (adminClient
      .from('teams') as any)
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/teams/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
