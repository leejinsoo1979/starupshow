'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Globe,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Lock,
    ExternalLink,
    Maximize2,
    Minimize2,
    X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 브라우저 자동화 액션 타입
export interface BrowserAction {
    type: 'navigate' | 'search' | 'click' | 'type' | 'scroll' | 'screenshot'
    url?: string
    query?: string
    selector?: string
    text?: string
    direction?: 'up' | 'down'
}

interface BrowserPanelProps {
    currentUrl: string
    isLoading: boolean
    onClose: () => void
    onUrlChange: (url: string) => void
    isExpanded: boolean
    onToggleExpand: () => void
    onNavigate: (url: string) => void
}

export function BrowserPanel({
    currentUrl,
    isLoading,
    onClose,
    onUrlChange,
    isExpanded,
    onToggleExpand,
    onNavigate
}: BrowserPanelProps) {
    const [inputUrl, setInputUrl] = useState(currentUrl)
    const [canGoBack, setCanGoBack] = useState(false)
    const [canGoForward, setCanGoForward] = useState(false)
    const [isSecure, setIsSecure] = useState(false)
    const [webviewLoading, setWebviewLoading] = useState(false)
    const [isElectron, setIsElectron] = useState(false)

    // Electron 환경 체크
    useEffect(() => {
        const isElectronEnv = typeof window !== 'undefined' && !!(window as any).electron
        setIsElectron(isElectronEnv)
        console.log('[BrowserPanel] isElectron:', isElectronEnv)
    }, [])

    // dom-ready 상태 및 대기 URL
    const [domReady, setDomReady] = useState(false)
    const pendingUrlRef = useRef<string>('')

    // currentUrl이 변경되면 inputUrl도 업데이트
    useEffect(() => {
        setInputUrl(currentUrl)
    }, [currentUrl])

    // 이벤트 리스너 설정 (한 번만)
    useEffect(() => {
        if (!isElectron) return

        const timer = setTimeout(() => {
            const webview = document.getElementById('browser-webview') as any
            if (!webview) {
                console.log('[Webview] Element not found')
                return
            }

            console.log('[Webview] Setting up event listeners')

            const registerWithAIBrowser = () => {
                try {
                    const wcId = webview.getWebContentsId?.()
                    console.log('[Webview] WebContentsId:', wcId)

                    if (wcId && (window as any).electron?.aiBrowser) {
                        console.log('[Webview] 📡 Registering with AI Browser...')
                        ;(window as any).electron.aiBrowser.register(wcId)
                            .then((r: any) => console.log('[Webview] ✅ Registered with AI Browser:', r))
                            .catch((e: any) => console.error('[Webview] ❌ Register failed:', e))
                    }
                } catch (e) {
                    console.error('[Webview] Registration error:', e)
                }
            }

            const handleDomReady = () => {
                console.log('[Webview] DOM ready!')
                setDomReady(true)
                if (pendingUrlRef.current) {
                    console.log('[Webview] Loading pending URL:', pendingUrlRef.current)
                    webview.loadURL(pendingUrlRef.current)
                    pendingUrlRef.current = ''
                }
                registerWithAIBrowser()
            }

            const handleDidNavigate = (e: any) => {
                const url = e.url || webview.getURL?.() || ''
                setInputUrl(url)
                if (webview.canGoBack) setCanGoBack(webview.canGoBack())
                if (webview.canGoForward) setCanGoForward(webview.canGoForward())
                setIsSecure(url.startsWith('https://'))
            }

            const handleDidStartLoading = () => setWebviewLoading(true)
            const handleDidStopLoading = () => setWebviewLoading(false)

            const handleDidAttach = () => {
                console.log('[Webview] 🔗 did-attach fired')
                registerWithAIBrowser()
            }

            webview.addEventListener('dom-ready', handleDomReady)
            webview.addEventListener('did-attach', handleDidAttach)
            webview.addEventListener('did-navigate', handleDidNavigate)
            webview.addEventListener('did-start-loading', handleDidStartLoading)
            webview.addEventListener('did-stop-loading', handleDidStopLoading)

            return () => {
                if ((window as any).electron?.aiBrowser?.unregister) {
                    (window as any).electron.aiBrowser.unregister()
                        .catch((e: any) => console.warn('[Webview] Unregister failed:', e))
                }
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [isElectron])

    // URL 변경 시 로드 (dom-ready 후에만)
    useEffect(() => {
        if (!isElectron || !currentUrl || currentUrl === 'about:blank') return

        const webview = document.getElementById('browser-webview') as any

        if (!domReady) {
            console.log('[Webview] Waiting for dom-ready, pending:', currentUrl)
            pendingUrlRef.current = currentUrl
            return
        }

        if (!webview?.loadURL) return

        console.log('[Webview] Loading:', currentUrl)
        webview.loadURL(currentUrl)
    }, [isElectron, currentUrl, domReady])

    const getWebview = () => document.getElementById('browser-webview') as any

    const goBack = () => {
        const wv = getWebview()
        if (wv?.goBack) wv.goBack()
    }

    const goForward = () => {
        const wv = getWebview()
        if (wv?.goForward) wv.goForward()
    }

    const reload = () => {
        const wv = getWebview()
        if (wv?.reload) wv.reload()
    }

    // 브라우저 액션 실행 (스크롤, 클릭 등)
    const executeAction = async (action: BrowserAction): Promise<string> => {
        const wv = getWebview()
        if (!wv?.executeJavaScript) {
            return '브라우저가 준비되지 않았습니다.'
        }

        try {
            switch (action.type) {
                case 'scroll':
                    const scrollAmount = action.direction === 'up' ? -500 : 500
                    await wv.executeJavaScript(`window.scrollBy(0, ${scrollAmount})`)
                    return `${action.direction === 'up' ? '위로' : '아래로'} 스크롤했습니다.`

                case 'click':
                    if (action.text) {
                        const clickScript = `
                            (function() {
                                const elements = document.querySelectorAll('a, button, [role="button"], input[type="submit"]');
                                for (const el of elements) {
                                    if (el.textContent && el.textContent.includes('${action.text}')) {
                                        el.click();
                                        return '클릭 성공: ' + el.textContent.substring(0, 50);
                                    }
                                }
                                return '요소를 찾을 수 없습니다: ${action.text}';
                            })()
                        `
                        const result = await wv.executeJavaScript(clickScript)
                        return result
                    }
                    return '클릭할 텍스트가 지정되지 않았습니다.'

                case 'type':
                    if (action.text) {
                        const typeScript = `
                            (function() {
                                const input = document.activeElement;
                                if (input && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
                                    input.value = '${action.text}';
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    return '입력 완료: ${action.text}';
                                }
                                const searchInput = document.querySelector('input[type="search"], input[name="query"], input[name="q"], #query, .search-input');
                                if (searchInput) {
                                    searchInput.value = '${action.text}';
                                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    searchInput.form?.submit();
                                    return '검색 실행: ${action.text}';
                                }
                                return '입력창을 찾을 수 없습니다.';
                            })()
                        `
                        const result = await wv.executeJavaScript(typeScript)
                        return result
                    }
                    return '입력할 텍스트가 지정되지 않았습니다.'

                default:
                    return '알 수 없는 액션입니다.'
            }
        } catch (e) {
            console.error('[Webview] Action error:', e)
            return `액션 실행 오류: ${e}`
        }
    }

    // executeAction을 외부에서 접근할 수 있도록 전역에 저장
    useEffect(() => {
        (window as any).__browserExecuteAction = executeAction
    }, [domReady])

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        let url = inputUrl.trim()
        if (!url) return

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`
            }
        }

        const wv = getWebview()
        if (isElectron && wv?.loadURL) {
            console.log('[Webview] URL bar submit:', url)
            wv.loadURL(url)
        }
        onNavigate(url)
    }

    const openExternal = () => {
        if (currentUrl && typeof window !== 'undefined') {
            window.open(currentUrl, '_blank')
        }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700">
            {/* Browser Header */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                {/* Traffic Lights */}
                <div className="flex items-center gap-1.5 mr-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:opacity-80" onClick={onClose} title="닫기" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer hover:opacity-80" onClick={onToggleExpand} title="최소화" />
                    <div className="w-3 h-3 rounded-full bg-green-500 cursor-pointer hover:opacity-80" onClick={onToggleExpand} title="최대화" />
                </div>

                {/* Navigation Buttons */}
                <button
                    onClick={goBack}
                    disabled={!canGoBack}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-30"
                    title="뒤로"
                >
                    <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </button>
                <button
                    onClick={goForward}
                    disabled={!canGoForward}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-30"
                    title="앞으로"
                >
                    <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </button>
                <button
                    onClick={reload}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    title="새로고침"
                >
                    <RefreshCw className={cn("w-4 h-4 text-zinc-600 dark:text-zinc-400", (isLoading || webviewLoading) && "animate-spin")} />
                </button>

                {/* URL Bar */}
                <form onSubmit={handleUrlSubmit} className="flex-1 mx-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-600">
                        {isSecure ? (
                            <Lock className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                            <Globe className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        )}
                        <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="URL을 입력하거나 검색어를 입력하세요"
                            className="flex-1 text-xs bg-transparent text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
                        />
                    </div>
                </form>

                {/* Window Controls */}
                <button
                    onClick={openExternal}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    title="외부 브라우저에서 열기"
                >
                    <ExternalLink className="w-4 h-4 text-zinc-500" />
                </button>
                <button
                    onClick={onToggleExpand}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    title={isExpanded ? "축소" : "확대"}
                >
                    {isExpanded ? (
                        <Minimize2 className="w-4 h-4 text-zinc-500" />
                    ) : (
                        <Maximize2 className="w-4 h-4 text-zinc-500" />
                    )}
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    title="브라우저 닫기"
                >
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* Browser Content - Webview or Fallback */}
            <div className="flex-1 relative bg-white dark:bg-zinc-950 overflow-hidden">
                {isElectron ? (
                    <>
                        <webview
                            id="browser-webview"
                            src={currentUrl || 'about:blank'}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'inline-flex',
                                border: 'none'
                            }}
                            // @ts-ignore - webview는 Electron 전용 태그
                            allowpopups="true"
                            webpreferences="contextIsolation=no, nodeIntegration=no, javascript=yes, webSecurity=no"
                            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            partition="persist:browser"
                        />
                        <div className="absolute bottom-2 left-2 p-2 bg-black/80 text-green-400 text-[10px] font-mono rounded">
                            src: {currentUrl || 'about:blank'}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                        <Globe className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-sm font-medium">Electron 앱에서만 사용 가능</p>
                        <p className="text-xs mt-2 opacity-70">데스크톱 앱을 실행하면 실제 브라우저를 사용할 수 있습니다</p>
                        {currentUrl && (
                            <button
                                onClick={openExternal}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                외부 브라우저에서 열기
                            </button>
                        )}
                    </div>
                )}

                {/* Loading Overlay */}
                {(isLoading || webviewLoading) && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-700">
                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                    </div>
                )}
            </div>
        </div>
    )
}
