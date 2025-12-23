/**
 * Mermaid Diagram Generators
 * 프로젝트 데이터를 Mermaid 다이어그램 코드로 변환
 */

import type { NeuralNode, NeuralEdge, MermaidDiagramType } from './types'

// ============================================
// Flowchart Generator (Neural Map 노드/엣지)
// ============================================

export function generateFlowchartFromNodes(
  nodes: NeuralNode[],
  edges: NeuralEdge[],
  options: { maxNodes?: number; direction?: 'TD' | 'LR' | 'BT' | 'RL' } = {}
): string {
  const { maxNodes = 50, direction = 'TD' } = options

  if (nodes.length === 0) {
    return `flowchart ${direction}\n    empty[No nodes available]`
  }

  // Limit nodes for readability
  const limitedNodes = nodes.slice(0, maxNodes)
  const nodeIds = new Set(limitedNodes.map(n => n.id))

  // Filter edges to only include those between visible nodes
  const relevantEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

  const lines: string[] = [`flowchart ${direction}`]

  // Node definitions with proper shapes based on type
  const nodeShapes: Record<string, [string, string]> = {
    folder: ['{{', '}}'],      // hexagon
    file: ['[', ']'],          // rectangle
    self: ['((', '))'],        // circle
    concept: ['([', '])'],     // stadium
    project: ['[[', ']]'],     // subroutine
    doc: ['>', ']'],           // asymmetric
    idea: ['(', ')'],          // rounded
    decision: ['{', '}'],      // rhombus
    task: ['[/', '/]'],        // parallelogram
    person: ['(((', ')))'],    // double circle
    insight: ['[/', '\\]'],    // trapezoid
    memory: ['[(', ')]'],      // cylindrical
  }

  // Add node definitions
  limitedNodes.forEach(node => {
    const [open, close] = nodeShapes[node.type] || ['[', ']']
    const label = sanitizeLabel(node.title || node.id)
    lines.push(`    ${sanitizeId(node.id)}${open}"${label}"${close}`)
  })

  // Add edges
  relevantEdges.forEach(edge => {
    const arrow = edge.bidirectional ? '<-->' : '-->'
    const label = edge.label ? `|${sanitizeLabel(edge.label)}|` : ''
    lines.push(`    ${sanitizeId(edge.source)} ${arrow}${label} ${sanitizeId(edge.target)}`)
  })

  // Add styling based on node types
  const typeColors: Record<string, string> = {
    folder: '#f59e0b',
    file: '#3b82f6',
    self: '#8b5cf6',
    concept: '#10b981',
    project: '#ec4899',
  }

  const typeGroups = new Map<string, string[]>()
  limitedNodes.forEach(node => {
    if (!typeGroups.has(node.type)) {
      typeGroups.set(node.type, [])
    }
    typeGroups.get(node.type)!.push(sanitizeId(node.id))
  })

  typeGroups.forEach((ids, type) => {
    const color = typeColors[type] || '#71717a'
    lines.push(`    style ${ids.join(',')} fill:${color},stroke:${color},color:#fff`)
  })

  return lines.join('\n')
}

// ============================================
// GitGraph Generator (Git 히스토리)
// ============================================

export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  branch: string
  parents: string[]
  date: string
  isMerge: boolean
  tags: string[]
}

export function generateGitGraph(commits: GitCommit[], options: { maxCommits?: number } = {}): string {
  const { maxCommits = 30 } = options

  if (commits.length === 0) {
    return `gitGraph\n    commit id: "No commits"`
  }

  const limitedCommits = commits.slice(0, maxCommits)
  const lines: string[] = ['gitGraph']

  const seenBranches = new Set<string>()
  let currentBranch = 'main'

  limitedCommits.forEach((commit, index) => {
    const branch = commit.branch || 'main'

    // Branch management
    if (branch !== currentBranch) {
      if (!seenBranches.has(branch)) {
        lines.push(`    branch ${sanitizeBranchName(branch)}`)
        seenBranches.add(branch)
      }
      lines.push(`    checkout ${sanitizeBranchName(branch)}`)
      currentBranch = branch
    }

    // Commit
    const id = commit.shortHash || `c${index}`
    const msg = sanitizeLabel(commit.message.split('\n')[0].substring(0, 30))

    if (commit.isMerge && commit.parents.length > 1) {
      // For merge commits, we'd need to track parent branches
      lines.push(`    merge ${sanitizeBranchName(commit.branch)} id: "${id}"`)
    } else {
      const tagStr = commit.tags.length > 0 ? ` tag: "${commit.tags[0]}"` : ''
      lines.push(`    commit id: "${id}: ${msg}"${tagStr}`)
    }
  })

  return lines.join('\n')
}

