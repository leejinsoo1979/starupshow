# 11. 구현 로드맵

## 🗺️ Phase별 구현 계획

### Phase 0: 준비 (1주)

**목표**: 개발 환경 구축 및 기초 설정

**작업**:
- [ ] 프로젝트 구조 설정
  - `components/neural-map/` 디렉토리 생성
  - `lib/neural-map/` 유틸리티 설정
  - `ai-backend/agents/neuramap_executor.py` 파일 생성

- [ ] 개발 도구 설정
  - TypeScript 설정
  - ESLint/Prettier 규칙
  - Jest 테스트 환경

- [ ] 문서화
  - API 명세서 최종 검토
  - 시스템 프롬프트 초안 작성

**산출물**:
- 빈 컴포넌트 스켈레톤
- 테스트 환경 구성
- 개발 가이드 문서

---

### Phase 1: Core Engine (4주)

**목표**: 기본 Agentic Loop 구현

#### Week 1: Tool API 구현

**작업**:
- [ ] `repo.search` 구현
  - ripgrep 통합
  - 검색 결과 포맷팅
  - 단위 테스트

- [ ] `repo.read` 구현
  - 파일 읽기 핸들러
  - 범위 지정 읽기
  - 언어 감지

- [ ] `repo.run` 구현
  - Terminal Server 연동
  - 타임아웃 처리
  - 출력 캡처

**검증**:
```bash
npm test -- tools/repo
# 모든 도구 테스트 통과
```

#### Week 2: Plan Node

**작업**:
- [ ] Plan 생성 로직
  - 요청 분석
  - 작업 분해
  - 컨텍스트 수집 (search, read, symbols)

- [ ] `plan.md` 자동 생성
  - 마크다운 포맷팅
  - 작업 체크리스트
  - 위험도 평가

- [ ] PlanCard UI 컴포넌트
  - 계획 표시
  - 승인/거부 버튼
  - 편집 기능

**검증**:
```typescript
const plan = await planNode({
  messages: [{ content: "Add tests for login" }],
  ...
});

expect(plan.tasks).toHaveLength(3);
expect(plan.tasks[0].description).toContain("test");
```

#### Week 3: Modify & Verify Nodes

**작업**:
- [ ] `repo.patch` 구현
  - 다중 파일 수정
  - Diff 생성
  - 백업 생성

- [ ] Modify Node 로직
  - Patch 적용
  - 변경 추적
  - 오류 처리

- [ ] Verify Node 로직
  - Build 실행
  - Lint 실행
  - Test 실행
  - 결과 집계

**검증**:
```bash
# 실제 코드 수정 테스트
npm test -- neuramap/modify
npm test -- neuramap/verify
```

#### Week 4: Commit & Integration

**작업**:
- [ ] `repo.git` 구현
  - Git 명령 실행
  - 커밋 메시지 생성
  - 상태 확인

- [ ] Commit Node 로직
  - 파일 스테이징
  - 커밋 생성
  - GCC 체크포인트

- [ ] LangGraph 통합
  - StateGraph 구성
  - 노드 연결
  - 조건부 분기

**검증**:
```bash
# E2E 테스트
npm run test:e2e -- neural-map
```

**Milestone 1 완료**: 기본 Agentic Loop 작동

---

### Phase 2: Advanced Tools (3주)

**목표**: Code Knowledge Graph 및 고급 도구

#### Week 5: Code Graph 기초

**작업**:
- [ ] ts-morph 통합
  - AST 파싱
  - 심볼 추출
  - 타입 정보

- [ ] 그래프 구조 구현
  - Node/Edge 타입 정의
  - 인메모리 저장소
  - 인덱스 구축

- [ ] `repo.symbols` 구현
  - 심볼 검색
  - 정의 위치
  - 참조 찾기

**검증**:
```typescript
const symbols = await repo.symbols({ name: "validateLogin" });
expect(symbols[0].location.file).toBe("src/auth/login.ts");
```

#### Week 6: LSP 통합

**작업**:
- [ ] Language Server 설정
  - TypeScript LSP 연동
  - 요청/응답 처리

- [ ] `repo.lsp` 구현
  - GoToDefinition
  - FindReferences
  - Hover 정보

- [ ] 그래프 강화
  - LSP 데이터로 보강
  - 타입 정보 추가

**검증**:
```typescript
const refs = await repo.lsp({
  method: "textDocument/references",
  ...
});

expect(refs.length).toBeGreaterThan(0);
```

#### Week 7: 고급 분석

**작업**:
- [ ] 의존성 그래프
  - Import 체인 추적
  - 영향도 분석

- [ ] `repo.diagnostics` 구현
  - 빌드/린트/테스트 결과 통합
  - 에러 분류
  - 심각도 평가

- [ ] 컨텍스트 최적화
  - 관련 파일 필터링
  - 토큰 사용량 최소화

**Milestone 2 완료**: 코드 이해 능력 향상

---

### Phase 3: Memory & Learning (3주)

**목표**: GCC 메모리 시스템 및 학습

#### Week 8: GCC 기초

**작업**:
- [ ] `.GCC/` 구조 구현
  - 디렉토리 생성
  - 파일 포맷 정의

- [ ] `main.md` 관리
  - 로드맵 생성
  - 업데이트 로직

- [ ] Checkpoint 시스템
  - 스냅샷 생성
  - 복원 로직

