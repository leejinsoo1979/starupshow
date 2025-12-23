# 🧠 NeuraMap AI Coding Agent - 완전 설계 문서

## 📚 문서 구조

이 설계 문서는 GlowUS 플랫폼의 NeuraMap 앱에 통합할 AI 코딩 에이전트의 완전한 명세서입니다.

### 문서 목록

1. **[01-OVERVIEW.md](./01-OVERVIEW.md)** - 개요 및 철학
   - 프로젝트 목적
   - 핵심 설계 철학
   - 참조 시스템 분석 (Cursor, Claude Code, AntiGravity)

2. **[02-ARCHITECTURE.md](./02-ARCHITECTURE.md)** - 아키텍처
   - 전체 시스템 구조
   - Agentic Loop (Plan → Modify → Verify → Commit)
   - 컴포넌트 다이어그램
   - 데이터 플로우

3. **[03-API-SPECIFICATION.md](./03-API-SPECIFICATION.md)** - API 명세
   - repo.* API 전체 정의
   - Tool Calling 인터페이스
   - 요청/응답 스키마
   - 에러 처리

4. **[04-SYSTEM-PROMPTS.md](./04-SYSTEM-PROMPTS.md)** - 시스템 프롬프트
   - Agent Identity 정의
   - Tool 사용 가이드라인
   - 출력 포맷 규칙
   - 예시 프롬프트

5. **[05-UX-FLOW.md](./05-UX-FLOW.md)** - 사용자 경험
   - 채팅 인터페이스
   - 승인 게이트 워크플로우
   - 실시간 피드백
   - 에러 핸들링 UX

6. **[06-CODE-KNOWLEDGE-GRAPH.md](./06-CODE-KNOWLEDGE-GRAPH.md)** - 코드 지식 그래프
   - 그래프 구조 설계
   - 노드/엣지 타입
   - 인덱싱 전략
   - LSP 통합

7. **[07-MEMORY-MANAGEMENT.md](./07-MEMORY-MANAGEMENT.md)** - 메모리 관리
   - Git-Context-Controller (GCC)
   - plan.md 구조
   - 체크포인트 시스템
   - 세션 간 메모리 공유

8. **[08-GLOWUS-INTEGRATION.md](./08-GLOWUS-INTEGRATION.md)** - GlowUS 통합
   - 기존 인프라 매핑
   - LangGraph 연동
   - Terminal Server 활용
   - Multi-Model 지원

9. **[09-TESTING-VERIFICATION.md](./09-TESTING-VERIFICATION.md)** - 테스트 및 검증
   - 자동 테스트 전략
   - 회귀 테스트
   - 품질 게이트
   - 샌드박스 실행

10. **[10-METRICS-EVALUATION.md](./10-METRICS-EVALUATION.md)** - 평가 지표
    - 성공률/오류율/재시도율
    - 성능 벤치마크
    - 사용자 만족도
    - 개선 루프

11. **[11-IMPLEMENTATION-ROADMAP.md](./11-IMPLEMENTATION-ROADMAP.md)** - 구현 로드맵
    - Phase별 구현 계획
    - 우선순위
    - 리스크 관리
    - 마일스톤

12. **[12-APPENDIX.md](./12-APPENDIX.md)** - 부록
    - 용어 정의
    - 참고 자료
    - FAQ
    - 예제 코드

---

## 🎯 빠른 시작 가이드

### 문서를 처음 읽는 분
1. [01-OVERVIEW.md](./01-OVERVIEW.md) 읽기
2. [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)로 전체 구조 파악
3. [11-IMPLEMENTATION-ROADMAP.md](./11-IMPLEMENTATION-ROADMAP.md)로 구현 계획 확인

### 개발자
1. [03-API-SPECIFICATION.md](./03-API-SPECIFICATION.md)로 API 이해
2. [08-GLOWUS-INTEGRATION.md](./08-GLOWUS-INTEGRATION.md)로 기존 시스템 파악
3. [11-IMPLEMENTATION-ROADMAP.md](./11-IMPLEMENTATION-ROADMAP.md)로 작업 시작

### 프롬프트 엔지니어
1. [04-SYSTEM-PROMPTS.md](./04-SYSTEM-PROMPTS.md) 필독
2. [06-CODE-KNOWLEDGE-GRAPH.md](./06-CODE-KNOWLEDGE-GRAPH.md)로 컨텍스트 이해

### PM/기획자
1. [05-UX-FLOW.md](./05-UX-FLOW.md)로 사용자 경험 파악
2. [10-METRICS-EVALUATION.md](./10-METRICS-EVALUATION.md)로 KPI 확인

---

## 📝 문서 버전

- **버전**: 1.0.0
- **최종 수정일**: 2025-12-23
- **작성자**: Claude (SuperClaude Framework)
- **검토자**: 필요

---

## 🔄 문서 업데이트 이력

### v1.0.0 (2025-12-23)
- 초기 통합 설계 문서 작성
- GlowUS 기존 인프라 분석 통합
- 사용자 제공 설계 문서 + AI 분석 통합

---

## 📞 문의

설계 문서 관련 질문이나 피드백은 프로젝트 이슈 트래커에 등록해주세요.
