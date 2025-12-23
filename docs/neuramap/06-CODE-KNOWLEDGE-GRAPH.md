# 06. 코드 지식 그래프 (Code Knowledge Graph)

## 🧠 개요

코드 지식 그래프는 코드베이스의 구조적 관계를 그래프로 표현하여 에이전트가 코드 컨텍스트를 빠르게 이해하도록 돕습니다.

---

## 📊 그래프 구조

### 노드 타입 (Node Types)

```typescript
type NodeType =
  | 'File'
  | 'Class'
  | 'Interface'
  | 'Function'
  | 'Method'
  | 'Variable'
  | 'Constant'
  | 'Type'
  | 'Module'
  | 'Package';

interface GraphNode {
  id: string;                      // 고유 식별자
  type: NodeType;
  name: string;
  location: Location;
  metadata: NodeMetadata;
}

interface Location {
  file: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

interface NodeMetadata {
  visibility?: 'public' | 'private' | 'protected';
  isExported?: boolean;
  isAsync?: boolean;
  returnType?: string;
  parameters?: Parameter[];
  documentation?: string;
  complexity?: number;             // Cyclomatic complexity
  testCoverage?: number;           // %
}
```

### 엣지 타입 (Edge Types)

```typescript
type EdgeType =
  | 'imports'          // A imports B
  | 'exports'          // A exports B
  | 'calls'            // A calls B
  | 'extends'          // A extends B
  | 'implements'       // A implements B
  | 'uses'             // A uses B (변수 참조)
  | 'defines'          // A defines B (포함 관계)
  | 'type_of'          // A is type of B
  | 'returns'          // A returns B
  | 'depends_on';      // A depends on B (일반 의존성)

interface GraphEdge {
  id: string;
  type: EdgeType;
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  weight?: number;                 // 관계 강도 (호출 횟수 등)
  metadata?: EdgeMetadata;
}

interface EdgeMetadata {
  locations?: Location[];          // 관계가 발생한 위치들
  count?: number;                  // 호출 횟수, 참조 횟수
}
```

---

## 🏗️ 그래프 구축 프로세스

### 1. 파일 스캔

```typescript
// lib/code-graph/scanner.ts
import { Project } from 'ts-morph';

export async function scanCodebase(rootPath: string): Promise<CodeGraph> {
  const project = new Project({
    tsConfigFilePath: `${rootPath}/tsconfig.json`,
  });

  const graph = new CodeGraph();

  // 모든 소스 파일 스캔
  for (const sourceFile of project.getSourceFiles()) {
    const fileNode = createFileNode(sourceFile);
    graph.addNode(fileNode);

    // 클래스 스캔
    for (const classDecl of sourceFile.getClasses()) {
      const classNode = createClassNode(classDecl);
      graph.addNode(classNode);
      graph.addEdge({
        type: 'defines',
        source: fileNode.id,
        target: classNode.id,
      });

      // 메서드 스캔
      for (const method of classDecl.getMethods()) {
        const methodNode = createMethodNode(method);
        graph.addNode(methodNode);
        graph.addEdge({
          type: 'defines',
          source: classNode.id,
          target: methodNode.id,
        });
      }
    }

    // 함수 스캔
    for (const func of sourceFile.getFunctions()) {
      const funcNode = createFunctionNode(func);
      graph.addNode(funcNode);
      graph.addEdge({
        type: 'defines',
        source: fileNode.id,
        target: funcNode.id,
      });
    }

    // Import/Export 관계
    scanImportsExports(sourceFile, graph);
  }

  return graph;
}
```

### 2. 의존성 분석

```typescript
function scanImportsExports(sourceFile: SourceFile, graph: CodeGraph): void {
  // Import 문 분석
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const importedSymbols = importDecl.getNamedImports().map(n => n.getName());

    for (const symbol of importedSymbols) {
      const targetNode = graph.findNode({ name: symbol, type: 'Function' });
      if (targetNode) {
        graph.addEdge({
          type: 'imports',
          source: sourceFile.getFilePath(),
          target: targetNode.id,
        });
      }
    }
  }

  // Export 문 분석
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    // ... export 관계 추가
  }
}
```

### 3. 호출 그래프 (Call Graph) 생성

```typescript
function buildCallGraph(graph: CodeGraph): void {
  for (const node of graph.nodes.filter(n => n.type === 'Function' || n.type === 'Method')) {
    const sourceFile = getSourceFileForNode(node);
    const funcDecl = sourceFile.getFunction(node.name);

    // 함수 본문에서 호출 찾기
    funcDecl?.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const calledFunc = call.getExpression().getText();
      const targetNode = graph.findNode({ name: calledFunc });

      if (targetNode) {
        graph.addEdge({
          type: 'calls',
          source: node.id,
          target: targetNode.id,
          metadata: {
            locations: [getLocation(call)],
            count: 1,
          },
        });
      }
    });
  }
}
```

---

## 🔍 그래프 쿼리 (Graph Queries)

### 1. 심볼 정의 찾기

