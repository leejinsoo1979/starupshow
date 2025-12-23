# 03. API 명세서

## 📡 Tool API 전체 정의

NeuraMap 에이전트가 코드베이스와 상호작용하기 위한 전체 도구(Tool) API를 정의합니다.

---

## 1. repo.search

코드베이스에서 패턴이나 키워드를 검색합니다.

### 함수 시그니처

```typescript
repo.search(params: SearchParams): Promise<SearchResult>

interface SearchParams {
  query: string;           // 검색 쿼리 (regex 지원)
  path?: string;           // 검색 대상 경로 (기본: 전체)
  type?: string;           // 파일 타입 필터 (예: "ts", "tsx")
  caseSensitive?: boolean; // 대소문자 구분 (기본: false)
  maxResults?: number;     // 최대 결과 수 (기본: 100)
}

interface SearchResult {
  success: boolean;
  matches: SearchMatch[];
  totalCount: number;
  executionTime: number;   // ms
}

interface SearchMatch {
  file: string;            // 파일 경로
  line: number;            // 라인 번호
  column: number;          // 컬럼 번호
  content: string;         // 매칭된 라인 내용
  context?: {              // 선택적 컨텍스트
    before: string[];      // 이전 라인들
    after: string[];       // 이후 라인들
  };
}
```

### 예시

```typescript
// 사용 예시
const result = await repo.search({
  query: "function.*Login",
  path: "src/auth",
  type: "ts"
});

// 결과
{
  success: true,
  matches: [
    {
      file: "src/auth/login.ts",
      line: 15,
      column: 8,
      content: "function validateLogin(email: string, password: string) {",
      context: {
        before: ["", "// Validates user login credentials"],
        after: ["  if (!email || !password) {", "    throw new Error('Missing credentials');"]
      }
    }
  ],
  totalCount: 1,
  executionTime: 45
}
```

### 구현 가이드

```typescript
// ai-backend/tools/repo/search.ts
import { spawn } from 'child_process';

export async function searchHandler(params: SearchParams): Promise<SearchResult> {
  const { query, path = '.', type, caseSensitive = false, maxResults = 100 } = params;

  // ripgrep (rg) 사용
  const args = [
    query,
    path,
    '--json',
    '--max-count', String(maxResults),
  ];

  if (!caseSensitive) args.push('--ignore-case');
  if (type) args.push('--type', type);

  const startTime = Date.now();
  const matches: SearchMatch[] = [];

  return new Promise((resolve, reject) => {
    const proc = spawn('rg', args);
    let output = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      // JSON 파싱 및 변환
      const lines = output.split('\n').filter(l => l);
      lines.forEach(line => {
        try {
          const json = JSON.parse(line);
          if (json.type === 'match') {
            matches.push({
              file: json.data.path.text,
              line: json.data.line_number,
              column: json.data.submatches[0].start,
              content: json.data.lines.text.trim(),
            });
          }
        } catch (e) {
          // 파싱 실패 무시
        }
      });

      resolve({
        success: true,
        matches,
        totalCount: matches.length,
        executionTime: Date.now() - startTime,
      });
    });

    proc.on('error', reject);
  });
}
```

---

## 2. repo.read

파일의 내용을 읽습니다 (전체 또는 범위 지정).

### 함수 시그니처

```typescript
repo.read(params: ReadParams): Promise<ReadResult>

interface ReadParams {
  file: string;           // 파일 경로
  startLine?: number;     // 시작 라인 (1-based)
  endLine?: number;       // 끝 라인 (inclusive)
  encoding?: string;      // 인코딩 (기본: 'utf-8')
}

interface ReadResult {
  success: boolean;
  content: string;
  lines: number;
  size: number;           // bytes
  language?: string;      // 감지된 언어
  error?: string;
}
```

### 예시

```typescript
// 전체 파일 읽기
const full = await repo.read({ file: "src/auth/login.ts" });

// 범위 지정 읽기
const partial = await repo.read({
  file: "src/auth/login.ts",
  startLine: 10,
  endLine: 30
});

// 결과
{
  success: true,
  content: "function validateLogin(email: string, password: string) {\n  ...",
  lines: 21,
  size: 842,
  language: "typescript"
}
```

### 구현 가이드

