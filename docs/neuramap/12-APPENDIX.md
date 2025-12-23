# 12. 부록

## 📖 용어 정의

### A

**Agentic Loop**: Plan → Modify → Verify → Commit의 순환 실행 구조

**AgentState**: LangGraph에서 에이전트의 현재 상태를 저장하는 데이터 구조

**apply_patch**: 구조화된 코드 변경을 적용하는 도구 (OpenAI 제안 포맷)

**AST (Abstract Syntax Tree)**: 코드의 추상 구문 트리

### C

**Code Knowledge Graph**: 코드베이스의 구조적 관계를 그래프로 표현한 것

**Checkpoint**: GCC에서 특정 시점의 에이전트 및 코드 상태 스냅샷

**ctags**: 코드 심볼 인덱싱 도구

### G

**GCC (Git-Context-Controller)**: 에이전트 메모리를 Git처럼 버전 관리하는 시스템

### L

**LangGraph**: LangChain 기반의 상태 기계 워크플로우 프레임워크

**LSP (Language Server Protocol)**: 코드 인텔리전스를 제공하는 표준 프로토콜

### R

**ReAct**: Reason-Act-Observe 패턴의 약자

**repo.***: 코드 저장소와 상호작용하는 도구 API 집합

### S

**SSE (Server-Sent Events)**: 서버에서 클라이언트로 실시간 데이터 스트리밍

**StateGraph**: LangGraph의 상태 기반 실행 그래프

### T

**Tool Calling**: LLM이 외부 도구를 호출하는 능력

**ts-morph**: TypeScript AST 조작 라이브러리

---

## ❓ FAQ

### 일반

**Q: NeuraMap은 Cursor나 Claude Code와 무엇이 다른가요?**

A:
- **멀티 모델 지원**: GPT-4o, Claude, Grok, Gemini 등 4개 이상 모델
- **워크플로우 빌더**: LangGraph 기반 커스터마이징 가능
- **장기 메모리**: GCC 시스템으로 여러 세션에 걸친 프로젝트 추적
- **승인 게이트**: 모든 중요 변경에 명시적 사용자 승인

**Q: 어떤 프로그래밍 언어를 지원하나요?**

A: 현재 TypeScript/JavaScript 중심이지만, LSP 통합으로 다음 언어도 지원 예정:
- Python
- Go
- Rust
- Java

**Q: 오프라인에서도 작동하나요?**

A: 부분적 지원:
- Ollama 등 로컬 LLM 사용 시 코드 생성 가능
- 터미널 실행, 파일 조작은 완전 오프라인
- LSP, Code Graph는 오프라인 작동

### 기술

**Q: 토큰 비용이 너무 많이 들지 않나요?**

A: 최적화 전략:
- 작업별 최적 모델 선택 (예: verify에는 저렴한 Grok)
- 컨텍스트 압축 및 캐싱
- 점진적 그래프 업데이트 (전체 재구축 안함)
- 평균 작업당 비용 목표: $0.05 이하

**Q: 보안이 걱정됩니다. 안전한가요?**

A: 다층 보안:
- **샌드박스**: Docker 격리 실행
- **권한 제한**: 화이트리스트 기반 명령 허용
- **승인 게이트**: 위험한 작업은 항상 사용자 승인 필요
- **감사 로깅**: 모든 작업 기록

**Q: 기존 프로젝트에 적용 가능한가요?**

A: 네, 다음만 필요:
- Git 저장소
- package.json (Node.js 프로젝트)
- TypeScript 설정 (선택)

**Q: 테스트가 없는 프로젝트도 되나요?**

A: 가능하지만 제한적:
- Verify 단계는 빌드/린트만 실행
- 에이전트가 테스트 작성을 제안할 수 있음
- 테스트 작성을 첫 작업으로 권장

### 사용

**Q: 학습 곡선이 가파른가요?**

A: 매우 쉬움:
1. 자연어로 요청 입력
2. 생성된 Plan 검토
3. 승인 버튼 클릭
4. 결과 확인

**Q: 잘못된 코드를 생성하면 어떻게 하나요?**

