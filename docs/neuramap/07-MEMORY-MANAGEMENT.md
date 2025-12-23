# 07. 메모리 관리

## 🧠 Git-Context-Controller (GCC)

GCC는 에이전트의 메모리를 Git처럼 버전 관리하여 장기 프로젝트를 추적합니다.

---

## 📁 GCC 디렉토리 구조

```
.GCC/
├── main.md                    # 전체 로드맵
├── checkpoints/
│   ├── checkpoint_001.json    # 스냅샷
│   ├── checkpoint_002.json
│   └── ...
├── branches/
│   ├── main/
│   │   └── state.json
│   ├── feature-auth/
│   │   └── state.json
│   └── ...
├── logs/
│   ├── execution_001.log
│   ├── execution_002.log
│   └── ...
└── config.json                # GCC 설정
```

---

## 📝 main.md 구조

```markdown
# Project Roadmap

## Current Status
- **Phase**: Implementation
- **Current Task**: Add unit tests for login
- **Branch**: main
- **Last Checkpoint**: checkpoint_042
- **Last Updated**: 2025-12-23 14:30:00

## Goals
1. Implement authentication system
2. Add comprehensive test coverage
3. Optimize performance
4. Deploy to production

## Completed Milestones
- [x] Setup project structure
- [x] Implement basic login flow
- [x] Add input validation
- [ ] Add unit tests (IN PROGRESS)
- [ ] Add integration tests
- [ ] Performance optimization

## Active Tasks
### Task: Add unit tests for login
- **Status**: In Progress
- **Started**: 2025-12-23 14:00:00
- **Files**: src/auth/login.ts, src/auth/login.test.ts
- **Checkpoint**: checkpoint_042

#### Subtasks
- [x] Review existing implementation
- [x] Create test file structure
- [ ] Write test cases for valid inputs
- [ ] Write test cases for invalid inputs
- [ ] Verify coverage

## Learnings & Notes
### 2025-12-23
- Email validation regex: `/^[^@]+@[^@]+\.[^@]+$/`
- Test framework: Jest with ts-jest
- Coverage threshold: 80%

## Decisions Log
### Decision: Use Jest over Mocha
- **Date**: 2025-12-20
- **Reasoning**: Better TypeScript support, wider adoption
- **Alternatives Considered**: Mocha, Vitest

## Blockers
- None currently

## Next Steps
1. Complete unit tests
2. Run full test suite
3. Update documentation
```

---

## 🔖 Checkpoint 구조

```typescript
interface Checkpoint {
  id: string;                    // checkpoint_042
  timestamp: number;
  branch: string;
  message: string;               // "Completed task: Add email validation"

  // 코드베이스 상태
  codeState: {
    commit: string;              // Git commit SHA
    files: FileSnapshot[];
  };

  // 에이전트 상태
  agentState: {
    currentTask: Task | null;
    plan: Plan;
    context: CodeContext;
  };

  // 실행 메타데이터
  metadata: {
    executionTime: number;
    toolsUsed: string[];
    testsRun: number;
    testsPassed: number;
  };
}

interface FileSnapshot {
  path: string;
  hash: string;                  // File content hash
  size: number;
}
```

---

## 🔧 GCC 명령어

### COMMIT

체크포인트 생성:

```typescript
// lib/gcc/commands.ts
export async function GCC_COMMIT(message: string): Promise<string> {
  const checkpointId = `checkpoint_${nextId()}`;

  // 1. 현재 Git 상태 캡처
  const gitCommit = await execCommand('git rev-parse HEAD');

  // 2. 현재 에이전트 상태 저장
  const agentState = captureAgentState();

  // 3. 체크포인트 생성
  const checkpoint: Checkpoint = {
    id: checkpointId,
    timestamp: Date.now(),
    branch: currentBranch,
    message,
    codeState: {
      commit: gitCommit,
      files: await snapshotFiles(),
    },
    agentState,
    metadata: collectMetadata(),
  };

  // 4. 저장
  await fs.writeFile(
    `.GCC/checkpoints/${checkpointId}.json`,
    JSON.stringify(checkpoint, null, 2)
  );

  // 5. main.md 업데이트
  await updateMainMd({ lastCheckpoint: checkpointId });

  return checkpointId;
}
```