// Parse git log output to GitCommit objects
export function parseGitLog(gitLogOutput: string): GitCommit[] {
  const commits: GitCommit[] = []
  const lines = gitLogOutput.trim().split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Expected format: hash|shortHash|message|branch|parents|date|tags
    const parts = line.split('|')
    if (parts.length >= 6) {
      const [hash, shortHash, message, branch, parents, date, tags = ''] = parts
      commits.push({
        hash: hash.trim(),
        shortHash: shortHash.trim(),
        message: message.trim(),
        branch: branch.trim().replace('HEAD -> ', '').split(',')[0]?.trim() || 'main',
        parents: parents.trim().split(' ').filter(Boolean),
        date: date.trim(),
        isMerge: parents.trim().split(' ').length > 1,
        tags: tags.split(',').map(t => t.trim().replace('tag: ', '')).filter(Boolean),
      })
    }
  }

  return commits
}

// ============================================
// Pie Chart Generator (파일 통계)
// ============================================

export interface FileStats {
  extension: string
  count: number
  size?: number
}

export function generatePieChart(
  stats: FileStats[],
  options: { title?: string; showData?: boolean; bySize?: boolean } = {}
): string {
  const { title = 'File Distribution', showData = true, bySize = false } = options

  if (stats.length === 0) {
    return `pie showData\n    title No files\n    "Empty" : 1`
  }

  // Sort by count/size descending
  const sorted = [...stats].sort((a, b) =>
    bySize ? ((b.size || 0) - (a.size || 0)) : (b.count - a.count)
  )

  // Limit to top 10 and group rest as "Others"
  const top = sorted.slice(0, 10)
  const rest = sorted.slice(10)

  if (rest.length > 0) {
    const otherValue = rest.reduce((sum, s) => sum + (bySize ? (s.size || 0) : s.count), 0)
    top.push({ extension: 'Others', count: otherValue, size: otherValue })
  }

  const lines: string[] = [
    `pie ${showData ? 'showData' : ''}`,
    `    title ${title}`,
  ]

  top.forEach(stat => {
    const value = bySize ? (stat.size || 0) : stat.count
    const label = stat.extension || 'No extension'
    lines.push(`    "${label}" : ${value}`)
  })

  return lines.join('\n')
}

// ============================================
// Class Diagram Generator (TypeScript)
// ============================================

export interface TypeInfo {
  name: string
  kind: 'class' | 'interface' | 'type' | 'enum'
  properties: { name: string; type: string; visibility?: '+' | '-' | '#' }[]
  methods: { name: string; params: string; returnType: string; visibility?: '+' | '-' | '#' }[]
  extends?: string
  implements?: string[]
}

export function generateClassDiagram(types: TypeInfo[]): string {
  if (types.length === 0) {
    return `classDiagram\n    class Empty {\n        No types found\n    }`
  }

  const lines: string[] = ['classDiagram']

  types.forEach(type => {
    const keyword = type.kind === 'interface' ? '<<interface>>' :
                    type.kind === 'enum' ? '<<enumeration>>' : ''

    lines.push(`    class ${sanitizeClassName(type.name)} {`)

    if (keyword) {
      lines.push(`        ${keyword}`)
    }

    // Properties
    type.properties.forEach(prop => {
      const vis = prop.visibility || '+'
      lines.push(`        ${vis}${prop.type} ${prop.name}`)
    })

    // Methods
    type.methods.forEach(method => {
      const vis = method.visibility || '+'
      lines.push(`        ${vis}${method.name}(${method.params}) ${method.returnType}`)
    })

    lines.push(`    }`)

    // Inheritance
    if (type.extends) {
      lines.push(`    ${sanitizeClassName(type.extends)} <|-- ${sanitizeClassName(type.name)}`)
    }

    // Implementation
    type.implements?.forEach(impl => {
      lines.push(`    ${sanitizeClassName(impl)} <|.. ${sanitizeClassName(type.name)}`)
    })
  })

  return lines.join('\n')
}