**검증**:
```typescript
const checkpointId = await GCC_COMMIT("Task completed");
expect(checkpointId).toMatch(/checkpoint_\d+/);

const checkpoint = await loadCheckpoint(checkpointId);
expect(checkpoint.codeState.commit).toBeDefined();
```

#### Week 9: Branch & Merge

**작업**:
- [ ] `GCC_BRANCH` 구현
  - 브랜치 생성
  - 상태 분기

- [ ] `GCC_MERGE` 구현
  - 상태 병합
  - 충돌 해결

- [ ] `GCC_ROLLBACK` 구현
  - 이전 상태 복원
  - Git 체크아웃

**검증**:
```bash
# 실제 브랜칭 시나리오 테스트
npm test -- gcc/branching
```

#### Week 10: 세션 재개

**작업**:
- [ ] 세션 복원
  - 최신 체크포인트 로드
  - 컨텍스트 재구성

- [ ] 학습 메모리
  - 실패 패턴 기록
  - 성공 패턴 저장

- [ ] 팀 공유
  - 체크포인트 공유
  - 동기화 메커니즘

**Milestone 3 완료**: 장기 메모리 시스템

---

### Phase 4: Production Features (4주)

**목표**: 프로덕션 준비 및 최적화

#### Week 11: UI 개선

**작업**:
- [ ] DiffViewer 고도화
  - Monaco Editor 통합
  - Syntax highlighting
  - Side-by-side 뷰

- [ ] ExecutionMonitor 개선
  - 실시간 로그
  - 진행률 표시
  - 에러 하이라이트

- [ ] Analytics Dashboard
  - 메트릭 시각화
  - 성능 그래프

#### Week 12: 성능 최적화

**작업**:
- [ ] 도구 실행 최적화
  - 병렬 실행
  - 캐싱 전략
  - 결과 재사용

- [ ] 컨텍스트 압축
  - 토큰 최소화
  - 중요도 기반 필터링

- [ ] 모델 선택 최적화
  - 작업별 최적 모델
  - 비용 효율화

**목표**:
- Plan: <3초
- Modify: <2초
- Verify: <20초
- 전체: <30초

#### Week 13: 보안 강화

**작업**:
- [ ] 샌드박스 구현
  - Docker 격리
  - 권한 제한
  - 리소스 제한

- [ ] 입력 검증
  - 명령 화이트리스트
  - Path traversal 방지
  - SQL injection 방지

- [ ] 감사 로깅
  - 모든 작업 기록
  - 민감 정보 마스킹

#### Week 14: 배포 준비

**작업**:
- [ ] Electron 패키징
  - Python 서버 임베딩
  - Terminal Server 포함

- [ ] 설치 프로그램
  - macOS .dmg
  - Windows .exe
  - Linux .AppImage

- [ ] 문서 최종화
  - 사용자 가이드
  - API 레퍼런스
  - 트러블슈팅

**Milestone 4 완료**: v1.0 릴리스 준비

---

## 🎯 마일스톤 요약

| Milestone | 기간 | 핵심 기능 | 성공 기준 |
|-----------|------|----------|----------|
| **M0: 준비** | Week 0 | 환경 구축 | 개발 환경 완료 |
| **M1: Core** | Week 1-4 | Agentic Loop | E2E 테스트 통과 |
| **M2: Advanced** | Week 5-7 | Code Graph + LSP | 정확도 >90% |
| **M3: Memory** | Week 8-10 | GCC 시스템 | 세션 재개 성공 |
| **M4: Production** | Week 11-14 | 최적화 + 배포 | 성능 목표 달성 |

---

## 🚧 리스크 관리

### 고위험 영역

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|----------|
| LSP 통합 복잡도 | 높음 | 중간 | 단계적 통합, 폴백 옵션 |
| 성능 목표 미달 | 중간 | 높음 | 조기 벤치마크, 최적화 우선 |
| 보안 취약점 | 중간 | 높음 | 보안 감사, 샌드박스 테스트 |
| 멀티 모델 비용 | 낮음 | 중간 | 비용 모니터링, 한도 설정 |

### 대응 계획

1. **LSP 통합 실패**
   - Plan B: ctags 사용
   - Plan C: 정규식 기반 파싱

2. **성능 목표 미달**
   - 단계별 최적화
   - 병렬 처리 강화
   - 캐싱 확대

3. **보안 문제 발견**
   - 즉시 패치
   - 릴리스 지연 가능
   - 보안 감사 재실시

---

## 📋 체크리스트

### Phase 1 완료 조건
- [ ] 모든 repo.* 도구 작동
- [ ] Plan → Modify → Verify → Commit 루프 성공
- [ ] E2E 테스트 통과
- [ ] 사용자 승인 게이트 작동

### Phase 2 완료 조건
- [ ] Code Graph 구축 성공
- [ ] LSP 정의/참조 찾기 작동
- [ ] 영향도 분석 정확도 >80%
- [ ] repo.diagnostics 통합 완료

### Phase 3 완료 조건
- [ ] GCC 체크포인트 저장/복원
- [ ] 브랜치/병합 작동
- [ ] 세션 재개 성공
- [ ] 팀 공유 기능 검증

### Phase 4 완료 조건
- [ ] 성능 목표 달성
- [ ] 보안 감사 통과
- [ ] Electron 앱 실행
- [ ] 사용자 문서 완료

---

## 📚 다음 문서

➡️ **[12-APPENDIX.md](./12-APPENDIX.md)** - 부록 (용어, FAQ, 예제)