```typescript
// repo.symbols 구현에 사용
function findSymbolDefinitions(graph: CodeGraph, symbolName: string): GraphNode[] {
  return graph.nodes.filter(node =>
    node.name === symbolName &&
    (node.type === 'Function' || node.type === 'Class' || node.type === 'Variable')
  );
}
```

### 2. 참조 찾기 (Find References)

```typescript
function findReferences(graph: CodeGraph, nodeId: string): Location[] {
  const incomingEdges = graph.getIncomingEdges(nodeId);
  const references: Location[] = [];

  for (const edge of incomingEdges) {
    if (edge.type === 'calls' || edge.type === 'uses') {
      references.push(...(edge.metadata?.locations || []));
    }
  }

  return references;
}
```

### 3. 의존성 체인 추적

```typescript
function getDependencyChain(
  graph: CodeGraph,
  startNodeId: string,
  maxDepth: number = 5
): GraphNode[] {
  const visited = new Set<string>();
  const chain: GraphNode[] = [];

  function traverse(nodeId: string, depth: number) {
    if (depth > maxDepth || visited.has(nodeId)) return;

    visited.add(nodeId);
    const node = graph.getNode(nodeId);
    if (node) chain.push(node);

    const outgoingEdges = graph.getOutgoingEdges(nodeId);
    for (const edge of outgoingEdges) {
      if (edge.type === 'imports' || edge.type === 'depends_on') {
        traverse(edge.target, depth + 1);
      }
    }
  }

  traverse(startNodeId, 0);
  return chain;
}
```

### 4. 영향도 분석 (Impact Analysis)

```typescript
function analyzeImpact(graph: CodeGraph, nodeId: string): ImpactAnalysis {
  // 직접 의존하는 노드
  const directDependents = graph.getIncomingEdges(nodeId)
    .map(edge => graph.getNode(edge.source))
    .filter(Boolean);

  // 간접 의존하는 노드 (재귀)
  const indirectDependents = new Set<GraphNode>();
  function collectIndirect(currentId: string, depth: number) {
    if (depth > 3) return;

    for (const edge of graph.getIncomingEdges(currentId)) {
      const node = graph.getNode(edge.source);
      if (node && !indirectDependents.has(node)) {
        indirectDependents.add(node);
        collectIndirect(edge.source, depth + 1);
      }
    }
  }
  collectIndirect(nodeId, 0);

  // 영향 받는 파일 목록
  const affectedFiles = new Set<string>();
  [...directDependents, ...indirectDependents].forEach(node => {
    affectedFiles.add(node.location.file);
  });

  return {
    directDependents,
    indirectDependents: Array.from(indirectDependents),
    affectedFiles: Array.from(affectedFiles),
    totalImpact: directDependents.length + indirectDependents.size,
  };
}
```

---

## 🗄️ 그래프 저장 및 인덱싱

### 저장 포맷 (JSON)

```json
{
  "version": "1.0",
  "generatedAt": "2025-12-23T12:00:00Z",
  "rootPath": "/Users/user/project",
  "nodes": [
    {
      "id": "file:src/auth/login.ts",
      "type": "File",
      "name": "login.ts",
      "location": {
        "file": "src/auth/login.ts",
        "startLine": 1,
        "endLine": 100
      },
      "metadata": {
        "isExported": true
      }
    },
    {
      "id": "func:validateLogin",
      "type": "Function",
      "name": "validateLogin",
      "location": {
        "file": "src/auth/login.ts",
        "startLine": 15,
        "endLine": 25
      },
      "metadata": {
        "visibility": "public",
        "isExported": true,
        "returnType": "boolean",
        "parameters": [
          { "name": "email", "type": "string" },
          { "name": "password", "type": "string" }
        ],
        "complexity": 3
      }
    }
  ],
  "edges": [
    {
      "id": "edge:1",
      "type": "defines",
      "source": "file:src/auth/login.ts",
      "target": "func:validateLogin"
    },
    {
      "id": "edge:2",
      "type": "calls",
      "source": "func:login",
      "target": "func:validateLogin",
      "metadata": {
        "count": 2,
        "locations": [
          { "file": "src/auth/index.ts", "startLine": 42, "endLine": 42 }
        ]
      }
    }
  ]
}
```

### 인덱스 구조

```typescript
// In-memory 인덱스 (빠른 조회)
class CodeGraphIndex {
  private nameIndex: Map<string, GraphNode[]>;
  private typeIndex: Map<NodeType, GraphNode[]>;
  private fileIndex: Map<string, GraphNode[]>;

  constructor(graph: CodeGraph) {
    this.buildIndexes(graph);
  }

  private buildIndexes(graph: CodeGraph): void {
    this.nameIndex = new Map();
    this.typeIndex = new Map();
    this.fileIndex = new Map();

    for (const node of graph.nodes) {
      // Name index
      const nameNodes = this.nameIndex.get(node.name) || [];
      nameNodes.push(node);
      this.nameIndex.set(node.name, nameNodes);

      // Type index
      const typeNodes = this.typeIndex.get(node.type) || [];
      typeNodes.push(node);
      this.typeIndex.set(node.type, typeNodes);

      // File index
      const fileNodes = this.fileIndex.get(node.location.file) || [];
      fileNodes.push(node);
      this.fileIndex.set(node.location.file, fileNodes);
    }
  }

  findByName(name: string): GraphNode[] {
    return this.nameIndex.get(name) || [];
  }

  findByType(type: NodeType): GraphNode[] {
    return this.typeIndex.get(type) || [];
  }

  findByFile(file: string): GraphNode[] {
    return this.fileIndex.get(file) || [];
  }
}
```