// ============================================
// ER Diagram Generator (Database Schema)
// ============================================

export interface TableInfo {
  name: string
  columns: {
    name: string
    type: string
    isPrimary?: boolean
    isForeign?: boolean
    references?: { table: string; column: string }
  }[]
}

export function generateERDiagram(tables: TableInfo[]): string {
  if (tables.length === 0) {
    return `erDiagram\n    EMPTY {\n        string message "No tables found"\n    }`
  }

  const lines: string[] = ['erDiagram']
  const relationships: string[] = []

  tables.forEach(table => {
    lines.push(`    ${sanitizeTableName(table.name)} {`)

    table.columns.forEach(col => {
      const pk = col.isPrimary ? 'PK' : ''
      const fk = col.isForeign ? 'FK' : ''
      const constraint = [pk, fk].filter(Boolean).join(',')
      const constraintStr = constraint ? ` ${constraint}` : ''
      lines.push(`        ${col.type} ${col.name}${constraintStr}`)

      // Track relationships
      if (col.references) {
        const rel = `    ${sanitizeTableName(col.references.table)} ||--o{ ${sanitizeTableName(table.name)} : "has"`
        if (!relationships.includes(rel)) {
          relationships.push(rel)
        }
      }
    })

    lines.push(`    }`)
  })

  // Add relationships at the top
  return [...lines.slice(0, 1), ...relationships, ...lines.slice(1)].join('\n')
}

// ============================================
// State Diagram Generator (Zustand)
// ============================================

export interface StateInfo {
  name: string
  states: string[]
  actions: { name: string; from?: string; to?: string }[]
  initialState?: string
}

export function generateStateDiagram(stateInfo: StateInfo): string {
  if (!stateInfo.states.length) {
    return `stateDiagram-v2\n    [*] --> Empty\n    Empty --> [*]`
  }

  const lines: string[] = ['stateDiagram-v2']

  // Initial state
  if (stateInfo.initialState) {
    lines.push(`    [*] --> ${sanitizeStateName(stateInfo.initialState)}`)
  } else if (stateInfo.states.length > 0) {
    lines.push(`    [*] --> ${sanitizeStateName(stateInfo.states[0])}`)
  }

  // State transitions from actions
  stateInfo.actions.forEach(action => {
    if (action.from && action.to) {
      lines.push(`    ${sanitizeStateName(action.from)} --> ${sanitizeStateName(action.to)} : ${action.name}()`)
    }
  })

  // Add note for store name
  if (stateInfo.name) {
    lines.push(`    note right of ${sanitizeStateName(stateInfo.states[0])} : ${stateInfo.name}`)
  }

  return lines.join('\n')
}

// ============================================
// Sequence Diagram Generator (API Routes)
// ============================================

export interface APIRoute {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handlers: string[] // middleware chain
}

export function generateSequenceDiagram(routes: APIRoute[]): string {
  if (routes.length === 0) {
    return `sequenceDiagram\n    participant C as Client\n    participant S as Server\n    C->>S: No routes defined`
  }

  const lines: string[] = ['sequenceDiagram']

  // Define participants
  lines.push('    participant U as User')
  lines.push('    participant C as Client')
  lines.push('    participant S as Server')
  lines.push('    participant D as Database')
  lines.push('')

  // Generate sequence for each route (limit to 5 for readability)
  const limitedRoutes = routes.slice(0, 5)

  limitedRoutes.forEach((route, index) => {
    if (index > 0) lines.push('')

    const endpoint = route.path.replace('/api/', '')
    lines.push(`    Note over U,D: ${route.method} ${route.path}`)
    lines.push(`    U->>C: ${route.method} ${endpoint}`)
    lines.push(`    C->>S: API Request`)

    // Add middleware/handler chain
    if (route.handlers.length > 0) {
      route.handlers.forEach(handler => {
        lines.push(`    S->>S: ${handler}()`)
      })
    }

    // Typical DB interaction based on method
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method)) {
      lines.push(`    S->>D: Write data`)
      lines.push(`    D-->>S: Confirm`)
    } else {
      lines.push(`    S->>D: Query data`)
      lines.push(`    D-->>S: Return results`)
    }

    lines.push(`    S-->>C: JSON Response`)
    lines.push(`    C-->>U: Display result`)
  })

  return lines.join('\n')
}

