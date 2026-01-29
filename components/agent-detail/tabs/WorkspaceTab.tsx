'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Clock,
  FileText,
  FolderOpen,
  MessageSquare,
  Target,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '../utils'
import { logTypeLabels } from '../constants'

interface WorkspaceTabProps {
  agent: {
    id: string
    team?: { id: string; name: string; description?: string } | null
    chat_rooms?: Array<{
      id: string
      name?: string
      type?: string
      last_message_at?: string
    }>
    tasks?: Array<{
      id: string
      title: string
      status: string
      project?: { name: string }
    }>
    project_stats?: Array<{
      id: string
      name: string
      count: number
      lastActivity?: string
    }>
    work_logs?: Array<{
      id: string
      log_type: string
      title: string
      summary?: string
      created_at: string
    }>
  }
  isDark: boolean
  mounted: boolean
}

export function WorkspaceTab({ agent, isDark, mounted }: WorkspaceTabProps) {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <div>
        <h2 className={cn('text-2xl md:text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
          워크스페이스
        </h2>
        <div className="w-10 h-1 bg-accent rounded-full mb-6" />
      </div>

      {/* Team Info */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-blue-500" />
          <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>소속 팀</h4>
        </div>
        {agent.team ? (
          <div
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-opacity-80 transition',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
            onClick={() => router.push(`/dashboard-group/team/${agent.team!.id}`)}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                isDark ? 'bg-zinc-800' : 'bg-zinc-100'
              )}
            >
              <Building className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                {agent.team.name}
              </p>
              {agent.team.description && (
                <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  {agent.team.description}
                </p>
              )}
            </div>
            <ArrowLeft className="w-5 h-5 rotate-180 text-zinc-400" />
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            소속된 팀이 없습니다
          </p>
        )}
      </div>

      {/* Active Chat Rooms */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-green-500" />
          <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>참여 중인 채팅방</h4>
          <span
            className={cn(
              'ml-auto text-xs px-2 py-0.5 rounded-full',
              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
            )}
          >
            {agent.chat_rooms?.length || 0}개
          </span>
        </div>
        {agent.chat_rooms && agent.chat_rooms.length > 0 ? (
          <div className="space-y-2">
            {agent.chat_rooms.map((room) => (
              <div
                key={room.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-opacity-80 transition',
                  isDark ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white hover:bg-zinc-50'
                )}
                onClick={() => router.push(`/dashboard-group/messenger?room=${room.id}`)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                  )}
                >
                  {room.type === 'group' ? (
                    <Users className="w-5 h-5 text-green-500" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                    {room.name || '채팅방'}
                  </p>
                  <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    {formatTimeAgo(room.last_message_at || null, mounted)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            참여 중인 채팅방이 없습니다
          </p>
        )}
      </div>

      {/* Related Tasks */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-500" />
          <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>관련 태스크</h4>
          <span
            className={cn(
              'ml-auto text-xs px-2 py-0.5 rounded-full',
              isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
            )}
          >
            {agent.tasks?.length || 0}개
          </span>
        </div>
        {agent.tasks && agent.tasks.length > 0 ? (
          <div className="space-y-2">
            {agent.tasks.map((task) => (
              <div
                key={task.id}
                className={cn('p-3 rounded-lg', isDark ? 'bg-zinc-900' : 'bg-white')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      task.status === 'done'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    )}
                  >
                    {task.status === 'done' ? '완료' : task.status === 'in_progress' ? '진행 중' : '대기'}
                  </span>
                  {task.project && (
                    <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      {task.project.name}
                    </span>
                  )}
                </div>
                <p className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            관련 태스크가 없습니다
          </p>
        )}
      </div>

      {/* Project Activity Stats */}
      {agent.project_stats && agent.project_stats.length > 0 && (
        <div
          className={cn(
            'p-4 md:p-6 rounded-xl md:rounded-2xl border',
            isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-orange-500" />
            <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>프로젝트 활동</h4>
          </div>
          <div className="space-y-2">
            {agent.project_stats.map((stat) => (
              <div
                key={stat.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  isDark ? 'bg-zinc-900' : 'bg-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}
                  >
                    <FolderOpen className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                      {stat.name}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      마지막 활동: {formatTimeAgo(stat.lastActivity || null, mounted)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">{stat.count}</p>
                  <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>활동 수</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Timeline */}
      <div
        className={cn(
          'p-4 md:p-6 rounded-xl md:rounded-2xl border',
          isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-cyan-500" />
          <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>최근 활동 타임라인</h4>
        </div>
        {agent.work_logs && agent.work_logs.length > 0 ? (
          <div className="relative">
            <div className={cn('absolute left-5 top-0 bottom-0 w-px', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
            <div className="space-y-4">
              {agent.work_logs.slice(0, 10).map((log) => {
                const logType = logTypeLabels[log.log_type] || {
                  label: log.log_type,
                  icon: FileText,
                  color: '#6b7280',
                }
                const LogIcon = logType.icon
                return (
                  <div key={log.id} className="flex items-start gap-4 relative">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                      style={{ backgroundColor: `${logType.color}20` }}
                    >
                      <LogIcon className="w-5 h-5" style={{ color: logType.color }} />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                          {log.title}
                        </span>
                        <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                          {formatTimeAgo(log.created_at, mounted)}
                        </span>
                      </div>
                      {log.summary && (
                        <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                          {log.summary}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            아직 활동 기록이 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
