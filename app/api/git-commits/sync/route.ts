export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

interface GitCommit {
  hash: string
  message: string
  author_name: string
  author_email: string
  date: string
  files_changed: number
  insertions: number
  deletions: number
  branch: string
}

// Parse git log output
function parseGitLog(output: string): GitCommit[] {
  const commits: GitCommit[] = []
  const lines = output.trim().split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Format: hash|message|author_name|author_email|date|files|insertions|deletions
    const parts = line.split('|')
    if (parts.length >= 5) {
      commits.push({
        hash: parts[0],
        message: parts[1] || 'No message',
        author_name: parts[2] || 'Unknown',
        author_email: parts[3] || '',
        date: parts[4],
        files_changed: parseInt(parts[5]) || 0,
        insertions: parseInt(parts[6]) || 0,
        deletions: parseInt(parts[7]) || 0,
        branch: 'main'
      })
    }
  }

  return commits
}

// Get current branch name
async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath })
    return stdout.trim() || 'main'
  } catch {
    return 'main'
  }
}

// Get commits from a git repository
async function getGitCommits(repoPath: string, limit: number = 50): Promise<GitCommit[]> {
  try {
    // Check if directory exists and is a git repo
    if (!fs.existsSync(repoPath)) {
      console.log(`[Git Sync] Path does not exist: ${repoPath}`)
      return []
    }

    const gitDir = path.join(repoPath, '.git')
    if (!fs.existsSync(gitDir)) {
      console.log(`[Git Sync] Not a git repo: ${repoPath}`)
      return []
    }

    const branch = await getCurrentBranch(repoPath)

    // Get commit log with stats
    // Format: hash|subject|author_name|author_email|date
    const format = '%H|%s|%an|%ae|%aI'
    const { stdout: logOutput } = await execAsync(
      `git log --format="${format}" -n ${limit}`,
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
    )

    const commits = parseGitLog(logOutput)

    // Get stats for each commit (files changed, insertions, deletions)
    for (const commit of commits) {
      commit.branch = branch
      try {
        const { stdout: statsOutput } = await execAsync(
          `git show --stat --format="" ${commit.hash} | tail -1`,
          { cwd: repoPath }
        )
        // Parse: "X files changed, Y insertions(+), Z deletions(-)"
        const statsMatch = statsOutput.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/)
        if (statsMatch) {
          commit.files_changed = parseInt(statsMatch[1]) || 0
          commit.insertions = parseInt(statsMatch[2]) || 0
          commit.deletions = parseInt(statsMatch[3]) || 0
        }
      } catch {
        // Stats parsing failed, keep defaults
      }
    }

    return commits
  } catch (error) {
    console.error(`[Git Sync] Error getting commits from ${repoPath}:`, error)
    return []
  }
}

// POST: Sync git commits from all projects or specific project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { project_id, limit = 30 } = body

    const adminSupabase = createAdminClient()

    // Get projects with folder_path
    let query = adminSupabase
      .from('projects')
      .select('id, name, folder_path, owner_id')
      .not('folder_path', 'is', null)

    if (project_id) {
      query = query.eq('id', project_id)
    }

    const { data: projects, error: projectsError } = await query

    if (projectsError) {
      console.error('[Git Sync] Projects query error:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ message: 'No projects with folder_path found', synced: 0 })
    }

    let totalSynced = 0
    const results: { project: string; synced: number; error?: string }[] = []

    for (const project of projects) {
      if (!project.folder_path) continue

      try {
        const commits = await getGitCommits(project.folder_path, limit)

        if (commits.length === 0) {
          results.push({ project: project.name, synced: 0, error: 'No commits or not a git repo' })
          continue
        }

        // Get existing commit hashes for this project
        const { data: existingCommits } = await adminSupabase
          .from('git_commits')
          .select('commit_hash')
          .eq('project_id', project.id)

        const existingHashes = new Set((existingCommits || []).map(c => c.commit_hash))

        // Filter out commits that already exist
        const newCommits = commits.filter(c => !existingHashes.has(c.hash))

        if (newCommits.length === 0) {
          results.push({ project: project.name, synced: 0, error: 'All commits already synced' })
          continue
        }

        // Insert only new commits
        const commitRecords = newCommits.map(commit => ({
          project_id: project.id,
          user_id: project.owner_id || '00000000-0000-0000-0000-000000000001',
          commit_hash: commit.hash,
          commit_message: commit.message.substring(0, 500), // Limit message length
          author_name: commit.author_name,
          files_changed: commit.files_changed,
          insertions: commit.insertions,
          deletions: commit.deletions,
          branch: commit.branch,
          committed_at: commit.date
        }))

        const { error: insertError } = await adminSupabase
          .from('git_commits')
          .insert(commitRecords)

        if (insertError) {
          console.error(`[Git Sync] Insert error for ${project.name}:`, insertError)
          results.push({ project: project.name, synced: 0, error: insertError.message })
        } else {
          totalSynced += newCommits.length
          results.push({ project: project.name, synced: newCommits.length })
        }
      } catch (err: any) {
        console.error(`[Git Sync] Error syncing ${project.name}:`, err)
        results.push({ project: project.name, synced: 0, error: err.message })
      }
    }

    return NextResponse.json({
      message: `Synced ${totalSynced} commits from ${projects.length} projects`,
      totalSynced,
      results
    })
  } catch (error: any) {
    console.error('[Git Sync] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: Check sync status / trigger sync for current project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    const adminSupabase = createAdminClient()

    // Get latest commit timestamps per project
    let query = adminSupabase
      .from('git_commits')
      .select('project_id, committed_at')
      .order('committed_at', { ascending: false })

    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: commits } = await query.limit(100)

    // Group by project
    const projectStats: Record<string, { count: number; latest: string }> = {}
    commits?.forEach(commit => {
      if (!projectStats[commit.project_id]) {
        projectStats[commit.project_id] = { count: 0, latest: commit.committed_at }
      }
      projectStats[commit.project_id].count++
    })

    return NextResponse.json({
      status: 'ok',
      projects: projectStats,
      total: commits?.length || 0
    })
  } catch (error: any) {
    console.error('[Git Sync] Status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