A: 여러 안전장치:
- 변경 전 Diff 미리보기
- 테스트 실패 시 자동 재시도
- GCC 롤백으로 이전 상태 복원
- Git으로 언제든 되돌리기 가능

**Q: 여러 명이 동시에 사용할 수 있나요?**

A: 권장하지 않음:
- 현재는 단일 사용자 모드
- Git 충돌 가능성
- Phase 4에서 협업 기능 추가 예정

---

## 💡 예제 모음

### 예제 1: 새 기능 추가

**사용자 요청**:
```
사용자 프로필에 아바타 이미지 업로드 기능을 추가해줘.
S3 업로드를 사용하고 썸네일도 자동 생성해야 해.
```

**에이전트 Plan**:
```markdown
## Plan

- [ ] Task 1: AWS S3 SDK 의존성 추가
  - Files: package.json
  - Risk: Low

- [ ] Task 2: 이미지 업로드 유틸리티 작성
  - Files: lib/upload.ts (new)
  - Risk: Medium

- [ ] Task 3: 썸네일 생성 로직 추가
  - Files: lib/thumbnail.ts (new)
  - Risk: Low

- [ ] Task 4: 프로필 API에 업로드 엔드포인트 추가
  - Files: app/api/profile/avatar/route.ts (new)
  - Risk: Medium

- [ ] Task 5: 프론트엔드 업로드 컴포넌트 작성
  - Files: components/ProfileAvatar.tsx
  - Risk: Low

- [ ] Task 6: 통합 테스트 작성
  - Files: tests/profile-avatar.test.ts (new)
  - Risk: Low
```

**실행 결과**:
- 6개 파일 생성/수정
- 테스트 통과
- 커밋: `feat: Add avatar upload with S3 and thumbnails`

### 예제 2: 버그 수정

**사용자 요청**:
```
로그인 실패 시 에러 메시지가 안 나와. 고쳐줘.
```

**에이전트 실행**:
1. **Analyze**:
   ```
   repo.search("login", "error")
   repo.read("src/auth/LoginForm.tsx", 50, 80)
   ```

2. **Diagnose**:
   ```
   Found issue: Error state is not being set in catch block
   ```

3. **Fix**:
   ```diff
   - } catch (error) {
   + } catch (error) {
   +   setError(error.message || "Login failed");
   ```

4. **Verify**:
   ```
   ✅ Build: Passed
   ✅ Lint: Passed
   ✅ Tests: 28/28 passed
   ```

5. **Commit**:
   ```
   fix: Display error message on login failure
   ```

### 예제 3: 리팩토링

**사용자 요청**:
```
auth 모듈이 너무 커. 작은 파일들로 나눠줘.
```

**에이전트 Plan**:
```markdown
## Plan

- [ ] Task 1: 코드 분석 및 분리 전략 수립
  - Files: src/auth/index.ts
  - Risk: Low

- [ ] Task 2: 검증 로직을 별도 파일로 분리
  - Files: src/auth/validation.ts (new), src/auth/index.ts
  - Risk: Medium

- [ ] Task 3: API 호출 로직 분리
  - Files: src/auth/api.ts (new), src/auth/index.ts
  - Risk: Medium

- [ ] Task 4: 타입 정의 분리
  - Files: src/auth/types.ts (new), src/auth/index.ts
  - Risk: Low

- [ ] Task 5: Import 경로 업데이트
  - Files: src/components/LoginForm.tsx, src/pages/login.tsx, ...
  - Risk: High (multiple files)

- [ ] Task 6: 테스트 업데이트 및 검증
  - Files: src/auth/*.test.ts
  - Risk: Medium
```

**실행 결과**:
- 1개 파일 → 4개 파일로 분리
- 12개 import 경로 자동 업데이트
- 모든 테스트 통과
- 코드 복잡도 45% 감소

---

## 🔧 트러블슈팅

### 문제: "Tool execution timeout"

**증상**: repo.run이 타임아웃

**원인**: 테스트 실행 시간 초과

**해결**:
```typescript
// timeout 늘리기
await repo.run({
  command: 'npm test',
  timeout: 300000  // 5분
});
```

### 문제: "LSP server not found"

**증상**: repo.lsp 호출 시 에러

