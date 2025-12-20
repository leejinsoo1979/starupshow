'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useNeuralMapStore } from '@/lib/neural-map/store'
import type { NeuralFile } from '@/lib/neural-map/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  X,
  Copy,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  ExternalLink,
  Maximize2,
  Minimize2,
  Loader2,
  Code,
  BookOpen,
} from 'lucide-react'

interface CodePreviewPanelProps {
  className?: string
}

// Get file extension
function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// Get language for syntax highlighter
function getLanguage(fileName: string): string {
  const ext = getExtension(fileName)
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'html': 'html',
    'xml': 'xml',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'rb': 'ruby',
    'php': 'php',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'env': 'bash',
    'txt': 'text',
    'dockerfile': 'docker',
  }
  return langMap[ext] || 'text'
}

// Check if file is markdown
function isMarkdown(fileName: string): boolean {
  const ext = getExtension(fileName)
  return ext === 'md' || ext === 'markdown'
}

// Check if file is code
function isCode(fileName: string): boolean {
  const ext = getExtension(fileName)
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'less', 'html', 'xml', 'py', 'go', 'rs', 'java', 'kt', 'swift', 'rb', 'php', 'sql', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'toml', 'ini', 'env', 'dockerfile']
  return codeExts.includes(ext)
}

// Check if file is image
function isImage(fileName: string): boolean {
  const ext = getExtension(fileName)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)
}

// Check if file is video
function isVideo(fileName: string): boolean {
  const ext = getExtension(fileName)
  return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)
}

// Get icon for file type
function getFileIcon(fileName: string) {
  if (isMarkdown(fileName)) return BookOpen
  if (isCode(fileName)) return Code
  if (isImage(fileName)) return ImageIcon
  if (isVideo(fileName)) return Film
  return File
}

// Get display mode
type DisplayMode = 'code' | 'markdown' | 'image' | 'video' | 'pdf' | 'text'

function getDisplayMode(file: NeuralFile): DisplayMode {
  const name = file.name || ''
  if (isMarkdown(name)) return 'markdown'
  if (isCode(name)) return 'code'
  if (isImage(name)) return 'image'
  if (isVideo(name)) return 'video'
  if (file.type === 'pdf' || getExtension(name) === 'pdf') return 'pdf'
  return 'text'
}

