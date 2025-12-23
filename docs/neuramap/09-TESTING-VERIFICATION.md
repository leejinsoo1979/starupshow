# 09. 테스트 및 검증

## 🧪 테스트 전략

### 1. 단위 테스트 (Unit Tests)

**Tool Handler 테스트**:
```typescript
// ai-backend/tools/repo/search.test.ts
describe('RepoSearchTool', () => {
  it('should find matching files', async () => {
    const result = await searchHandler({
      query: 'validateLogin',
      path: 'src/auth',
    });

    expect(result.success).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].file).toContain('login.ts');
  });

  it('should handle regex patterns', async () => {
    const result = await searchHandler({
      query: 'function.*Login',
      path: 'src',
    });

    expect(result.success).toBe(true);
  });
});
```

### 2. 통합 테스트 (Integration Tests)

**Agentic Loop 테스트**:
```python
# ai-backend/tests/test_neuramap_executor.py
import pytest
from ai_backend.agents.neuramap_executor import neuramap_executor

@pytest.mark.asyncio
async def test_full_workflow():
    """전체 워크플로우 테스트"""
    initial_state = {
        "messages": [HumanMessage(content="Add email validation to login")],
        "context": {},
        "plan": {},
        "execution": {"stage": "idle"},
        "metadata": {},
    }

    # 실행
    result = await neuramap_executor.ainvoke(initial_state)

    # 검증
    assert result["execution"]["stage"] == "commit"
    assert result["execution"]["commitSha"] is not None
    assert "validateLogin" in result["plan"]["files"][0]
```

### 3. E2E 테스트 (End-to-End)

**사용자 시나리오 테스트**:
```typescript
// e2e/neural-map.spec.ts
import { test, expect } from '@playwright/test';

test('complete coding task workflow', async ({ page }) => {
  await page.goto('/dashboard-group/neural-map');

  // 1. 요청 입력
  await page.fill('[data-testid="chat-input"]', 'Add unit tests for login');
  await page.click('[data-testid="send-button"]');

  // 2. Plan 생성 대기
  await expect(page.locator('[data-testid="plan-card"]')).toBeVisible();

  // 3. Plan 승인
  await page.click('[data-testid="approve-plan"]');

  // 4. 실행 완료 대기
  await expect(page.locator('[data-testid="commit-success"]')).toBeVisible({ timeout: 60000 });

  // 5. 결과 검증
  const commitSha = await page.textContent('[data-testid="commit-sha"]');
  expect(commitSha).toMatch(/^[a-f0-9]{7,40}$/);
});
```

---

## ✅ 검증 체크리스트

### Build 검증

```bash
# TypeScript 컴파일
npm run build

# 예상 결과: 0 errors
```

### Lint 검증

```bash
# ESLint
npm run lint

# 예상 결과: 0 warnings, 0 errors
```

### Test 검증

```bash
# Jest 실행
npm test

# 예상 결과:
# Test Suites: X passed, X total
# Tests: Y passed, Y total
# Coverage: >80%
```

### Security 검증

```bash
# npm audit
npm audit

# 예상 결과: 0 vulnerabilities
```

---

## 🔒 안전성 검증

### 1. 샌드박스 테스트

```typescript
describe('Sandbox Security', () => {
  it('should block dangerous commands', async () => {
    const result = await repo.run({
      command: 'rm -rf /',  // 위험한 명령
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('should timeout long-running commands', async () => {
    const result = await repo.run({
      command: 'sleep 120',
      timeout: 5000,
    });

    expect(result.timedOut).toBe(true);
  });
});
```

### 2. 권한 검증

```typescript
describe('Permission Checks', () => {
  it('should require approval for high-risk changes', async () => {
    const plan = await generatePlan('Delete all test files');

    const highRiskTasks = plan.tasks.filter(t => t.estimatedRisk === 'high');
    expect(highRiskTasks.every(t => t.requiredApproval)).toBe(true);
  });
});
```

---

## 📊 성능 벤치마크

### 목표 성능

| 단계 | 목표 시간 | 최대 허용 |
|------|----------|----------|
| Plan | <5초 | 10초 |
| Modify (단일 파일) | <3초 | 8초 |
| Verify (빌드) | <10초 | 30초 |
| Verify (테스트) | <30초 | 120초 |
| Commit | <2초 | 5초 |
| **전체** | **<50초** | **175초** |

### 벤치마크 테스트

```typescript
// benchmarks/neuramap.bench.ts
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  it('plan phase should complete within 5s', async () => {
    const start = performance.now();
    await planNode(mockState);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
  });

  it('full workflow should complete within 50s', async () => {
    const start = performance.now();
    await neuramap_executor.invoke(mockState);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50000);
  });
});
```

---

## 📚 다음 문서

➡️ **[10-METRICS-EVALUATION.md](./10-METRICS-EVALUATION.md)** - 평가 지표 및 모니터링
