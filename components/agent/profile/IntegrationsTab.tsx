import { useState, useEffect } from 'react'
import {
    Link2,
    Loader2,
    FolderOpen,
    Plus,
    X,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { getAppLogo } from '@/components/icons/app-logos'

interface AppProvider {
    id: string
    name: string
    description: string
    icon_url: string
    capabilities: Record<string, boolean>
}

interface UserConnection {
    id: string
    provider_id: string
    status: string
    account_info?: {
        name?: string
        email?: string
        avatar_url?: string
        team_name?: string
    }
    created_at: string
    app_providers?: AppProvider
}

interface AgentConnection {
    id: string
    agent_id: string
    user_connection_id: string
    is_active: boolean
    user_app_connections?: UserConnection
}

interface IntegrationsTabProps {
    agentId: string
    isDark: boolean
}

export function IntegrationsTab({ agentId, isDark }: IntegrationsTabProps) {
    const [loading, setLoading] = useState(true)
    const [providers, setProviders] = useState<AppProvider[]>([])
    const [userConnections, setUserConnections] = useState<UserConnection[]>([])
    const [agentConnections, setAgentConnections] = useState<AgentConnection[]>([])
    const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
    const [showResourceModal, setShowResourceModal] = useState(false)
    const [selectedConnection, setSelectedConnection] = useState<UserConnection | null>(null)
    const [resources, setResources] = useState<any[]>([])
    const [resourcesLoading, setResourcesLoading] = useState(false)
    const [syncingResource, setSyncingResource] = useState<string | null>(null)

    useEffect(() => {
        loadIntegrations()
    }, [agentId])

    const loadIntegrations = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/agents/${agentId}/integrations`)
            if (res.ok) {
                const data = await res.json()
                setProviders(data.providers || [])
                setUserConnections(data.userConnections || [])
                setAgentConnections(data.agentConnections || [])
            }
        } catch (err) {
            console.error('Failed to load integrations:', err)
        } finally {
            setLoading(false)
        }
    }

    const startOAuth = async (providerId: string) => {
        try {
            setConnectingProvider(providerId)
            const res = await fetch(`/api/agents/${agentId}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start_oauth', providerId }),
            })

            if (res.ok) {
                const { authUrl } = await res.json()
                window.location.href = authUrl
            }
        } catch (err) {
            console.error('OAuth start failed:', err)
        } finally {
            setConnectingProvider(null)
        }
    }

    const connectToAgent = async (userConnectionId: string) => {
        try {
            const res = await fetch(`/api/agents/${agentId}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect_to_agent', userConnectionId }),
            })

            if (res.ok) {
                await loadIntegrations()
            }
        } catch (err) {
            console.error('Connect to agent failed:', err)
        }
    }

    const disconnectFromAgent = async (connectionId: string) => {
        if (!confirm('이 앱 연결을 해제하시겠습니까?')) return

        try {
            const res = await fetch(`/api/agents/${agentId}/integrations?connectionId=${connectionId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                await loadIntegrations()
            }
        } catch (err) {
            console.error('Disconnect failed:', err)
        }
    }

    const browseResources = async (connection: UserConnection) => {
        setSelectedConnection(connection)
        setShowResourceModal(true)
        setResourcesLoading(true)

        try {
            const res = await fetch(`/api/agents/${agentId}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list_resources',
                    userConnectionId: connection.id,
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setResources(data.resources || [])
            }
        } catch (err) {
            console.error('Failed to load resources:', err)
        } finally {
            setResourcesLoading(false)
        }
    }

    const syncResource = async (resource: any) => {
        const agentConn = agentConnections.find(
            (c) => c.user_connection_id === selectedConnection?.id
        )
        if (!agentConn) {
            alert('먼저 이 앱을 에이전트에 연결해주세요')
            return
        }

        try {
            setSyncingResource(resource.id)
            const res = await fetch(`/api/agents/${agentId}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_resource',
                    agentConnectionId: agentConn.id,
                    resourceId: resource.id,
                    resourceName: resource.name,
                }),
            })

            if (res.ok) {
                const result = await res.json()
                if (result.success) {
                    alert(`"${resource.name}"이(가) 지식베이스에 추가되었습니다!`)
                } else {
                    alert(result.error || '동기화 실패')
                }
            }
        } catch (err) {
            console.error('Sync failed:', err)
            alert('동기화 중 오류가 발생했습니다')
        } finally {
            setSyncingResource(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    const connectedProviderIds = userConnections.map((c) => c.provider_id)
    const agentConnectedIds = agentConnections.map((c) => c.user_connection_id)

    return (
        <div className="space-y-8">
            {/* 연결된 앱 */}
            <div>
                <h3 className={cn('text-lg font-semibold mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
                    연결된 앱
                </h3>

                {userConnections.length === 0 ? (
                    <div
                        className={cn(
                            'text-center py-8 rounded-xl border-2 border-dashed',
                            isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                        )}
                    >
                        <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>연결된 앱이 없습니다</p>
                        <p className="text-sm mt-1">아래에서 앱을 연결해보세요</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {userConnections.map((conn) => {
                            const isConnectedToAgent = agentConnectedIds.includes(conn.id)
                            const provider = providers.find((p) => p.id === conn.provider_id)

                            return (
                                <div
                                    key={conn.id}
                                    className={cn(
                                        'flex items-center justify-between p-4 rounded-xl border',
                                        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            {getAppLogo(conn.provider_id, { size: 32 }) || <Link2 className="w-6 h-6 text-zinc-400" />}
                                        </div>
                                        <div>
                                            <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                                                {provider?.name || conn.provider_id}
                                            </div>
                                            <div className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                                                {conn.account_info?.email ||
                                                    conn.account_info?.name ||
                                                    conn.account_info?.team_name ||
                                                    '연결됨'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isConnectedToAgent ? (
                                            <>
                                                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-500 rounded-full">
                                                    에이전트 연결됨
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => browseResources(conn)}
                                                    className="text-blue-500"
                                                >
                                                    <FolderOpen className="w-4 h-4 mr-1" />
                                                    찾아보기
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const agentConn = agentConnections.find(
                                                            (c) => c.user_connection_id === conn.id
                                                        )
                                                        if (agentConn) disconnectFromAgent(agentConn.id)
                                                    }}
                                                    className="text-red-500"
                                                >
                                                    연결 해제
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => connectToAgent(conn.id)}
                                                className="text-blue-500"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                에이전트에 연결
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 앱 추가 */}
            <div>
                <h3 className={cn('text-lg font-semibold mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
                    앱 추가
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {providers.map((provider) => {
                        const isConnected = connectedProviderIds.includes(provider.id)
                        const isConnecting = connectingProvider === provider.id

                        return (
                            <button
                                key={provider.id}
                                onClick={() => !isConnected && !isConnecting && startOAuth(provider.id)}
                                disabled={isConnected || isConnecting}
                                className={cn(
                                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                                    isDark
                                        ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700/50'
                                        : 'bg-white border-zinc-200 hover:bg-zinc-50',
                                    isConnected && 'opacity-50 cursor-not-allowed',
                                    isConnecting && 'animate-pulse'
                                )}
                            >
                                <div className="w-10 h-10 flex items-center justify-center">
                                    {getAppLogo(provider.id, { size: 40 }) || <Link2 className="w-8 h-8 text-zinc-400" />}
                                </div>
                                <span className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                                    {provider.name}
                                </span>
                                {isConnected ? (
                                    <span className="text-xs text-green-500">연결됨</span>
                                ) : isConnecting ? (
                                    <span className="text-xs text-blue-500">연결 중...</span>
                                ) : (
                                    <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                                        연결하기
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 리소스 탐색 모달 */}
            {showResourceModal && selectedConnection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className={cn(
                        'w-full max-w-2xl rounded-2xl flex flex-col max-h-[85vh]',
                        isDark ? 'bg-zinc-900' : 'bg-white'
                    )}>
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
                                {selectedConnection.account_info?.name || '연결된 계정'}의 리소스
                            </h3>
                            <button
                                onClick={() => setShowResourceModal(false)}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {resourcesLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : resources.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500">
                                    리소스가 없습니다
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {resources.map((resource) => (
                                        <div
                                            key={resource.id}
                                            className={cn(
                                                'flex items-center justify-between p-4 rounded-xl border',
                                                isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <FolderOpen className="w-5 h-5 text-blue-500" />
                                                <div>
                                                    <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                                                        {resource.name}
                                                    </div>
                                                    <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                                                        {resource.type} • {new Date(resource.modifiedTime || Date.now()).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => syncResource(resource)}
                                                disabled={syncingResource === resource.id}
                                                variant="outline"
                                            >
                                                {syncingResource === resource.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4 mr-1" />
                                                )}
                                                추가
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
