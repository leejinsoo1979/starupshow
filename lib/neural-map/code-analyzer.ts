/**
 * Code Analyzer - AI가 프로젝트 코드를 분석해서 다이어그램 데이터 생성
 *
 * 용도:
 * 1. Forward: AI 에이전트가 코딩 전 설계도 그리기
 * 2. Backward: 기존 프로젝트 분석해서 다이어그램 변환
 */

import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'

// Fix for ES module default export issues in Next.js
const traverse = (_traverse as any).default || _traverse

export interface CodeNode {
  id: string
  label: string
  type: 'file' | 'component' | 'function' | 'class' | 'hook' | 'api' | 'database'
  path: string
  metadata?: {
    exports?: string[]
    imports?: string[]
    calls?: string[]
    props?: string[]
    state?: string[]
  }
}

export interface CodeEdge {
  id: string
  source: string
  target: string
  type: 'import' | 'calls' | 'renders' | 'uses' | 'saves'
  label?: string
}

export interface DependencyGraph {
  nodes: CodeNode[]
  edges: CodeEdge[]
}

/**
 * TypeScript/JavaScript 파일을 AST로 파싱
 */
export function parseCode(code: string, filename: string): any {
  try {
    return parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
    })
  } catch (error) {
    console.error(`[CodeAnalyzer] Failed to parse ${filename}:`, error)
    return null
  }
}

/**
 * AST에서 import 관계 추출
 */
export function extractImports(ast: any, sourceFile: string): CodeEdge[] {
  const edges: CodeEdge[] = []

  if (!ast) return edges

  traverse(ast, {
    ImportDeclaration(path: any) {
      const importPath = path.node.source.value
      const specifiers = path.node.specifiers.map((s: any) => s.local.name).join(', ')

      edges.push({
        id: `${sourceFile}-import-${importPath}`,
        source: sourceFile,
        target: importPath,
        type: 'import',
        label: specifiers || undefined,
      })
    },
  })

  return edges
}

/**
 * AST에서 함수 호출 관계 추출
 */
export function extractFunctionCalls(ast: any, sourceFile: string): CodeEdge[] {
  const edges: CodeEdge[] = []

  if (!ast) return edges

  traverse(ast, {
    CallExpression(path: any) {
      const callee = path.node.callee

      // function call
      if (callee.type === 'Identifier') {
        edges.push({
          id: `${sourceFile}-calls-${callee.name}`,
          source: sourceFile,
          target: callee.name,
          type: 'calls',
        })
      }

      // method call (e.g., api.fetch())
      if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
        edges.push({
          id: `${sourceFile}-calls-${callee.object.name}.${callee.property.name}`,
          source: sourceFile,
          target: `${callee.object.name}.${callee.property.name}`,
          type: 'calls',
        })
      }
    },
  })

  return edges
}

/**
 * React 컴포넌트 감지
 */
export function detectReactComponent(ast: any): boolean {
  if (!ast) return false

  let isComponent = false

  traverse(ast, {
    // Function component
    FunctionDeclaration(path: any) {
      const name = path.node.id?.name
      if (name && /^[A-Z]/.test(name)) {
        // JSX return - use path.traverse() instead of traverse(path.node)
        path.traverse({
          ReturnStatement(returnPath: any) {
            if (returnPath.node.argument?.type === 'JSXElement') {
              isComponent = true
            }
          },
        })
      }
    },

    // Arrow function component
    VariableDeclarator(path: any) {
      const name = path.node.id?.name
      if (name && /^[A-Z]/.test(name) && path.node.init?.type === 'ArrowFunctionExpression') {
        // Check for JSX in the arrow function body
        path.traverse({
          ReturnStatement(returnPath: any) {
            if (returnPath.node.argument?.type === 'JSXElement') {
              isComponent = true
            }
          },
        })
      }
    },
  })

  return isComponent
}

/**
 * 파일에서 export된 심볼 추출
 */