**원인**: TypeScript LSP 서버 미설치

**해결**:
```bash
npm install -g typescript-language-server
```

### 문제: "Patch apply failed: old_text not found"

**증상**: repo.patch에서 기존 텍스트를 찾지 못함

**원인**: 파일이 이미 변경되었거나 정확히 매칭되지 않음

**해결**:
```typescript
// 더 많은 컨텍스트 포함
{
  oldText: "// 이전 라인\nfunction validateLogin(email, password) {\n// 다음 라인",
  newText: "// 이전 라인\nfunction validateLogin(email: string, password: string) {\n// 다음 라인"
}
```

### 문제: "GCC checkpoint corrupted"

**증상**: 체크포인트 로드 실패

**원인**: JSON 파일 손상

**해결**:
```bash
# 백업에서 복구
cp .GCC/checkpoints/checkpoint_041.json.backup .GCC/checkpoints/checkpoint_041.json

# 또는 이전 체크포인트로 롤백
GCC_ROLLBACK("checkpoint_040")
```

---

## 📚 참고 자료

### 논문 및 연구

1. **ReAct: Synergizing Reasoning and Acting in Language Models**
   - https://arxiv.org/abs/2210.03629
   - Reason-Act-Observe 패턴의 이론적 배경

2. **Self-Refine: Iterative Refinement with Self-Feedback**
   - https://arxiv.org/abs/2303.17651
   - 반복적 개선 루프의 효과성

3. **Reflexion: Language Agents with Verbal Reinforcement Learning**
   - https://arxiv.org/abs/2303.11366
   - 에이전트 자가 학습 메커니즘

### 오픈소스 프로젝트

1. **LangChain**: https://github.com/langchain-ai/langchain
2. **LangGraph**: https://github.com/langchain-ai/langgraph
3. **ts-morph**: https://github.com/dsherret/ts-morph
4. **ripgrep**: https://github.com/BurntSushi/ripgrep

### 관련 도구

1. **Cursor**: https://cursor.sh
2. **GitHub Copilot**: https://github.com/features/copilot
3. **Tabnine**: https://www.tabnine.com
4. **Codeium**: https://codeium.com

---

## 🎓 학습 자료

### 초보자

1. **NeuraMap 빠른 시작 가이드** (작성 예정)
2. **5분 만에 첫 작업 완료하기** (비디오 튜토리얼)
3. **자주 하는 실수와 해결 방법**

### 중급자

1. **시스템 프롬프트 커스터마이징**
2. **Code Knowledge Graph 활용하기**
3. **GCC 메모리 관리 베스트 프랙티스**

### 고급자

1. **LangGraph 노드 커스터마이징**
2. **새로운 Tool 추가하기**
3. **멀티 모델 성능 튜닝**

---

## 🔗 추가 리소스

### 커뮤니티

- **Discord**: (링크 추가 예정)
- **GitHub Discussions**: (링크 추가 예정)
- **Stack Overflow Tag**: `neuramap`

### 지원

- **이슈 트래커**: https://github.com/your-org/glowus/issues
- **문서**: https://docs.glowus.com/neural-map
- **이메일**: support@glowus.com

---

## 📝 변경 이력

### v1.0.0 (예정)
- 초기 릴리스
- 기본 Agentic Loop
- Code Knowledge Graph
- GCC 메모리 시스템

### v0.3.0 (예정)
- GCC 메모리 시스템 추가
- 세션 재개 기능

### v0.2.0 (예정)
- Code Knowledge Graph 추가
- LSP 통합

### v0.1.0 (예정)
- Core Agentic Loop
- 기본 Tool API

---

## ✅ 완료!

**축하합니다!** NeuraMap AI Coding Agent의 완전한 설계 문서를 모두 읽으셨습니다.

다음 단계:
1. [11-IMPLEMENTATION-ROADMAP.md](./11-IMPLEMENTATION-ROADMAP.md)에서 구현 시작
2. Phase 1부터 단계적으로 진행
3. 각 Milestone 완료 시 검증

질문이나 피드백은 언제든 환영합니다!

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-12-23
**작성자**: Claude (SuperClaude Framework)