---

## 🔄 증분 업데이트 (Incremental Update)

파일 변경 시 전체 그래프를 재구축하지 않고 증분 업데이트:

```typescript
class CodeGraphUpdater {
  async updateOnFileChange(
    graph: CodeGraph,
    changedFile: string
  ): Promise<void> {
    // 1. 해당 파일의 기존 노드 제거
    const oldNodes = graph.getNodesByFile(changedFile);
    for (const node of oldNodes) {
      graph.removeNode(node.id);
    }

    // 2. 해당 파일 재스캔
    const newNodes = await scanSingleFile(changedFile);
    for (const node of newNodes) {
      graph.addNode(node);
    }

    // 3. Import/Export 관계 재구축
    await rebuildFileRelations(graph, changedFile);

    // 4. 호출 그래프 재구축 (영향 받는 부분만)
    const affectedFiles = getFilesImportingOrExporting(graph, changedFile);
    for (const file of affectedFiles) {
      await rebuildCallGraphForFile(graph, file);
    }

    // 5. 인덱스 재구축
    graph.rebuildIndexes();
  }
}
```

---

## 🔗 LSP 통합

Language Server Protocol과 통합하여 더 정확한 정보 획득:

```typescript
import { LanguageClient } from 'vscode-languageclient/node';

class LSPIntegration {
  private client: LanguageClient;

  async enhanceGraphWithLSP(graph: CodeGraph): Promise<void> {
    for (const node of graph.nodes) {
      if (node.type === 'Function' || node.type === 'Method') {
        // LSP로 정확한 타입 정보 조회
        const typeInfo = await this.client.sendRequest('textDocument/hover', {
          textDocument: { uri: `file://${node.location.file}` },
          position: {
            line: node.location.startLine - 1,
            character: node.location.startColumn,
          },
        });

        node.metadata.returnType = extractReturnType(typeInfo);
        node.metadata.parameters = extractParameters(typeInfo);
      }
    }
  }

  async findReferencesViaLSP(
    file: string,
    line: number,
    character: number
  ): Promise<Location[]> {
    const refs = await this.client.sendRequest('textDocument/references', {
      textDocument: { uri: `file://${file}` },
      position: { line: line - 1, character },
      context: { includeDeclaration: false },
    });

    return refs.map(ref => ({
      file: ref.uri.replace('file://', ''),
      startLine: ref.range.start.line + 1,
      endLine: ref.range.end.line + 1,
      startColumn: ref.range.start.character,
      endColumn: ref.range.end.character,
    }));
  }
}
```

---

## 🎯 에이전트에서 활용

### Plan Phase에서 컨텍스트 수집

```typescript
async function gatherContextForPlan(
  graph: CodeGraph,
  userRequest: string
): Promise<CodeContext> {
  // 1. 요청에서 키워드 추출
  const keywords = extractKeywords(userRequest); // ["login", "validation"]

  // 2. 관련 심볼 찾기
  const relevantNodes: GraphNode[] = [];
  for (const keyword of keywords) {
    relevantNodes.push(...graph.index.findByName(keyword));
  }

  // 3. 의존성 체인 수집
  const dependencies: GraphNode[] = [];
  for (const node of relevantNodes) {
    dependencies.push(...getDependencyChain(graph, node.id, 2));
  }

  // 4. 영향도 분석
  const impacts: ImpactAnalysis[] = [];
  for (const node of relevantNodes) {
    impacts.push(analyzeImpact(graph, node.id));
  }

  return {
    relevantSymbols: relevantNodes,
    dependencies,
    impacts,
    affectedFiles: [...new Set(impacts.flatMap(i => i.affectedFiles))],
  };
}
```

### Modify Phase에서 영향 받는 파일 찾기

```typescript
async function findFilesToModify(
  graph: CodeGraph,
  targetSymbol: string
): Promise<string[]> {
  const nodes = graph.index.findByName(targetSymbol);
  const files = new Set<string>();

  for (const node of nodes) {
    files.add(node.location.file);

    // 테스트 파일도 포함
    const testFile = node.location.file.replace(/\.ts$/, '.test.ts');
    if (await fileExists(testFile)) {
      files.add(testFile);
    }
  }

  return Array.from(files);
}
```

---

## 📚 다음 문서

➡️ **[07-MEMORY-MANAGEMENT.md](./07-MEMORY-MANAGEMENT.md)** - Git-Context-Controller와 메모리 관리