export function extractExports(ast: any): string[] {
  const exports: string[] = []

  if (!ast) return exports

  traverse(ast, {
    ExportNamedDeclaration(path: any) {
      // export function/class/const
      if (path.node.declaration) {
        const decl = path.node.declaration
        if (decl.id?.name) {
          exports.push(decl.id.name)
        }
        // export const { a, b } = ...
        if (decl.declarations) {
          decl.declarations.forEach((d: any) => {
            if (d.id?.name) {
              exports.push(d.id.name)
            }
          })
        }
      }

      // export { a, b }
      if (path.node.specifiers) {
        path.node.specifiers.forEach((s: any) => {
          exports.push(s.exported.name)
        })
      }
    },

    ExportDefaultDeclaration(path: any) {
      if (path.node.declaration?.id?.name) {
        exports.push(path.node.declaration.id.name)
      } else {
        exports.push('default')
      }
    },
  })

  return exports
}

/**
 * 파일 하나를 분석해서 CodeNode 생성
 */
export function analyzeFile(
  filename: string,
  code: string,
  projectRoot: string
): CodeNode | null {
  const ast = parseCode(code, filename)
  if (!ast) return null

  const relativePath = filename.replace(projectRoot, '').replace(/^\//, '')
  const isComponent = detectReactComponent(ast)
  const exports = extractExports(ast)

  // Determine node type
  let type: CodeNode['type'] = 'file'
  if (isComponent) type = 'component'
  else if (filename.includes('api/') || filename.includes('service')) type = 'api'
  else if (exports.length > 0) type = 'function'

  return {
    id: relativePath,
    label: relativePath.split('/').pop() || relativePath,
    type,
    path: filename,
    metadata: {
      exports,
    },
  }
}

/**
 * 여러 파일을 분석해서 전체 의존성 그래프 생성
 */
// Helper to write debug logs to file (for packaged app)
function writeDebugLog(message: string) {
  console.log(message)
  if (typeof window !== 'undefined' && (window as any).electron?.fs?.appendFile) {
    try {
      (window as any).electron.fs.appendFile('/tmp/code_analyzer_debug.log', message + '\n')
    } catch (e) {
      // Ignore
    }
  }
}

export function buildDependencyGraph(
  files: Array<{ path: string; content: string }>,
  projectRoot: string
): DependencyGraph {
  const nodes: CodeNode[] = []
  const edges: CodeEdge[] = []

  writeDebugLog(`[CodeAnalyzer] 📊 Starting analysis of ${files.length} files`)
  writeDebugLog(`[CodeAnalyzer] 📂 Project root: ${projectRoot}`)

  // 1단계: 각 파일을 노드로 변환
  let successCount = 0
  let failCount = 0

  for (const file of files) {
    const node = analyzeFile(file.path, file.content, projectRoot)
    if (node) {
      nodes.push(node)
      successCount++
    } else {
      failCount++
      console.warn(`[CodeAnalyzer] ❌ Failed to analyze: ${file.path}`)
    }
  }

  writeDebugLog(`[CodeAnalyzer] ✅ Successfully parsed: ${successCount} files`)
  writeDebugLog(`[CodeAnalyzer] ❌ Failed to parse: ${failCount} files`)

  // 2단계: 의존성 관계를 엣지로 변환
  // Create multiple maps for flexible matching
  const exactPathMap = new Map<string, string>() // Exact path -> node ID
  const filenameMap = new Map<string, string[]>() // Filename -> [node IDs]

  nodes.forEach(node => {
    // Exact path matching (with and without extension)
    const withoutExt = node.id.replace(/\.(ts|tsx|js|jsx)$/, '')
    exactPathMap.set(withoutExt, node.id)
    exactPathMap.set(node.id, node.id)

    // Filename matching for fallback
    const filename = node.id.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || ''
    if (filename) {
      if (!filenameMap.has(filename)) {
        filenameMap.set(filename, [])
      }
      filenameMap.get(filename)!.push(node.id)
    }
  })

  console.log(`[CodeAnalyzer] 📋 Nodes: ${nodes.length}, Exact paths: ${exactPathMap.size}, Unique filenames: ${filenameMap.size}`)

  for (const file of files) {
    const ast = parseCode(file.content, file.path)
    if (!ast) continue

    const relativePath = file.path.replace(projectRoot, '').replace(/^\//, '')
    const sourceDir = relativePath.split('/').slice(0, -1).join('/')

    // Import edges - flexible matching
    const importEdges = extractImports(ast, relativePath)
      .map(edge => {
        const originalImport = edge.target
        let importPath = originalImport.replace(/\.(ts|tsx|js|jsx)$/, '')

        // 1. Try exact path matching first (for @/ aliases and relative imports)
        let resolvedPath = ''

        if (importPath.startsWith('@/')) {
          // @/components/Button -> components/Button
          resolvedPath = importPath.replace(/^@\//, '')
        } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Relative path resolution
          const parts = importPath.split('/')
          const dirParts = sourceDir.split('/').filter(Boolean)

          for (const part of parts) {
            if (part === '..') dirParts.pop()
            else if (part !== '.') dirParts.push(part)
          }

          resolvedPath = dirParts.join('/')
        } else {
          // External package - skip
          return null
        }

        // Try exact match
        let targetNodeId = exactPathMap.get(resolvedPath)
        if (targetNodeId) {
          return { ...edge, target: targetNodeId }
        }

        // Try with extensions
        for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
          targetNodeId = exactPathMap.get(resolvedPath + ext)
          if (targetNodeId) {
            return { ...edge, target: targetNodeId }
          }
        }

        // Try with /index
        for (const ext of ['/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
          targetNodeId = exactPathMap.get(resolvedPath + ext)
          if (targetNodeId) {
            return { ...edge, target: targetNodeId }
          }
        }

        // Fallback: Try filename matching (only if unique)
        const filename = resolvedPath.split('/').pop() || ''
        const candidates = filenameMap.get(filename) || []

        if (candidates.length === 1) {
          // Only one file with this name - safe to connect
          return { ...edge, target: candidates[0] }
        }

        // No unique match found
        return null
      })
      .filter(Boolean) as CodeEdge[]

    edges.push(...importEdges)
  }

  console.log(`[CodeAnalyzer] 🔗 Created ${edges.length} edges from ${nodes.length} nodes`)

  return { nodes, edges }
}

/**
 * AI가 생성한 설계 데이터를 그래프로 변환
 * (Forward: 코딩 전 설계도)
 */
export function planToGraph(planData: {
  components: Array<{ name: string; type: string; props?: string[] }>
  apis: Array<{ name: string; endpoint: string; method: string }>
  database: Array<{ table: string; fields: string[] }>
  relationships: Array<{ from: string; to: string; type: string }>
}): DependencyGraph {
  const nodes: CodeNode[] = []
  const edges: CodeEdge[] = []

  // Components
  planData.components.forEach((comp) => {
    nodes.push({
      id: comp.name,
      label: comp.name,
      type: 'component',
      path: `src/components/${comp.name}.tsx`,
      metadata: {
        props: comp.props || [],
      },
    })
  })

  // APIs
  planData.apis.forEach((api) => {
    nodes.push({
      id: api.name,
      label: `${api.method} ${api.endpoint}`,
      type: 'api',
      path: `src/api/${api.name}.ts`,
    })
  })

  // Database
  planData.database.forEach((db) => {
    nodes.push({
      id: db.table,
      label: db.table,
      type: 'database',
      path: `database/${db.table}`,
      metadata: {
        state: db.fields,
      },
    })
  })

  // Relationships
  planData.relationships.forEach((rel, idx) => {
    edges.push({
      id: `rel-${idx}`,
      source: rel.from,
      target: rel.to,
      type: rel.type as any,
    })
  })

  return { nodes, edges }
}
