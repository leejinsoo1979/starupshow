# 10. 평가 지표 및 모니터링

## 📊 핵심 성과 지표 (KPI)

### 1. 작업 완료율 (Task Completion Rate)

**정의**: 성공적으로 완료된 작업 / 전체 시도한 작업

**목표**: ≥80%

**측정**:
```typescript
interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  completionRate: number;  // completed / total
}

function calculateCompletionRate(period: string): number {
  const tasks = getTasksForPeriod(period);
  return (tasks.completed / tasks.total) * 100;
}
```

### 2. 테스트 통과율 (Test Pass Rate)

**정의**: 에이전트 생성 코드의 테스트 통과 비율

**목표**: ≥95%

**측정**:
```typescript
interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
}

async function measureTestPassRate(): Promise<TestMetrics> {
  const result = await repo.run({ command: 'npm test' });
  const matches = result.stdout.match(/(\d+) passed.*(\d+) total/);

  return {
    totalTests: parseInt(matches[2]),
    passedTests: parseInt(matches[1]),
    failedTests: parseInt(matches[2]) - parseInt(matches[1]),
    passRate: (parseInt(matches[1]) / parseInt(matches[2])) * 100,
  };
}
```

### 3. 재시도율 (Retry Rate)

**정의**: 실패 후 재시도가 필요한 비율

**목표**: <20%

**측정**:
```typescript
interface RetryMetrics {
  totalExecutions: number;
  retriedExecutions: number;
  retryRate: number;
}

function trackRetries(executionLog: ExecutionLog[]): RetryMetrics {
  const retries = executionLog.filter(log =>
    log.stage === 'verify' && !log.success
  );

  return {
    totalExecutions: executionLog.length,
    retriedExecutions: retries.length,
    retryRate: (retries.length / executionLog.length) * 100,
  };
}
```

### 4. 평균 작업 시간 (Average Task Time)

**정의**: 요청부터 커밋까지 소요 시간

**목표**: <10분

**측정**:
```typescript
interface TimeMetrics {
  avgPlanTime: number;
  avgModifyTime: number;
  avgVerifyTime: number;
  avgCommitTime: number;
  avgTotalTime: number;
}

function calculateAverageTime(tasks: CompletedTask[]): TimeMetrics {
  return {
    avgPlanTime: average(tasks.map(t => t.planDuration)),
    avgModifyTime: average(tasks.map(t => t.modifyDuration)),
    avgVerifyTime: average(tasks.map(t => t.verifyDuration)),
    avgCommitTime: average(tasks.map(t => t.commitDuration)),
    avgTotalTime: average(tasks.map(t => t.totalDuration)),
  };
}
```

---

## 📈 대시보드 설계

### 실시간 모니터링 대시보드

```
┌──────────────────────────────────────────────────────────┐
│  NeuraMap Analytics Dashboard                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐  │
│  │ Completion  │ Test Pass   │ Retry Rate  │ Avg Time │  │
│  │   82.5%     │   96.3%     │    15.2%    │  8.3 min │  │
│  │  ▲ +2.3%    │  ▼ -0.5%    │  ▼ -3.1%    │ ▼ -1.2m  │  │
│  └─────────────┴─────────────┴─────────────┴──────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Tasks Over Time                                  │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │                              ●●●            │   │   │
│  │  │                         ●●●                 │   │   │
│  │  │                    ●●●                      │   │   │
│  │  │               ●●●                           │   │   │
│  │  │          ●●●                                │   │   │
│  │  │     ●●●                                     │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │   Mon  Tue  Wed  Thu  Fri  Sat  Sun              │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌────────────────────┬──────────────────────────────┐   │
│  │  Top Failures      │  Model Performance           │   │
│  │  ┌──────────────┐  │  ┌────────────────────────┐  │   │
│  │  │ 1. Type err  │  │  │ GPT-4o:    92% ████    │  │   │
│  │  │ 2. Lint warn │  │  │ Claude:    88% ███     │  │   │
│  │  │ 3. Test fail │  │  │ Grok:      85% ███     │  │   │
│  │  └──────────────┘  │  │ Gemini:    90% ████    │  │   │
│  │                    │  └────────────────────────┘  │   │
│  └────────────────────┴──────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 구현

```typescript
// components/neural-map/AnalyticsDashboard.tsx
export function AnalyticsDashboard() {
  const { metrics, loading } = useAnalytics();

  return (
    <div className="analytics-dashboard">
      <MetricCards metrics={metrics} />
      <TasksTrendChart data={metrics.tasksOverTime} />
      <FailureBreakdown failures={metrics.topFailures} />
      <ModelPerformance models={metrics.modelStats} />
    </div>
  );
}