```typescript
// ai-backend/tools/repo/read.ts
import fs from 'fs/promises';
import path from 'path';

export async function readHandler(params: ReadParams): Promise<ReadResult> {
  const { file, startLine, endLine, encoding = 'utf-8' } = params;

  try {
    const fullPath = path.resolve(process.cwd(), file);
    const content = await fs.readFile(fullPath, encoding);
    const allLines = content.split('\n');

    let resultContent: string;
    if (startLine !== undefined || endLine !== undefined) {
      const start = (startLine || 1) - 1;
      const end = endLine || allLines.length;
      resultContent = allLines.slice(start, end).join('\n');
    } else {
      resultContent = content;
    }

    const stats = await fs.stat(fullPath);
    const language = detectLanguage(fullPath);

    return {
      success: true,
      content: resultContent,
      lines: resultContent.split('\n').length,
      size: stats.size,
      language,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      lines: 0,
      size: 0,
      error: error.message,
    };
  }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    // ... 추가
  };
  return langMap[ext] || ext;
}
```

---

## 3. repo.symbols

코드베이스에서 심볼(함수, 클래스 등)을 검색합니다.

### 함수 시그니처

```typescript
repo.symbols(params: SymbolParams): Promise<SymbolResult>

interface SymbolParams {
  name: string;                    // 심볼 이름
  kind?: SymbolKind[];             // 종류 필터
  includeReferences?: boolean;     // 참조 포함 여부
}

type SymbolKind = 'function' | 'class' | 'variable' | 'interface' | 'type' | 'method' | 'property';

interface SymbolResult {
  success: boolean;
  symbols: SymbolInfo[];
  totalCount: number;
}

interface SymbolInfo {
  name: string;
  kind: SymbolKind;
  location: Location;
  container?: string;              // 포함하는 클래스/네임스페이스
  signature?: string;              // 타입 시그니처
  documentation?: string;          // JSDoc 등
  references?: Location[];         // includeReferences=true인 경우
}

interface Location {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}
```

### 예시

```typescript
// 함수 정의 찾기
const result = await repo.symbols({
  name: "validateLogin",
  kind: ["function"],
  includeReferences: true
});

// 결과
{
  success: true,
  symbols: [
    {
      name: "validateLogin",
      kind: "function",
      location: {
        file: "src/auth/login.ts",
        line: 15,
        column: 9,
        endLine: 20,
        endColumn: 1
      },
      signature: "(email: string, password: string) => boolean",
      documentation: "Validates user login credentials",
      references: [
        { file: "src/auth/index.ts", line: 42, column: 10 },
        { file: "src/auth/login.test.ts", line: 8, column: 20 }
      ]
    }
  ],
  totalCount: 1
}
```

### 구현 가이드

```typescript
// ai-backend/tools/repo/symbols.ts
import { spawn } from 'child_process';

export async function symbolsHandler(params: SymbolParams): Promise<SymbolResult> {
  // ctags 사용
  const args = [
    '-R',
    '--fields=+nKs',
    '--output-format=json',
    `--language-force=${detectLanguageForCTags()}`,
  ];

  const proc = spawn('ctags', args);
  const symbols: SymbolInfo[] = [];

  // ... ctags JSON 파싱 로직

  // LSP를 사용한 더 정확한 구현 (선택적)
  if (params.includeReferences) {
    // LSP textDocument/references 호출
    const lspRefs = await queryLSPReferences(params.name);
    // symbols에 references 추가
  }

  return {
    success: true,
    symbols,
    totalCount: symbols.length,
  };
}
```

---

## 4. repo.patch

구조화된 패치를 적용하여 파일을 생성/수정/삭제합니다.

### 함수 시그니처

```typescript
repo.patch(params: PatchParams): Promise<PatchResult>

interface PatchParams {
  operations: PatchOperation[];
  dryRun?: boolean;                // 실제 적용하지 않고 미리보기
  createBackup?: boolean;          // 백업 생성 여부
}

type PatchOperation = CreateOperation | ModifyOperation | DeleteOperation;

interface CreateOperation {
  op: 'create';
  path: string;
  content: string;
}

interface ModifyOperation {
  op: 'modify';
  path: string;
  changes: Change[];
}

interface Change {
  oldText: string;                 // 기존 텍스트 (정확히 매칭)
  newText: string;                 // 새 텍스트
  startLine?: number;              // 선택적: 검색 시작 위치
}

interface DeleteOperation {
  op: 'delete';
  path: string;
}

interface PatchResult {
  success: boolean;
  results: OperationResult[];
  totalOperations: number;
  successCount: number;
  failureCount: number;
}

interface OperationResult {
  operation: PatchOperation;
  success: boolean;
  error?: string;
  diff?: string;                   // unified diff 형식
}
```