### BRANCH

새 브랜치 생성:

```typescript
export async function GCC_BRANCH(branchName: string): Promise<void> {
  // 1. 현재 상태를 새 브랜치로 복사
  const currentState = await loadBranchState(currentBranch);

  // 2. 새 브랜치 디렉토리 생성
  await fs.mkdir(`.GCC/branches/${branchName}`, { recursive: true });

  // 3. 상태 저장
  await fs.writeFile(
    `.GCC/branches/${branchName}/state.json`,
    JSON.stringify(currentState, null, 2)
  );

  // 4. Git 브랜치도 생성
  await execCommand(`git checkout -b ${branchName}`);
}
```

### MERGE

브랜치 병합:

```typescript
export async function GCC_MERGE(sourceBranch: string): Promise<void> {
  // 1. 소스 브랜치 상태 로드
  const sourceState = await loadBranchState(sourceBranch);
  const targetState = await loadBranchState(currentBranch);

  // 2. 상태 병합 (conflict 처리)
  const mergedState = mergeStates(targetState, sourceState);

  // 3. Git 병합
  await execCommand(`git merge ${sourceBranch}`);

  // 4. 병합된 상태 저장
  await saveBranchState(currentBranch, mergedState);

  // 5. Checkpoint 생성
  await GCC_COMMIT(`Merged branch ${sourceBranch}`);
}
```

### ROLLBACK

이전 체크포인트로 되돌리기:

```typescript
export async function GCC_ROLLBACK(checkpointId: string): Promise<void> {
  // 1. 체크포인트 로드
  const checkpoint = await loadCheckpoint(checkpointId);

  // 2. Git으로 코드 복원
  await execCommand(`git checkout ${checkpoint.codeState.commit}`);

  // 3. 에이전트 상태 복원
  await restoreAgentState(checkpoint.agentState);

  // 4. main.md 업데이트
  await updateMainMd({ lastCheckpoint: checkpointId });
}
```

---

## 📋 plan.md 관리

### 자동 생성

```typescript
export async function generatePlanMd(tasks: Task[]): Promise<string> {
  const planContent = `# Execution Plan

## Summary
- **Total Tasks**: ${tasks.length}
- **Estimated Time**: ${estimateTime(tasks)}
- **Risk Level**: ${calculateRiskLevel(tasks)}
- **Files Affected**: ${countAffectedFiles(tasks)}

## Tasks

${tasks.map((task, i) => `
### Task ${i + 1}: ${task.description}
- **Status**: ${task.status}
- **Files**: ${task.files.join(', ')}
- **Risk**: ${task.estimatedRisk}
${task.requiredApproval ? '- **Requires Approval**: Yes' : ''}
${task.startTime ? `- **Started**: ${new Date(task.startTime).toISOString()}` : ''}
${task.endTime ? `- **Completed**: ${new Date(task.endTime).toISOString()}` : ''}
`).join('\n')}

## Progress
${renderProgressBar(tasks)}

${calculateProgress(tasks)}% Complete
`;

  await fs.writeFile('.GCC/plan.md', planContent);
  return planContent;
}
```

### 진행률 추적

```typescript
function renderProgressBar(tasks: Task[]): string {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;

  const bars = '█'.repeat(completed) +
               '▓'.repeat(inProgress) +
               '░'.repeat(total - completed - inProgress);

  return `[${bars}] ${completed}/${total}`;
}
```

---

## 🔄 세션 간 메모리 공유

### 세션 재개