// lib/neural-map/analytics.ts
export async function collectMetrics(): Promise<Metrics> {
  const tasks = await db.tasks.findMany({
    where: { createdAt: { gte: startOfWeek(new Date()) } }
  });

  const completionRate = calculateCompletionRate(tasks);
  const testPassRate = await measureTestPassRate();
  const retryRate = trackRetries(tasks);
  const avgTime = calculateAverageTime(tasks.filter(t => t.status === 'completed'));

  return {
    completionRate,
    testPassRate,
    retryRate,
    avgTime,
    tasksOverTime: groupTasksByDay(tasks),
    topFailures: analyzeFailures(tasks),
    modelStats: calculateModelPerformance(tasks),
  };
}
```

---

## 🔍 상세 분석

### 1. 실패 원인 분석

```typescript
interface FailureAnalysis {
  category: 'build' | 'lint' | 'test' | 'timeout' | 'other';
  count: number;
  examples: string[];
  suggestedFix?: string;
}

function analyzeFailures(tasks: Task[]): FailureAnalysis[] {
  const failures = tasks.filter(t => t.status === 'failed');

  const categories = {
    build: [],
    lint: [],
    test: [],
    timeout: [],
    other: [],
  };

  for (const task of failures) {
    const category = categorizeFailure(task.error);
    categories[category].push(task);
  }

  return Object.entries(categories).map(([category, tasks]) => ({
    category: category as any,
    count: tasks.length,
    examples: tasks.slice(0, 3).map(t => t.error),
    suggestedFix: getSuggestedFix(category),
  }));
}
```

### 2. 모델 성능 비교

```typescript
interface ModelPerformance {
  model: string;
  successRate: number;
  avgTime: number;
  tokenUsage: number;
  cost: number;
}

function calculateModelPerformance(tasks: Task[]): ModelPerformance[] {
  const byModel = groupBy(tasks, 'metadata.model');

  return Object.entries(byModel).map(([model, tasks]) => ({
    model,
    successRate: (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100,
    avgTime: average(tasks.map(t => t.totalDuration)),
    tokenUsage: sum(tasks.map(t => t.metadata.tokens)),
    cost: calculateCost(model, tasks),
  }));
}
```

### 3. 사용자 만족도 추적

```typescript
interface UserFeedback {
  taskId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: number;
}

async function trackUserSatisfaction(): Promise<number> {
  const feedback = await db.feedback.findMany();
  return average(feedback.map(f => f.rating));
}
```

---

## 🎯 개선 루프

### 자동 개선 사이클

```typescript
async function automatedImprovementCycle() {
  // 1. 메트릭 수집
  const metrics = await collectMetrics();

  // 2. 문제 영역 식별
  const issues = identifyIssues(metrics);

  // 3. 개선 제안
  const improvements = generateImprovements(issues);

  // 4. A/B 테스트
  for (const improvement of improvements) {
    await runABTest(improvement);
  }

  // 5. 성공적인 개선 적용
  const successful = improvements.filter(i => i.testResult.success);
  await applyImprovements(successful);

  // 6. 보고서 생성
  await generateReport(metrics, improvements);
}

// 매주 실행
schedule.scheduleJob('0 0 * * 0', automatedImprovementCycle);
```

### 문제 영역 식별

```typescript
function identifyIssues(metrics: Metrics): Issue[] {
  const issues: Issue[] = [];

  if (metrics.completionRate < 80) {
    issues.push({
      type: 'low_completion_rate',
      severity: 'high',
      description: `Completion rate is ${metrics.completionRate}%, below target of 80%`,
      suggestedAction: 'Analyze top failure reasons and improve error handling',
    });
  }

  if (metrics.retryRate > 20) {
    issues.push({
      type: 'high_retry_rate',
      severity: 'medium',
      description: `Retry rate is ${metrics.retryRate}%, above target of 20%`,
      suggestedAction: 'Improve initial code generation quality',
    });
  }

  if (metrics.avgTime.avgTotalTime > 600000) { // 10분
    issues.push({
      type: 'slow_execution',
      severity: 'medium',
      description: `Average time is ${metrics.avgTime.avgTotalTime / 1000}s, above target of 600s`,
      suggestedAction: 'Optimize tool execution and reduce context size',
    });
  }

  return issues;
}
```

---

## 📚 다음 문서

➡️ **[11-IMPLEMENTATION-ROADMAP.md](./11-IMPLEMENTATION-ROADMAP.md)** - 구현 로드맵 및 마일스톤