### 예시

```typescript
// 다중 파일 수정
const result = await repo.patch({
  operations: [
    {
      op: 'modify',
      path: 'src/auth/login.ts',
      changes: [
        {
          oldText: 'function validateLogin(email, password) {',
          newText: 'function validateLogin(email: string, password: string) {\n  if (!email || !password) throw new Error("Missing credentials");'
        }
      ]
    },
    {
      op: 'create',
      path: 'src/auth/login.test.ts',
      content: 'import { validateLogin } from "./login";\n\ndescribe("validateLogin", () => {\n  it("should validate correct credentials", () => {\n    expect(validateLogin("test@example.com", "password123")).toBe(true);\n  });\n});'
    }
  ],
  createBackup: true
});

// 결과
{
  success: true,
  results: [
    {
      operation: { op: 'modify', path: 'src/auth/login.ts', ... },
      success: true,
      diff: "@@ -15,1 +15,2 @@\n-function validateLogin(email, password) {\n+function validateLogin(email: string, password: string) {\n+  if (!email || !password) throw new Error(\"Missing credentials\");"
    },
    {
      operation: { op: 'create', path: 'src/auth/login.test.ts', ... },
      success: true
    }
  ],
  totalOperations: 2,
  successCount: 2,
  failureCount: 0
}
```

### 구현 가이드

```typescript
// ai-backend/tools/repo/patch.ts
import fs from 'fs/promises';
import path from 'path';
import { diffLines } from 'diff';

export async function patchHandler(params: PatchParams): Promise<PatchResult> {
  const { operations, dryRun = false, createBackup = false } = params;
  const results: OperationResult[] = [];

  for (const op of operations) {
    try {
      let result: OperationResult;

      switch (op.op) {
        case 'create':
          result = await handleCreate(op, dryRun);
          break;
        case 'modify':
          result = await handleModify(op, dryRun, createBackup);
          break;
        case 'delete':
          result = await handleDelete(op, dryRun);
          break;
      }

      results.push(result);
    } catch (error) {
      results.push({
        operation: op,
        success: false,
        error: error.message,
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount === operations.length,
    results,
    totalOperations: operations.length,
    successCount,
    failureCount: operations.length - successCount,
  };
}

async function handleModify(
  op: ModifyOperation,
  dryRun: boolean,
  createBackup: boolean
): Promise<OperationResult> {
  const filePath = path.resolve(process.cwd(), op.path);
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;

  // 각 변경 적용
  for (const change of op.changes) {
    if (!content.includes(change.oldText)) {
      throw new Error(`Old text not found: ${change.oldText.substring(0, 50)}...`);
    }
    content = content.replace(change.oldText, change.newText);
  }

  // Diff 생성
  const diff = generateUnifiedDiff(originalContent, content, op.path);

  if (!dryRun) {
    if (createBackup) {
      await fs.writeFile(`${filePath}.backup`, originalContent);
    }
    await fs.writeFile(filePath, content);
  }

  return {
    operation: op,
    success: true,
    diff,
  };
}

function generateUnifiedDiff(oldContent: string, newContent: string, filePath: string): string {
  const diff = diffLines(oldContent, newContent);
  // unified diff 형식으로 변환
  // ... 구현
  return unifiedDiffString;
}
```

---

## 5. repo.run

쉘 명령을 실행합니다 (샌드박스 제한 적용).

### 함수 시그니처

```typescript
repo.run(params: RunParams): Promise<RunResult>

interface RunParams {
  command: string;
  args?: string[];
  cwd?: string;                    // 작업 디렉토리
  env?: Record<string, string>;    // 환경 변수
  timeout?: number;                // ms (기본: 60000)
  shell?: boolean;                 // 쉘로 실행 여부
}

interface RunResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  timedOut: boolean;
}
```

### 예시

```typescript
// npm test 실행
const testResult = await repo.run({
  command: 'npm',
  args: ['test'],
  timeout: 120000
});

// 결과
{
  success: true,
  exitCode: 0,
  stdout: "Test Suites: 5 passed, 5 total\nTests: 25 passed, 25 total\nSnapshots: 0 total\nTime: 5.234s",
  stderr: "",
  executionTime: 5234,
  timedOut: false
}
```

