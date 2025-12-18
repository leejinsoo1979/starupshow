import { useState, useEffect, useRef } from 'react'
import {
    Plus,
    Loader2,
    BookOpen,
    Link2,
    FileText,
    Trash2,
    X,
    Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/agent/utils'

interface KnowledgeBaseTabProps {
    agentId: string
    isDark: boolean
}

export function KnowledgeBaseTab({ agentId, isDark }: KnowledgeBaseTabProps) {
    const [documents, setDocuments] = useState<any[]>([])
    const [stats, setStats] = useState<{ documentCount: number; chunkCount: number; lastUpdated: string | null } | null>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [addType, setAddType] = useState<'text' | 'url' | 'file'>('text')
    const [textInput, setTextInput] = useState('')
    const [textTitle, setTextTitle] = useState('')
    const [urlInput, setUrlInput] = useState('')
    const [urlTitle, setUrlTitle] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 문서 목록 조회
    const fetchDocuments = async () => {
        try {
            const res = await fetch(`/api/agents/${agentId}/knowledge`)
            if (res.ok) {
                const data = await res.json()
                setDocuments(data.documents || [])
                setStats(data.stats || null)
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [agentId])

    // 텍스트 추가
    const handleAddText = async () => {
        if (!textInput.trim()) return
        setUploading(true)
        try {
            const res = await fetch(`/api/agents/${agentId}/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'text',
                    text: textInput,
                    title: textTitle || '직접 입력',
                }),
            })
            if (res.ok) {
                setTextInput('')
                setTextTitle('')
                setShowAddModal(false)
                fetchDocuments()
            } else {
                const error = await res.json()
                alert(error.error || '추가 실패')
            }
        } catch (error) {
            alert('추가 실패')
        } finally {
            setUploading(false)
        }
    }

    // URL 추가
    const handleAddUrl = async () => {
        if (!urlInput.trim()) return
        setUploading(true)
        try {
            const res = await fetch(`/api/agents/${agentId}/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'url',
                    url: urlInput,
                    title: urlTitle || undefined,
                }),
            })
            if (res.ok) {
                setUrlInput('')
                setUrlTitle('')
                setShowAddModal(false)
                fetchDocuments()
            } else {
                const error = await res.json()
                alert(error.error || '추가 실패')
            }
        } catch (error) {
            alert('추가 실패')
        } finally {
            setUploading(false)
        }
    }

    // 파일 업로드
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch(`/api/agents/${agentId}/knowledge`, {
                method: 'POST',
                body: formData,
            })
            if (res.ok) {
                setShowAddModal(false)
                fetchDocuments()
            } else {
                const error = await res.json()
                alert(error.error || '업로드 실패')
            }
        } catch (error) {
            alert('업로드 실패')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // 문서 삭제
    const handleDelete = async (documentId: string) => {
        if (!confirm('이 문서를 삭제하시겠습니까?')) return
        try {
            const res = await fetch(`/api/agents/${agentId}/knowledge?documentId=${documentId}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                fetchDocuments()
            }
        } catch (error) {
            alert('삭제 실패')
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className={cn('text-2xl md:text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
                    지식베이스
                </h2>
                <div className="w-10 h-1 bg-accent rounded-full mb-6" />
                <p className={cn('text-sm mb-6', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                    문서, 텍스트, URL을 추가하면 에이전트가 이 지식을 바탕으로 더 똑똑하게 답변합니다.
                </p>
            </div>

            {/* 통계 */}
            {stats && (
                <div className="grid grid-cols-3 gap-4">
                    <div className={cn('p-4 rounded-xl border', isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200')}>
                        <div className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>{stats.documentCount}</div>
                        <div className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>문서</div>
                    </div>
                    <div className={cn('p-4 rounded-xl border', isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200')}>
                        <div className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-zinc-900')}>{stats.chunkCount}</div>
                        <div className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>청크</div>
                    </div>
                    <div className={cn('p-4 rounded-xl border', isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200')}>
                        <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                            {stats.lastUpdated ? formatTimeAgo(stats.lastUpdated) : '-'}
                        </div>
                        <div className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>최근 업데이트</div>
                    </div>
                </div>
            )}

            {/* 추가 버튼 */}
            <button
                onClick={() => setShowAddModal(true)}
                className={cn(
                    'w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors',
                    isDark
                        ? 'border-zinc-700 hover:border-accent hover:bg-accent/10 text-zinc-400 hover:text-accent'
                        : 'border-zinc-300 hover:border-accent hover:bg-accent/10 text-zinc-500 hover:text-accent'
                )}
            >
                <Plus className="w-5 h-5" />
                <span>지식 추가하기</span>
            </button>

            {/* 문서 목록 */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
            ) : documents.length === 0 ? (
                <div className={cn('text-center py-12 rounded-xl border', isDark ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200')}>
                    <BookOpen className={cn('w-12 h-12 mx-auto mb-4', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
                    <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        아직 추가된 지식이 없습니다
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={cn(
                                'flex items-center justify-between p-4 rounded-xl border',
                                isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', isDark ? 'bg-zinc-700' : 'bg-zinc-100')}>
                                    {doc.sourceType === 'url' ? (
                                        <Link2 className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                                    ) : doc.sourceType === 'pdf' ? (
                                        <FileText className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                                    ) : (
                                        <FileText className={cn('w-5 h-5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
                                    )}
                                </div>
                                <div>
                                    <div className={cn('font-medium', isDark ? 'text-white' : 'text-zinc-900')}>{doc.title}</div>
                                    <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                                        {doc.chunksCount}개 청크 · {formatTimeAgo(doc.createdAt)}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(doc.id)}
                                className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 추가 모달 */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className={cn('w-full max-w-lg rounded-2xl p-6', isDark ? 'bg-zinc-900' : 'bg-white')}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-zinc-900')}>지식 추가</h3>
                            <button onClick={() => setShowAddModal(false)} className={cn('p-2 rounded-lg', isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 타입 선택 */}
                        <div className="flex gap-2 mb-6">
                            {[
                                { type: 'text' as const, label: '텍스트', icon: FileText },
                                { type: 'url' as const, label: 'URL', icon: Link2 },
                                { type: 'file' as const, label: '파일', icon: Upload },
                            ].map(({ type, label, icon: Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => setAddType(type)}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-colors',
                                        addType === type
                                            ? 'bg-accent text-white border-accent'
                                            : isDark
                                                ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                                : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* 텍스트 입력 */}
                        {addType === 'text' && (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="제목 (선택)"
                                    value={textTitle}
                                    onChange={(e) => setTextTitle(e.target.value)}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl border',
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'
                                    )}
                                />
                                <textarea
                                    placeholder="지식으로 추가할 텍스트를 입력하세요..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    rows={8}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl border resize-none',
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'
                                    )}
                                />
                                <button
                                    onClick={handleAddText}
                                    disabled={!textInput.trim() || uploading}
                                    className="w-full py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50"
                                >
                                    {uploading ? '추가 중...' : '추가하기'}
                                </button>
                            </div>
                        )}

                        {/* URL 입력 */}
                        {addType === 'url' && (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="제목 (선택, 비워두면 자동 추출)"
                                    value={urlTitle}
                                    onChange={(e) => setUrlTitle(e.target.value)}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl border',
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'
                                    )}
                                />
                                <input
                                    type="url"
                                    placeholder="https://example.com/article"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    className={cn(
                                        'w-full px-4 py-3 rounded-xl border',
                                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200'
                                    )}
                                />
                                <button
                                    onClick={handleAddUrl}
                                    disabled={!urlInput.trim() || uploading}
                                    className="w-full py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50"
                                >
                                    {uploading ? '추가 중...' : '추가하기'}
                                </button>
                            </div>
                        )}

                        {/* 파일 업로드 */}
                        {addType === 'file' && (
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.md,.markdown,.pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className={cn(
                                        'w-full py-12 rounded-xl border-2 border-dashed flex flex-col items-center gap-2',
                                        isDark ? 'border-zinc-700 hover:border-zinc-600' : 'border-zinc-300 hover:border-zinc-400'
                                    )}
                                >
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                                    ) : (
                                        <>
                                            <Upload className={cn('w-8 h-8', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                                            <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                                                클릭하여 파일 선택
                                            </span>
                                            <span className={cn('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                                                .txt, .md, .pdf 지원
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
