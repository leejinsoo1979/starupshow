'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react'

// Types
interface ApiConnection {
  id: string
  name: string
  description?: string
  provider_type: 'preset' | 'custom' | 'openapi'
  base_url: string
  auth_type: string
  endpoints: Array<{
    id: string
    name: string
    method: string
    path: string
    description?: string
  }>
  is_active: boolean
  last_used_at?: string
  last_error?: string
}

interface ApiPreset {
  id: string
  name: string
  description?: string
  category: string
  base_url: string
  auth_type: string
  auth_config_template: any
  endpoints: any[]
  setup_guide?: string
  api_key_url?: string
  documentation_url?: string
}

// API 카테고리 한글 라벨
const apiCategoryLabels: Record<string, string> = {
  government: '정부/공공',
  startup: '스타트업',
  finance: '금융',
  weather: '날씨',
  search: '검색',
  news: '뉴스',
  social: '소셜',
  other: '기타',
}

interface ApiConnectionsTabProps {
  agentId: string
  isDark: boolean
}

export function ApiConnectionsTab({ agentId, isDark }: ApiConnectionsTabProps) {
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ApiConnection[]>([])
  const [presets, setPresets] = useState<ApiPreset[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<ApiPreset | null>(null)
  const [testingApi, setTestingApi] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_url: '',
    auth_type: 'api_key',
    api_key: '',
    api_secret: '',
    preset_id: '',
  })

  useEffect(() => {
    loadData()
  }, [agentId])

  const loadData = async () => {
    try {
      setLoading(true)

      // API 연결 목록 로드
      const connRes = await fetch(`/api/agents/${agentId}/apis`)
      if (connRes.ok) {
        const data = await connRes.json()
        setConnections(data.connections || [])
      }

      // 프리셋 목록 로드
      const presetRes = await fetch('/api/public-apis')
      if (presetRes.ok) {
        const data = await presetRes.json()
        setPresets(data.presets || [])
      }
    } catch (err) {
      console.error('Failed to load API data:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectPreset = (preset: ApiPreset) => {
    setSelectedPreset(preset)
    setFormData({
      ...formData,
      name: preset.name,
      description: preset.description || '',
      base_url: preset.base_url,
      auth_type: preset.auth_type,
      preset_id: preset.id,
    })
  }

  const addConnection = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/apis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          provider_type: selectedPreset ? 'preset' : 'custom',
          preset_id: formData.preset_id || undefined,
          base_url: formData.base_url,
          auth_type: formData.auth_type,
          auth_config: {
            key: formData.api_key,
            secret: formData.api_secret,
            ...(selectedPreset?.auth_config_template || {}),
          },
          endpoints: selectedPreset?.endpoints || [],
        }),
      })

      if (res.ok) {
        await loadData()
        setShowAddModal(false)
        resetForm()
      }
    } catch (err) {
      console.error('Failed to add API connection:', err)
    }
  }

  const deleteConnection = async (connectionId: string) => {
    if (!confirm('이 API 연결을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/agents/${agentId}/apis/${connectionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setConnections(connections.filter((c) => c.id !== connectionId))
      }
    } catch (err) {
      console.error('Failed to delete API connection:', err)
    }
  }

  const testConnection = async (connectionId: string) => {
    try {
      setTestingApi(connectionId)
      setTestResult(null)

      const res = await fetch(`/api/agents/${agentId}/apis/${connectionId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await res.json()
      setTestResult({ connectionId, ...result })
    } catch (err) {
      setTestResult({ connectionId, success: false, error: '테스트 실패' })
    } finally {
      setTestingApi(null)
    }
  }

  const toggleActive = async (connectionId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/apis/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (res.ok) {
        setConnections(
          connections.map((c) =>
            c.id === connectionId ? { ...c, is_active: !isActive } : c
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle API connection:', err)
    }
  }

  const resetForm = () => {
    setSelectedPreset(null)
    setFormData({
      name: '',
      description: '',
      base_url: '',
      auth_type: 'api_key',
      api_key: '',
      api_secret: '',
      preset_id: '',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // 카테고리별 프리셋 그룹화
  const presetsByCategory = presets.reduce((acc, preset) => {
    const cat = preset.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(preset)
    return acc
  }, {} as Record<string, ApiPreset[]>)

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl md:text-3xl font-bold mb-2', isDark ? 'text-white' : 'text-zinc-900')}>
            API 연결
          </h2>
          <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
            외부 API를 연결하여 에이전트가 실시간 정보를 수집할 수 있습니다
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          API 추가
        </Button>
      </div>

      {/* 연결된 API 목록 */}
      {connections.length > 0 ? (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className={cn(
                'p-4 rounded-xl border transition-all',
                isDark
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* 상태 표시기 */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      conn.is_active
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-gray-500/10 text-gray-500'
                    )}
                  >
                    <Zap className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        {conn.name}
                      </h3>
                      {conn.provider_type === 'preset' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500">
                          공공 API
                        </span>
                      )}
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          conn.is_active
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-gray-500/10 text-gray-500'
                        )}
                      >
                        {conn.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                    {conn.description && (
                      <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {conn.description}
                      </p>
                    )}
                    <div className={cn('text-xs mt-2', isDark ? 'text-gray-500' : 'text-gray-400')}>
                      {conn.endpoints?.length || 0}개 엔드포인트 • {conn.base_url}
                    </div>
                    {conn.last_error && (
                      <div className="text-xs text-red-500 mt-1">
                        마지막 오류: {conn.last_error}
                      </div>
                    )}

                    {/* 테스트 결과 */}
                    {testResult?.connectionId === conn.id && (
                      <div
                        className={cn(
                          'mt-3 p-3 rounded-lg text-sm',
                          testResult.success
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        )}
                      >
                        {testResult.success ? (
                          <>
                            ✓ 연결 성공 ({testResult.response_time_ms}ms)
                            {testResult.response_preview && (
                              <pre className="mt-2 text-xs overflow-auto max-h-32">
                                {testResult.response_preview}
                              </pre>
                            )}
                          </>
                        ) : (
                          <>✗ {testResult.error}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testConnection(conn.id)}
                    disabled={testingApi === conn.id}
                  >
                    {testingApi === conn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(conn.id, conn.is_active)}
                  >
                    {conn.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConnection(conn.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 엔드포인트 목록 */}
              {conn.endpoints?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <div className={cn('text-xs font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-500')}>
                    사용 가능한 기능
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {conn.endpoints.map((ep) => (
                      <span
                        key={ep.id}
                        className={cn(
                          'px-2 py-1 text-xs rounded-md',
                          isDark ? 'bg-zinc-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                        )}
                      >
                        <span className="font-mono text-[10px] mr-1 opacity-50">{ep.method}</span>
                        {ep.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 연결 가능한 API 프리셋 */}
          {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
            <div key={category}>
              <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {apiCategoryLabels[category] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      selectPreset(preset)
                      setShowAddModal(true)
                    }}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all group hover:scale-[1.02]',
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800/50'
                        : 'bg-white border-zinc-200 hover:border-emerald-500/50 hover:bg-zinc-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        isDark ? 'bg-zinc-800 group-hover:bg-emerald-500/10' : 'bg-zinc-100 group-hover:bg-emerald-500/10'
                      )}>
                        <Zap className={cn('w-5 h-5', isDark ? 'text-zinc-500 group-hover:text-emerald-500' : 'text-zinc-400 group-hover:text-emerald-500')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn('font-medium text-sm mb-1', isDark ? 'text-white' : 'text-zinc-900')}>
                          {preset.name}
                        </h4>
                        <p className={cn('text-xs line-clamp-2', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                          {preset.description}
                        </p>
                        <div className={cn('text-xs mt-2', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                          {preset.endpoints?.length || 0}개 엔드포인트
                        </div>
                      </div>
                      <ChevronRight className={cn('w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity', isDark ? 'text-emerald-500' : 'text-emerald-600')} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 커스텀 API 추가 */}
          <div>
            <h3 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              커스텀 API
            </h3>
            <button
              onClick={() => {
                setSelectedPreset(null)
                setShowAddModal(true)
              }}
              className={cn(
                'w-full p-4 rounded-xl border-2 border-dashed text-left transition-all hover:scale-[1.01]',
                isDark
                  ? 'border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900/50'
                  : 'border-zinc-200 hover:border-blue-500/50 hover:bg-zinc-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}>
                  <Plus className={cn('w-5 h-5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                </div>
                <div>
                  <h4 className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-zinc-900')}>
                    직접 API 추가
                  </h4>
                  <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                    REST API를 직접 설정하여 연결합니다
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* API 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className={cn(
              'w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                API 연결 추가
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className={cn('p-2 rounded-lg', isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 프리셋 선택 */}
            {!selectedPreset ? (
              <div className="space-y-6">
                <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                  공공 API 프리셋을 선택하거나 커스텀 API를 추가하세요
                </p>

                {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                  <div key={category}>
                    <h4 className={cn('text-sm font-medium mb-3', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      {apiCategoryLabels[category] || category}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {categoryPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className={cn(
                            'p-4 rounded-xl border text-left transition-all',
                            isDark
                              ? 'bg-zinc-800 border-zinc-700 hover:border-blue-500'
                              : 'bg-gray-50 border-gray-200 hover:border-blue-500'
                          )}
                        >
                          <div className={cn('font-medium mb-1', isDark ? 'text-white' : 'text-gray-900')}>
                            {preset.name}
                          </div>
                          <div className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-600')}>
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 커스텀 API 옵션 */}
                <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    onClick={() => setSelectedPreset({ id: 'custom' } as ApiPreset)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 border-dashed text-center transition-all',
                      isDark
                        ? 'border-zinc-700 hover:border-zinc-600'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    <Plus className={cn('w-6 h-6 mx-auto mb-2', isDark ? 'text-gray-500' : 'text-gray-400')} />
                    <div className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                      커스텀 API 추가
                    </div>
                    <div className={cn('text-xs mt-1', isDark ? 'text-gray-400' : 'text-gray-600')}>
                      직접 API 정보를 입력합니다
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* API 설정 폼 */
              <div className="space-y-4">
                {/* 뒤로 가기 */}
                <button
                  onClick={resetForm}
                  className={cn('flex items-center gap-2 text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  프리셋 다시 선택
                </button>

                {/* 프리셋 정보 */}
                {selectedPreset.id !== 'custom' && (
                  <div className={cn('p-4 rounded-xl', isDark ? 'bg-zinc-800' : 'bg-gray-50')}>
                    <div className={cn('font-medium mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                      {selectedPreset.name}
                    </div>
                    {selectedPreset.setup_guide && (
                      <div className={cn('text-sm whitespace-pre-line select-text', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {selectedPreset.setup_guide}
                      </div>
                    )}
                    {selectedPreset.api_key_url && (
                      <a
                        href={selectedPreset.api_key_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-500 mt-2"
                      >
                        API 키 발급받기
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* 이름 */}
                <div>
                  <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                    이름
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="API 연결 이름"
                    className={cn(
                      'w-full px-4 py-2 rounded-lg border',
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    )}
                  />
                </div>

                {/* Base URL (커스텀인 경우) */}
                {selectedPreset.id === 'custom' && (
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={formData.base_url}
                      onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                      placeholder="https://api.example.com"
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border',
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                    />
                  </div>
                )}

                {/* API Key */}
                <div>
                  <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                    API 키
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="API 키를 입력하세요"
                    className={cn(
                      'w-full px-4 py-2 rounded-lg border',
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    )}
                  />
                </div>

                {/* API Secret (네이버 등 필요한 경우) */}
                {selectedPreset?.auth_config_template?.header_name_secret && (
                  <div>
                    <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      API Secret
                    </label>
                    <input
                      type="password"
                      value={formData.api_secret}
                      onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                      placeholder="API Secret을 입력하세요"
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border',
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      )}
                    />
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={addConnection}
                    disabled={!formData.name || !formData.api_key}
                  >
                    연결 추가
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