### 구현 가이드

```typescript
// ai-backend/tools/repo/run.ts
import { spawn } from 'child_process';

export async function runHandler(params: RunParams): Promise<RunResult> {
  const {
    command,
    args = [],
    cwd = process.cwd(),
    env = process.env,
    timeout = 60000,
    shell = false,
  } = params;

  const startTime = Date.now();

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      env,
      shell,
      timeout,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      resolve({
        success: exitCode === 0 && !timedOut,
        exitCode: exitCode || -1,
        stdout,
        stderr,
        executionTime: Date.now() - startTime,
        timedOut,
      });
    });

    proc.on('error', (error) => {
      if (error.message.includes('ETIMEDOUT')) {
        timedOut = true;
      }
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr: stderr + '\n' + error.message,
        executionTime: Date.now() - startTime,
        timedOut,
      });
    });
  });
}
```

---

## 6. repo.diagnostics

현재 코드베이스의 빌드/테스트/린트 결과를 통합하여 반환합니다.

### 함수 시그니처

```typescript
repo.diagnostics(params?: DiagnosticsParams): Promise<DiagnosticsResult>

interface DiagnosticsParams {
  sources?: ('build' | 'lint' | 'test')[];  // 기본: 모두
  severity?: ('error' | 'warning' | 'info')[]; // 필터
}

interface DiagnosticsResult {
  success: boolean;
  diagnostics: Diagnostic[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  bySource: {
    build: Diagnostic[];
    lint: Diagnostic[];
    test: Diagnostic[];
  };
}

interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  source: 'build' | 'lint' | 'test';
  code?: string;                   // 에러 코드 (예: TS2322)
}
```

### 예시

```typescript
const diag = await repo.diagnostics();

// 결과
{
  success: true,
  diagnostics: [
    {
      severity: 'error',
      message: "Type 'string' is not assignable to type 'number'",
      file: 'src/utils/math.ts',
      line: 42,
      column: 10,
      source: 'build',
      code: 'TS2322'
    },
    {
      severity: 'warning',
      message: 'Unexpected console statement',
      file: 'src/auth/login.ts',
      line: 15,
      column: 5,
      source: 'lint',
      code: 'no-console'
    }
  ],
  summary: {
    errors: 1,
    warnings: 1,
    info: 0
  },
  bySource: {
    build: [ /* ... */ ],
    lint: [ /* ... */ ],
    test: []
  }
}
```

---

## 7. repo.git

Git 명령을 실행합니다.

### 함수 시그니처

```typescript
repo.git(params: GitParams): Promise<GitResult>

interface GitParams {
  command: string;                 // add, commit, status, diff 등
  args?: string[];
  cwd?: string;
}

interface GitResult {
  success: boolean;
  output: string;
  error?: string;
}
```

### 예시

```typescript
// Git add
await repo.git({
  command: 'add',
  args: ['src/auth/login.ts', 'src/auth/login.test.ts']
});

// Git commit
await repo.git({
  command: 'commit',
  args: ['-m', 'feat: Add input validation for login']
});

// Git status
const status = await repo.git({ command: 'status' });
```

---

## 8. repo.lsp

LSP(Language Server Protocol) 쿼리를 실행합니다.

### 함수 시그니처

```typescript
repo.lsp(params: LSPParams): Promise<LSPResult>

interface LSPParams {
  method: string;                  // textDocument/definition, textDocument/references 등
  textDocument: {
    uri: string;
  };
  position?: {
    line: number;
    character: number;
  };
  context?: any;
}

interface LSPResult {
  success: boolean;
  result: any;                     // LSP 응답
}
```

### 예시

```typescript
// 정의로 이동
const def = await repo.lsp({
  method: 'textDocument/definition',
  textDocument: { uri: 'file:///src/auth/login.ts' },
  position: { line: 42, character: 15 }
});

// 참조 찾기
const refs = await repo.lsp({
  method: 'textDocument/references',
  textDocument: { uri: 'file:///src/auth/login.ts' },
  position: { line: 15, character: 10 },
  context: { includeDeclaration: false }
});
```

---

## 📚 다음 문서

➡️ **[04-SYSTEM-PROMPTS.md](./04-SYSTEM-PROMPTS.md)** - 에이전트 시스템 프롬프트 설계
