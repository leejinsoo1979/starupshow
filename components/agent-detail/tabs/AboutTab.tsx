'use client'

import {
  Edit3,
  Save,
  Loader2,
  FileText,
  Heart,
  Sparkles,
  Zap,
  Target,
  MessageSquare,
  Briefcase,
  Lightbulb,
  CheckCircle,
  Workflow,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditableTagInput } from '../EditableTagInput'
import { AgentOSPanel } from '@/components/agent/AgentOSPanel'

interface AboutTabProps {
  agent: {
    id: string
    system_prompt?: string
    capabilities?: string[]
    workflow_nodes?: any[]
    identity?: {
      core_values?: string[]
      personality_traits?: string[]
      communication_style?: string
      strengths?: string[]
      growth_areas?: string[]
      self_summary?: string
      working_style?: string
      recent_focus?: string
      total_conversations?: number
      total_tasks_completed?: number
      total_decisions_made?: number
    }
  }
  isDark: boolean
  editingSection: string | null
  editForm: any
  setEditForm: (form: any) => void
  startEditing: (section: string, initialData: any) => void
  cancelEditing: () => void
  saveSection: (section: string) => Promise<void>
  saving: boolean
}

export function AboutTab({
  agent,
  isDark,
  editingSection,
  editForm,
  setEditForm,
  startEditing,
  cancelEditing,
  saveSection,
  saving,
}: AboutTabProps) {
  return (
    <div className="space-y-8">
      {/* Agent OS Panel - Radar Chart */}
      <AgentOSPanel agentId={agent.id} isDark={isDark} />

      {/* Profile Section */}
      <div>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
              프로필
            </h2>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              에이전트의 정체성과 성격
            </p>
          </div>
          {editingSection !== 'identity' && (
            <button
              onClick={() =>
                startEditing('identity', {
                  core_values: agent.identity?.core_values || [],
                  personality_traits: agent.identity?.personality_traits || [],
                  communication_style: agent.identity?.communication_style || '',
                  strengths: agent.identity?.strengths || [],
                  growth_areas: agent.identity?.growth_areas || [],
                  self_summary: agent.identity?.self_summary || '',
                  working_style: agent.identity?.working_style || '',
                  recent_focus: agent.identity?.recent_focus || '',
                })
              }
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              )}
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          )}
        </div>

        {editingSection === 'identity' ? (
          <div className="space-y-6">
            {/* Self Summary */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                자기 소개
              </label>
              <textarea
                value={editForm.self_summary || ''}
                onChange={(e) => setEditForm({ ...editForm, self_summary: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border resize-none',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
                placeholder="이 에이전트를 소개하는 문장을 입력하세요..."
                rows={3}
              />
            </div>

            {/* Core Values */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                핵심 가치
              </label>
              <EditableTagInput
                tags={editForm.core_values || []}
                onChange={(tags) => setEditForm({ ...editForm, core_values: tags })}
                placeholder="Enter를 눌러 추가 (예: 정확성, 창의성)"
                color="#ec4899"
                isDark={isDark}
              />
            </div>

            {/* Personality Traits */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                성격 특성
              </label>
              <EditableTagInput
                tags={editForm.personality_traits || []}
                onChange={(tags) => setEditForm({ ...editForm, personality_traits: tags })}
                placeholder="Enter를 눌러 추가 (예: 친절함, 분석적)"
                color="#8b5cf6"
                isDark={isDark}
              />
            </div>

            {/* Communication Style */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                소통 스타일
              </label>
              <input
                type="text"
                value={editForm.communication_style || ''}
                onChange={(e) => setEditForm({ ...editForm, communication_style: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
                placeholder="예: 친근하고 전문적인 톤"
              />
            </div>

            {/* Strengths */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                강점
              </label>
              <EditableTagInput
                tags={editForm.strengths || []}
                onChange={(tags) => setEditForm({ ...editForm, strengths: tags })}
                placeholder="Enter를 눌러 추가"
                color="#22c55e"
                isDark={isDark}
              />
            </div>

            {/* Growth Areas */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                성장 필요 영역
              </label>
              <EditableTagInput
                tags={editForm.growth_areas || []}
                onChange={(tags) => setEditForm({ ...editForm, growth_areas: tags })}
                placeholder="Enter를 눌러 추가"
                color="#f59e0b"
                isDark={isDark}
              />
            </div>

            {/* Working Style */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                업무 스타일
              </label>
              <input
                type="text"
                value={editForm.working_style || ''}
                onChange={(e) => setEditForm({ ...editForm, working_style: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
                placeholder="예: 꼼꼼하고 체계적인"
              />
            </div>

            {/* Recent Focus */}
            <div>
              <label className={cn('text-sm font-medium block mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                최근 집중 영역
              </label>
              <input
                type="text"
                value={editForm.recent_focus || ''}
                onChange={(e) => setEditForm({ ...editForm, recent_focus: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
                placeholder="예: 마케팅 전략 분석"
              />
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={cancelEditing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
                )}
              >
                취소
              </button>
              <button
                onClick={() => saveSection('identity')}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Self Summary Card */}
            <div className={cn(
              'p-6 rounded-2xl border-l-4 border-l-accent',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
            )}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className={cn('text-sm font-semibold mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                    자기 소개
                  </h4>
                  {agent.identity?.self_summary ? (
                    <p className={cn('text-base leading-relaxed', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
                      {agent.identity.self_summary}
                    </p>
                  ) : agent.system_prompt ? (
                    <p className={cn('text-base leading-relaxed', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                      {agent.system_prompt.slice(0, 300)}...
                    </p>
                  ) : (
                    <p className={cn('text-sm italic', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      아직 소개 정보가 없습니다. 편집 버튼을 눌러 추가해보세요.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Identity Grid */}
            {agent.identity && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Core Values */}
                {agent.identity.core_values && agent.identity.core_values.length > 0 && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="w-4 h-4 text-rose-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>핵심 가치</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.identity.core_values.map((value, idx) => (
                        <span key={idx} className={cn('px-3 py-1.5 rounded-lg text-sm', isDark ? 'bg-zinc-700/50 text-zinc-300' : 'bg-white text-zinc-600 shadow-sm')}>
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personality Traits */}
                {agent.identity.personality_traits && agent.identity.personality_traits.length > 0 && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>성격 특성</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.identity.personality_traits.map((trait, idx) => (
                        <span key={idx} className={cn('px-3 py-1.5 rounded-lg text-sm', isDark ? 'bg-zinc-700/50 text-zinc-300' : 'bg-white text-zinc-600 shadow-sm')}>
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {agent.identity.strengths && agent.identity.strengths.length > 0 && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>강점</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.identity.strengths.map((strength, idx) => (
                        <span key={idx} className={cn('px-3 py-1.5 rounded-lg text-sm', isDark ? 'bg-zinc-700/50 text-zinc-300' : 'bg-white text-zinc-600 shadow-sm')}>
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Growth Areas */}
                {agent.identity.growth_areas && agent.identity.growth_areas.length > 0 && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>성장 영역</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.identity.growth_areas.map((area, idx) => (
                        <span key={idx} className={cn('px-3 py-1.5 rounded-lg text-sm', isDark ? 'bg-zinc-700/50 text-zinc-300' : 'bg-white text-zinc-600 shadow-sm')}>
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Communication & Working Style */}
            {agent.identity && (agent.identity.communication_style || agent.identity.working_style) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {agent.identity.communication_style && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>소통 스타일</h4>
                    </div>
                    <p className={cn('text-sm leading-relaxed', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      {agent.identity.communication_style}
                    </p>
                  </div>
                )}
                {agent.identity.working_style && (
                  <div className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                      <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>업무 스타일</h4>
                    </div>
                    <p className={cn('text-sm leading-relaxed', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      {agent.identity.working_style}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Focus */}
            {agent.identity?.recent_focus && (
              <div className={cn('p-5 rounded-xl border mt-4', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h4 className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>최근 집중 영역</h4>
                </div>
                <p className={cn('text-sm leading-relaxed', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  {agent.identity.recent_focus}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>활동 통계</h3>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>에이전트 활동 현황</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '대화 수', value: agent.identity?.total_conversations || 0, icon: MessageSquare, color: 'text-blue-400' },
            { label: '완료 태스크', value: agent.identity?.total_tasks_completed || 0, icon: CheckCircle, color: 'text-emerald-400' },
            { label: '의사결정', value: agent.identity?.total_decisions_made || 0, icon: Lightbulb, color: 'text-amber-400' },
            { label: '워크플로우', value: agent.workflow_nodes?.length || 0, icon: Workflow, color: 'text-violet-400' },
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className={cn('p-5 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50/50 border-zinc-200')}>
                <Icon className={cn('w-5 h-5 mb-3', stat.color)} />
                <p className={cn('text-2xl font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>{stat.value}</p>
                <p className={cn('text-sm mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Capabilities - Editable */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>기능 & 역량</h3>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>에이전트가 수행할 수 있는 작업</p>
          </div>
          {editingSection !== 'capabilities' && (
            <button
              onClick={() => startEditing('capabilities', { capabilities: agent.capabilities || [] })}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              )}
            >
              <Edit3 className="w-4 h-4" />
              편집
            </button>
          )}
        </div>

        {editingSection === 'capabilities' ? (
          <div className="space-y-4">
            <EditableTagInput
              tags={(editForm.capabilities || []).filter((cap: string) => !cap.startsWith('team:'))}
              onChange={(tags) => {
                const teamTags = (editForm.capabilities || []).filter((cap: string) => cap.startsWith('team:'))
                setEditForm({ ...editForm, capabilities: [...teamTags, ...tags] })
              }}
              placeholder="Enter를 눌러 기능 추가 (예: 마케팅 분석, 데이터 시각화)"
              color="#3b82f6"
              isDark={isDark}
            />
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={cancelEditing}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'
                )}
              >
                취소
              </button>
              <button
                onClick={() => saveSection('capabilities')}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        ) : agent.capabilities && agent.capabilities.filter((cap) => !cap.startsWith('team:')).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agent.capabilities
              .filter((cap) => !cap.startsWith('team:'))
              .map((cap, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'group flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md',
                    isDark
                      ? 'bg-zinc-800/30 border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-800/50'
                      : 'bg-zinc-50 border-zinc-200 hover:border-indigo-300 hover:bg-white'
                  )}
                >
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 flex items-center justify-center group-hover:from-indigo-500/20 group-hover:to-blue-500/20 transition-all">
                    <Zap className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
                    {cap}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className={cn(
            'flex flex-col items-center justify-center py-12 rounded-xl border border-dashed',
            isDark ? 'border-zinc-700 bg-zinc-800/20' : 'border-zinc-300 bg-zinc-50'
          )}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <p className={cn('text-sm mb-2', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              등록된 기능이 없습니다
            </p>
            <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              편집 버튼을 눌러 기능을 추가해보세요
            </p>
          </div>
        )}
      </div>

      {/* MCP Tools Section */}
      <div className={cn(
        'p-6 rounded-2xl border',
        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>MCP 도구</h3>
            <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-500')}>Connected Tools</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Web Search Tool */}
          <div
            className={cn(
              'p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors',
              (agent.capabilities?.includes('web_search') || agent.capabilities?.includes('research') || !agent.capabilities?.length)
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-emerald-50 border-emerald-200'
                : isDark
                  ? 'bg-zinc-800/50 border-zinc-800 opacity-50'
                  : 'bg-zinc-100 border-zinc-200 opacity-50'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                (agent.capabilities?.includes('web_search') || agent.capabilities?.includes('research') || !agent.capabilities?.length)
                  ? 'bg-emerald-500/20'
                  : 'bg-zinc-500/20'
              )}>
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                  웹 검색
                </h4>
                <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Tavily API
                </p>
              </div>
            </div>
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              실시간 웹 검색으로 최신 정보 수집
            </p>
          </div>

          {/* YouTube Transcript Tool */}
          <div
            className={cn(
              'p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors',
              (agent.capabilities?.includes('youtube') || agent.capabilities?.includes('youtube_transcript') || !agent.capabilities?.length)
                ? isDark
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-red-50 border-red-200'
                : isDark
                  ? 'bg-zinc-800/50 border-zinc-800 opacity-50'
                  : 'bg-zinc-100 border-zinc-200 opacity-50'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                (agent.capabilities?.includes('youtube') || agent.capabilities?.includes('youtube_transcript') || !agent.capabilities?.length)
                  ? 'bg-red-500/20'
                  : 'bg-zinc-500/20'
              )}>
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <div>
                <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                  YouTube 분석
                </h4>
                <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Transcript API
                </p>
              </div>
            </div>
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              영상 자막 추출 및 내용 분석
            </p>
          </div>

          {/* Web Fetch Tool */}
          <div
            className={cn(
              'p-4 md:p-5 rounded-xl md:rounded-2xl border transition-colors',
              (agent.capabilities?.includes('web_fetch') || agent.capabilities?.includes('web_browse') || !agent.capabilities?.length)
                ? isDark
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
                : isDark
                  ? 'bg-zinc-800/50 border-zinc-800 opacity-50'
                  : 'bg-zinc-100 border-zinc-200 opacity-50'
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                (agent.capabilities?.includes('web_fetch') || agent.capabilities?.includes('web_browse') || !agent.capabilities?.length)
                  ? 'bg-blue-500/20'
                  : 'bg-zinc-500/20'
              )}>
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h4 className={cn('font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
                  웹페이지 읽기
                </h4>
                <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Web Fetch
                </p>
              </div>
            </div>
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              URL에서 텍스트 내용 추출
            </p>
          </div>
        </div>
        <p className={cn('text-xs mt-4', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          * 기능에 web_search, youtube, web_fetch 등을 추가하면 해당 도구가 활성화됩니다. 기능이 없으면 모든 도구가 기본으로 활성화됩니다.
        </p>
      </div>
    </div>
  )
}