```typescript
export async function resumeSession(sessionId?: string): Promise<AgentState> {
  // 1. 최신 체크포인트 찾기
  const latestCheckpoint = sessionId
    ? await loadCheckpoint(sessionId)
    : await loadLatestCheckpoint();

  // 2. 에이전트 상태 복원
  const agentState = latestCheckpoint.agentState;

  // 3. main.md 로드
  const roadmap = await loadMainMd();

  // 4. 컨텍스트 재구성
  const context = await rebuildContext(agentState.context);

  return {
    ...agentState,
    context,
    metadata: {
      ...agentState.metadata,
      resumedFrom: latestCheckpoint.id,
      resumedAt: Date.now(),
    },
  };
}
```

### 컨텍스트 동기화

```typescript
export async function syncContext(
  oldContext: CodeContext,
  currentCodebase: CodeGraph
): Promise<CodeContext> {
  // 1. 파일 변경 감지
  const changedFiles = await detectChangedFiles(oldContext.files);

  // 2. 변경된 파일 재로드
  for (const file of changedFiles) {
    const newContent = await fs.readFile(file, 'utf-8');
    oldContext.files = oldContext.files.map(f =>
      f.path === file ? { ...f, content: newContent } : f
    );
  }

  // 3. 심볼 인덱스 업데이트
  oldContext.symbols = currentCodebase.index.findByFile(changedFiles);

  return oldContext;
}
```

---

## 💾 영속성 전략

### 로컬 저장소

- **.GCC/** 폴더는 Git에 커밋
- 각 개발자가 독립적인 GCC 상태 유지
- `.gitignore`에서 `.GCC/logs/` 제외 가능

### 팀 공유

```typescript
// 팀원 간 체크포인트 공유
export async function shareCheckpoint(checkpointId: string): Promise<string> {
  const checkpoint = await loadCheckpoint(checkpointId);

  // 1. 체크포인트를 Git에 커밋
  await execCommand(`git add .GCC/checkpoints/${checkpointId}.json`);
  await execCommand(`git commit -m "Share checkpoint: ${checkpoint.message}"`);
  await execCommand('git push');

  return checkpoint.codeState.commit; // Git SHA
}

// 팀원이 체크포인트 가져오기
export async function fetchCheckpoint(gitSha: string): Promise<Checkpoint> {
  await execCommand('git pull');

  // Git SHA로 체크포인트 찾기
  const checkpoints = await listCheckpoints();
  return checkpoints.find(c => c.codeState.commit === gitSha);
}
```

---

## 📊 메모리 사용량 관리

### 체크포인트 압축

```typescript
export async function compressOldCheckpoints(): Promise<void> {
  const checkpoints = await listCheckpoints();
  const oldCheckpoints = checkpoints.filter(c =>
    Date.now() - c.timestamp > 7 * 24 * 60 * 60 * 1000 // 7일 이상
  );

  for (const cp of oldCheckpoints) {
    // 상세 정보 제거, 요약만 유지
    const compressed = {
      id: cp.id,
      timestamp: cp.timestamp,
      message: cp.message,
      commit: cp.codeState.commit,
    };

    await fs.writeFile(
      `.GCC/checkpoints/${cp.id}.json`,
      JSON.stringify(compressed, null, 2)
    );
  }
}
```

### 로그 로테이션

```typescript
export async function rotateLogs(): Promise<void> {
  const logs = await fs.readdir('.GCC/logs');
  const MAX_LOGS = 100;

  if (logs.length > MAX_LOGS) {
    const sortedLogs = logs.sort();
    const toDelete = sortedLogs.slice(0, logs.length - MAX_LOGS);

    for (const log of toDelete) {
      await fs.unlink(`.GCC/logs/${log}`);
    }
  }
}
```

---

## 📚 다음 문서

➡️ **[08-GLOWUS-INTEGRATION.md](./08-GLOWUS-INTEGRATION.md)** - GlowUS 기존 인프라 통합
