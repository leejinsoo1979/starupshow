'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import {
    Code,
    Eye,
    Play,
    Copy,
    Check,
    Download,
    Maximize2,
    Minimize2,
    X,
    RefreshCw,
    Terminal,
    FileCode,
    ExternalLink,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CodeArtifact {
    id: string
    language: string
    code: string
    title?: string
    isStreaming?: boolean
    createdAt?: Date
}

interface CodeArtifactPanelProps {
    artifact: CodeArtifact | null
    onClose: () => void
    isExpanded?: boolean
    onToggleExpand?: () => void
    isDark?: boolean
}

export function CodeArtifactPanel({
    artifact,
    onClose,
    isExpanded = false,
    onToggleExpand,
    isDark = true
}: CodeArtifactPanelProps) {
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
    const [copied, setCopied] = useState(false)
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // 언어 감지 및 아이콘
    const getLanguageIcon = (lang: string) => {
        switch (lang.toLowerCase()) {
            case 'html':
            case 'javascript':
            case 'typescript':
            case 'jsx':
            case 'tsx':
                return <FileCode className="w-4 h-4" />
            default:
                return <Code className="w-4 h-4" />
        }
    }

    // 언어별 모나코 에디터 언어 매핑
    const getMonacoLanguage = (lang: string) => {
        const langMap: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
            'yaml': 'yaml',
            'yml': 'yaml',
        }
        return langMap[lang.toLowerCase()] || lang.toLowerCase()
    }

    // HTML/JS 코드를 미리보기 가능한 형태로 변환
    const getPreviewContent = useMemo(() => {
        if (!artifact) return ''

        const lang = artifact.language.toLowerCase()
        const code = artifact.code

        // HTML 코드는 그대로 사용
        if (lang === 'html') {
            return code
        }

        // JavaScript/TypeScript/JSX/TSX는 HTML로 감싸기
        if (['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(lang)) {
            // React 코드인지 확인
            const isReact = code.includes('React') || code.includes('useState') || code.includes('useEffect') || code.includes('export default')

            if (isReact) {
                // React 코드는 Babel + React CDN으로 실행
                return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${code.replace(/export default /g, 'const App = ')}

        // 자동 렌더링
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>`
            } else {
                // 일반 JavaScript
                return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #fff; color: #1a1a1a; }
        pre { background: #f4f4f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div id="output"></div>
    <script>
        // Console 출력을 화면에 표시
        const output = document.getElementById('output');
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog(...args);
            const pre = document.createElement('pre');
            pre.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ');
            output.appendChild(pre);
        };

        try {
            ${code}
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    </script>
</body>
</html>`
            }
        }

        // CSS만 있는 경우
        if (lang === 'css') {
            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${code}</style>
</head>
<body>
    <div class="demo">
        <h1>CSS Preview</h1>
        <p>Your styles are applied to this page.</p>
        <button>Sample Button</button>
        <div class="box" style="width: 100px; height: 100px; background: #3b82f6; margin: 20px 0;"></div>
    </div>
</body>
</html>`
        }

        // 그 외 언어는 미리보기 불가
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0; padding: 40px;
            font-family: system-ui, sans-serif;
            background: #18181b; color: #a1a1aa;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        .icon { font-size: 48px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div>
        <div class="icon">📄</div>
        <p>${artifact.language.toUpperCase()} 파일은 미리보기를 지원하지 않습니다.</p>
    </div>
</body>
</html>`
    }, [artifact])

    // 미리보기 탭으로 전환 시 로딩
    useEffect(() => {
        if (activeTab === 'preview') {
            setIsPreviewLoading(true)
            const timer = setTimeout(() => setIsPreviewLoading(false), 500)
            return () => clearTimeout(timer)
        }
    }, [activeTab, artifact?.code])

    // 코드 복사
    const handleCopy = async () => {
        if (!artifact) return
        try {
            await navigator.clipboard.writeText(artifact.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) {
            console.error('Copy failed:', e)
        }
    }

    // 코드 다운로드
    const handleDownload = () => {
        if (!artifact) return
        const ext = artifact.language === 'javascript' ? 'js' : artifact.language
        const blob = new Blob([artifact.code], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `code.${ext}`
        a.click()
        URL.revokeObjectURL(url)
    }

    // 미리보기 새로고침
    const handleRefreshPreview = () => {
        if (iframeRef.current) {
            setIsPreviewLoading(true)
            iframeRef.current.src = 'about:blank'
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = getPreviewContent
                }
                setIsPreviewLoading(false)
            }, 100)
        }
    }

    if (!artifact) return null

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col bg-zinc-900 border-l border-zinc-700"
        >
            {/* Header with Tabs */}
            <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-700 bg-zinc-800/50">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            activeTab === 'code'
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                        )}
                    >
                        <Code className="w-4 h-4" />
                        코드
                    </button>
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            activeTab === 'preview'
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                        )}
                    >
                        <Eye className="w-4 h-4" />
                        미리보기
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {artifact.isStreaming && (
                        <div className="flex items-center gap-2 px-2 py-1 mr-2 bg-blue-500/20 rounded text-blue-400 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            생성 중...
                        </div>
                    )}

                    {/* Language Badge */}
                    <div className="flex items-center gap-1.5 px-2 py-1 mr-2 bg-zinc-700 rounded text-xs text-zinc-300">
                        {getLanguageIcon(artifact.language)}
                        {artifact.language.toUpperCase()}
                    </div>

                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title="복사"
                    >
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-zinc-400" />
                        )}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                        title="다운로드"
                    >
                        <Download className="w-4 h-4 text-zinc-400" />
                    </button>
                    {activeTab === 'preview' && (
                        <button
                            onClick={handleRefreshPreview}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title="새로고침"
                        >
                            <RefreshCw className={cn("w-4 h-4 text-zinc-400", isPreviewLoading && "animate-spin")} />
                        </button>
                    )}
                    {onToggleExpand && (
                        <button
                            onClick={onToggleExpand}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title={isExpanded ? "축소" : "확대"}
                        >
                            {isExpanded ? (
                                <Minimize2 className="w-4 h-4 text-zinc-400" />
                            ) : (
                                <Maximize2 className="w-4 h-4 text-zinc-400" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-700 rounded transition-colors ml-1"
                        title="닫기"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === 'code' ? (
                        <motion.div
                            key="code"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <Editor
                                height="100%"
                                language={getMonacoLanguage(artifact.language)}
                                value={artifact.code}
                                theme="vs-dark"
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                    padding: { top: 12, bottom: 12 },
                                    renderLineHighlight: 'none',
                                    hideCursorInOverviewRuler: true,
                                    overviewRulerBorder: false,
                                    scrollbar: {
                                        verticalScrollbarSize: 8,
                                        horizontalScrollbarSize: 8,
                                    }
                                }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full relative bg-white"
                        >
                            {isPreviewLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                                    <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                                </div>
                            )}
                            <iframe
                                ref={iframeRef}
                                srcDoc={getPreviewContent}
                                sandbox="allow-scripts allow-modals"
                                className="w-full h-full border-0"
                                title="Preview"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