export function CodePreviewPanel({ className }: CodePreviewPanelProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const codePreviewFile = useNeuralMapStore((s) => s.codePreviewFile)
  const codePreviewOpen = useNeuralMapStore((s) => s.codePreviewOpen)
  const closeCodePreview = useNeuralMapStore((s) => s.closeCodePreview)

  const [content, setContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Fetch file content
  useEffect(() => {
    if (!codePreviewFile || !codePreviewOpen) {
      setContent(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const displayMode = getDisplayMode(codePreviewFile)

    // For images and videos, no content fetch needed
    if (displayMode === 'image' || displayMode === 'video' || displayMode === 'pdf') {
      setContent(null)
      setIsLoading(false)
      return
    }

    // Check URL
    if (!codePreviewFile.url) {
      setContent('// 파일 URL이 없습니다')
      setIsLoading(false)
      return
    }

    // Check for mock/demo URLs
    if (codePreviewFile.url.startsWith('mock://')) {
      // Generate realistic demo content based on file type
      const demoContent = generateDemoContent(codePreviewFile.name)
      setContent(demoContent)
      setIsLoading(false)
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError(null)

    const fetchContent = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(codePreviewFile.url, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (isCancelled) return

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const text = await response.text()
        if (!isCancelled) {
          setContent(text || '')
        }
      } catch (err: any) {
        if (isCancelled) return
        console.error('Error fetching file content:', err)
        if (err.name === 'AbortError') {
          setError('요청 시간 초과')
        } else {
          setError(`파일을 불러올 수 없습니다`)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchContent()

    return () => {
      isCancelled = true
    }
  }, [codePreviewFile, codePreviewOpen])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    if (codePreviewFile?.url && !codePreviewFile.url.startsWith('mock://')) {
      window.open(codePreviewFile.url, '_blank')
    }
  }, [codePreviewFile])

  const isOpen = codePreviewOpen && codePreviewFile
  const displayMode = codePreviewFile ? getDisplayMode(codePreviewFile) : 'text'
  const FileIcon = codePreviewFile ? getFileIcon(codePreviewFile.name) : File
  const language = codePreviewFile ? getLanguage(codePreviewFile.name) : 'text'

  return (
    <AnimatePresence mode="wait">
      {isOpen && codePreviewFile && (
        <motion.div
          key="code-preview-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isExpanded ? '55%' : 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={cn(
            'h-full border-l flex flex-col overflow-hidden flex-shrink-0',
            isDark ? 'bg-[#1e1e1e] border-zinc-800' : 'bg-white border-zinc-200',
            className
          )}
        >
          {/* Header */}
          <div className={cn(
            'h-10 flex items-center justify-between px-3 border-b flex-shrink-0',
            isDark ? 'bg-[#252526] border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon className={cn(
                'w-4 h-4 flex-shrink-0',
                displayMode === 'markdown' ? 'text-blue-400' :
                displayMode === 'code' ? 'text-yellow-400' :
                'text-zinc-400'
              )} />
              <span className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-zinc-200' : 'text-zinc-700'
              )}>
                {codePreviewFile.name}
              </span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-mono',
                isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
              )}>
                {displayMode === 'markdown' ? 'Markdown' : language.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Copy button */}
              {content && (
                <button
                  onClick={handleCopy}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                  )}
                  title="복사"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}

              {/* Open external */}
              {codePreviewFile.url && !codePreviewFile.url.startsWith('mock://') && (
                <button
                  onClick={handleOpenExternal}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                  )}
                  title="새 탭에서 열기"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                )}
                title={isExpanded ? '축소' : '확대'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                onClick={closeCodePreview}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                )}
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className={cn('w-6 h-6 animate-spin', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
                  <span className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    파일 로딩 중...
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-red-500">{error}</div>
              </div>
            ) : displayMode === 'image' ? (
              <div className="flex items-center justify-center h-full p-6 bg-checkered">
                {codePreviewFile.url && (
                  <img
                    src={codePreviewFile.url.startsWith('mock://') ? '/placeholder-image.png' : codePreviewFile.url}
                    alt={codePreviewFile.name}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="%23333" width="200" height="150"/><text x="50%" y="50%" fill="%23888" text-anchor="middle" dy=".3em">Image</text></svg>'
                    }}
                  />
                )}
              </div>
            ) : displayMode === 'video' ? (
              <div className="flex items-center justify-center h-full p-6">
                {codePreviewFile.url && !codePreviewFile.url.startsWith('mock://') ? (
                  <video
                    src={codePreviewFile.url}
                    controls
                    className="max-w-full max-h-full rounded shadow-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Film className="w-16 h-16" />
                    <span>비디오 미리보기</span>
                  </div>
                )}
              </div>
            ) : displayMode === 'pdf' ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center">
                  <FileText className={cn('w-16 h-16 mx-auto mb-4', isDark ? 'text-red-400' : 'text-red-500')} />
                  <p className={cn('text-lg font-medium mb-2', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
                    {codePreviewFile.name}
                  </p>
                  <p className={cn('text-sm mb-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                    PDF 문서
                  </p>
                  {codePreviewFile.url && !codePreviewFile.url.startsWith('mock://') && (
                    <button
                      onClick={handleOpenExternal}
                      className={cn(
                        'px-4 py-2 rounded text-sm font-medium transition-colors',
                        'bg-blue-600 hover:bg-blue-700 text-white'
                      )}
                    >
                      PDF 열기
                    </button>
                  )}
                </div>
              </div>
            ) : displayMode === 'markdown' && content ? (
              <div className={cn(
                'p-6 prose prose-sm max-w-none',
                isDark ? 'prose-invert' : '',
                'prose-headings:font-semibold prose-headings:tracking-tight',
                'prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2',
                'prose-h2:text-xl prose-h2:mt-6',
                'prose-h3:text-lg',
                'prose-p:leading-relaxed',
                'prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline',
                'prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
                'prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700',
                isDark ? 'prose-code:bg-zinc-800 prose-code:text-zinc-200' : 'prose-code:bg-zinc-100 prose-code:text-zinc-800'
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={isDark ? oneDark : oneLight}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : displayMode === 'code' && content ? (
              <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={language}
                showLineNumbers
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  color: isDark ? '#4a5568' : '#a0aec0',
                  borderRight: `1px solid ${isDark ? '#2d3748' : '#e2e8f0'}`,
                  marginRight: '1em',
                }}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.8125rem',
                  lineHeight: '1.6',
                  background: isDark ? '#1e1e1e' : '#fafafa',
                  height: '100%',
                }}
              >
                {content}
              </SyntaxHighlighter>
            ) : content ? (
              <pre className={cn(
                'p-4 font-mono text-sm whitespace-pre-wrap',
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              )}>
                {content}
              </pre>
            ) : null}
          </div>

          {/* Footer */}
          <div className={cn(
            'h-6 flex items-center justify-between px-3 text-[11px] border-t flex-shrink-0',
            isDark ? 'bg-[#252526] border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
          )}>
            <span className="flex items-center gap-2">
              {displayMode === 'markdown' && <BookOpen className="w-3 h-3" />}
              {displayMode === 'code' && <Code className="w-3 h-3" />}
              {displayMode === 'markdown' ? 'Markdown Preview' : language}
            </span>
            {content && (
              <span>{content.split('\n').length} lines</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Generate realistic demo content based on file name
function generateDemoContent(fileName: string): string {
  const ext = getExtension(fileName)
  const name = fileName.replace(/\.\w+$/, '')

  switch (ext) {
    case 'tsx':
    case 'jsx':
      return `import React from 'react'

interface ${toPascalCase(name)}Props {
  className?: string
  children?: React.ReactNode
}

export function ${toPascalCase(name)}({ className, children }: ${toPascalCase(name)}Props) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export default ${toPascalCase(name)}
`

    case 'ts':
    case 'js':
      if (name.includes('route')) {
        return `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Handle POST request
  return NextResponse.json({ success: true })
}
`
      }
      if (name.includes('utils') || name.includes('lib')) {
        return `export function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
`
      }
      if (name.includes('Store') || name.includes('store')) {
        return `import { create } from 'zustand'

interface ${toPascalCase(name)}State {
  count: number
  isLoading: boolean
}

interface ${toPascalCase(name)}Actions {
  increment: () => void
  decrement: () => void
  setLoading: (loading: boolean) => void
}

export const use${toPascalCase(name)} = create<${toPascalCase(name)}State & ${toPascalCase(name)}Actions>((set) => ({
  count: 0,
  isLoading: false,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  setLoading: (loading) => set({ isLoading: loading }),
}))
`
      }
      if (name.startsWith('use')) {
        return `import { useState, useEffect, useCallback } from 'react'

export function ${name}() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch data here
      const response = await fetch('/api/data')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}
`
      }
      return `// ${fileName}

export const config = {
  name: '${name}',
  version: '1.0.0',
}

export function init() {
  console.log('Initializing ${name}...')
}
`

    case 'css':
    case 'scss':
      return `/* ${fileName} */

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  background: var(--bg-card);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
}

.button-primary {
  background: var(--color-primary);
  color: white;
}

.button-primary:hover {
  background: var(--color-primary-dark);
}
`

    case 'json':
      if (name === 'package') {
        return `{
  "name": "my-nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5"
  }
}
`
      }
      if (name === 'tsconfig') {
        return `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
`
      }
      return `{
  "${name}": {
    "enabled": true,
    "options": {}
  }
}
`

    case 'md':
    case 'markdown':
      return `# ${toPascalCase(name)}

## Overview

This is the documentation for **${name}**.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npm install ${name}
\`\`\`

## Usage

\`\`\`typescript
import { ${toPascalCase(name)} } from '${name}'

const instance = new ${toPascalCase(name)}()
instance.init()
\`\`\`

## API Reference

### \`init()\`

Initializes the ${name} instance.

### \`destroy()\`

Cleans up resources.

---

For more information, see the [documentation](https://example.com).
`

    case 'yaml':
    case 'yml':
      return `# ${fileName}

name: ${name}
version: 1.0.0

settings:
  debug: false
  timeout: 30000

features:
  - name: feature1
    enabled: true
  - name: feature2
    enabled: false
`

    default:
      return `// ${fileName}\n// Demo file content`
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
}