// ============================================
// Gantt Chart Generator (Tasks)
// ============================================

export interface TaskInfo {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  startDate?: string
  endDate?: string
  duration?: number // days
  section?: string
  dependencies?: string[]
}

export function generateGanttChart(
  tasks: TaskInfo[],
  options: { title?: string; dateFormat?: string } = {}
): string {
  const { title = 'Project Timeline', dateFormat = 'YYYY-MM-DD' } = options

  if (tasks.length === 0) {
    return `gantt\n    title ${title}\n    dateFormat ${dateFormat}\n    section Tasks\n    No tasks : 2024-01-01, 1d`
  }

  const lines: string[] = [
    'gantt',
    `    title ${title}`,
    `    dateFormat ${dateFormat}`,
  ]

  // Group tasks by section
  const sections = new Map<string, TaskInfo[]>()
  tasks.forEach(task => {
    const section = task.section || 'General'
    if (!sections.has(section)) {
      sections.set(section, [])
    }
    sections.get(section)!.push(task)
  })

  sections.forEach((sectionTasks, sectionName) => {
    lines.push('')
    lines.push(`    section ${sectionName}`)

    sectionTasks.forEach(task => {
      const status = task.status === 'done' ? 'done,' :
                     task.status === 'in_progress' ? 'active,' : ''
      const deps = task.dependencies?.length ? `after ${task.dependencies.join(' ')}` : ''
      const start = task.startDate || (deps ? '' : '2024-01-01')
      const duration = task.duration ? `${task.duration}d` : '7d'
      const end = task.endDate || duration

      const taskLine = deps
        ? `    ${sanitizeLabel(task.title)} :${status}${sanitizeId(task.id)}, ${deps}, ${end}`
        : `    ${sanitizeLabel(task.title)} :${status}${sanitizeId(task.id)}, ${start}, ${end}`

      lines.push(taskLine)
    })
  })

  return lines.join('\n')
}

// ============================================
// Utility Functions
// ============================================

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

function sanitizeLabel(label: string): string {
  return label
    .replace(/"/g, "'")
    .replace(/[\n\r]/g, ' ')
    .substring(0, 50)
}

function sanitizeBranchName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 30)
}

function sanitizeClassName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30)
}

function sanitizeTableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase().substring(0, 30)
}

function sanitizeStateName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30)
}

// ============================================
// Master Generator (타입별 자동 선택)
// ============================================

export interface GeneratorContext {
  nodes?: NeuralNode[]
  edges?: NeuralEdge[]
  gitLog?: string
  fileStats?: FileStats[]
  types?: TypeInfo[]
  tables?: TableInfo[]
  stateInfo?: StateInfo
  routes?: APIRoute[]
  tasks?: TaskInfo[]
}

export function generateDiagram(
  type: MermaidDiagramType,
  context: GeneratorContext
): string {
  switch (type) {
    case 'flowchart':
      return generateFlowchartFromNodes(context.nodes || [], context.edges || [])

    case 'gitgraph':
      if (context.gitLog) {
        return generateGitGraph(parseGitLog(context.gitLog))
      }
      return `gitGraph\n    commit id: "Run git sync to load history"`

    case 'pie':
      return generatePieChart(context.fileStats || [], { title: 'Codebase Distribution' })

    case 'class':
      return generateClassDiagram(context.types || [])

    case 'er':
      return generateERDiagram(context.tables || [])

    case 'state':
      return generateStateDiagram(context.stateInfo || { name: 'Store', states: [], actions: [] })

    case 'sequence':
      return generateSequenceDiagram(context.routes || [])

    case 'gantt':
      return generateGanttChart(context.tasks || [], { title: 'Project Tasks' })

    default:
      return `flowchart TD\n    A[Unsupported diagram type]`
  }
}
