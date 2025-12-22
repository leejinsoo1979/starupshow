# Life Stream: The Blueprint (기술 명세서)

## 1. 개요 (Overview)
**Life Stream (The Blueprint)**은 Agentic Coding을 위한 내비게이션 및 시각화 시스템입니다. AI 에이전트가 사용자의 아키텍처 설계를 준수하며 코드를 자율적으로 생성할 수 있도록 구조화된 시간적 맥락(Temporal Context)을 제공합니다.

## 2. 핵심 개념 (Core Concepts)

### 2.1 내비게이션 시스템 (Navigation System)
*   **목적 (Purpose)**: 작업 순서의 모호함을 제거하여 AI 에이전트에게 확정적인 실행 경로를 제공합니다.
*   **메커니즘 (Mechanism)**: 사용자 또는 초기 기획 단계에서 사전 정의된 선형 또는 분기형 작업 파이프라인(Ghost Nodes)입니다.
*   **에이전트 동작 (Agent Behavior)**: 에이전트는 본 시스템을 조회하여 다음 작업(`next_node`)과 현재 컨텍스트(`context_node`)를 파악해야 합니다.

### 2.2 시각적 상태 (Visual States)
작업 노드의 생명주기를 시각적으로 반영합니다:
1.  **Ghost (Pending)**:
    *   **표현**: 와이어프레임 / 빈 박스 / 점선.
    *   **의미**: 계획된 작업, 코드가 존재하지 않음.
    *   **데이터 상태**: `status = 'todo'`
2.  **Glow (Active)**:
    *   **표현**: Cyan 색상의 Glow 효과, 터미널 텍스트 애니메이션.
    *   **의미**: 에이전트가 현재 해당 작업을 실행 중.
    *   **데이터 상태**: `status = 'doing'`
3.  **Solid (Completed)**:
    *   **표현**: 단색 채우기(Solid fill), 명확한 테두리 (Green/Grey).
    *   **의미**: 작업 완료 및 검증됨.
    *   **데이터 상태**: `status = 'done'`

### 2.3 컨텍스트 정렬 (Multi-View Guidance)
정밀한 코드 생성을 위해 에이전트에게 세 가지 컨텍스트 레이어를 노출합니다:
*   **구조적 맥락 (Map)**: 파일/모듈의 계층 구조 및 의존성.
*   **데이터 맥락 (Schema)**: 엔티티 관계 및 데이터 흐름.
*   **시간적 맥락 (Blueprint)**: 실행 순서 및 우선순위 (`What to do next`).

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 실시간 데이터 동기화 (Real-time Sync)
*   뷰(View)는 `neural_nodes` 데이터베이스 테이블을 직접 렌더링해야 합니다.
*   에이전트 API 또는 사용자 UI를 통한 노드 상태 변경은 `LifeStreamView`에 즉시 반영되어야 합니다.
*   **필터 로직**: `pipeline` 태그 또는 특정 타입(`milestone`, `feature`, `release`)을 가진 노드만 스트림에 포함합니다.

### 3.2 계획 버전 관리 (Plan Version Control)
*   **요구사항**: 계획에 대한 모든 변경(노드 추가, 삭제, 순서 변경)은 버전 관리되어야 합니다.
*   **데이터 구조**: `neural_plan_history` 테이블이 계획의 원자적 변경(Atomic Changes)을 추적합니다.
*   **기능**:
    *   이전 계획 버전 조회 기능.
    *   특정 시점으로 계획 되돌리기(Revert) 기능.

### 3.3 동적 시뮬레이션 (Human-in-the-Loop)
*   사용자는 런타임에 계획(Ghost Nodes)을 수정할 수 있습니다.
*   시스템은 계획 변경에 따른 예상 완료 시간 재산출을 지원해야 합니다.

## 4. 데이터 모델 (Data Model)

### 4.1 스키마 확장 (Schema Extensions)
계획 이력 추적을 위한 신규 테이블:

```sql
CREATE TABLE neural_plan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID NOT NULL REFERENCES neural_maps(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    commit_message TEXT,
    changes JSONB NOT NULL, -- structured diff: { added: [], removed: [], moved: [] }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

### 4.2 쿼리 로직 (Query Logic)
Blueprint 뷰를 위한 노드 조회:
```sql
SELECT * FROM neural_nodes 
WHERE map_id = :current_map_id 
AND (type IN ('milestone', 'feature', 'release') OR 'pipeline' = ANY(tags))
ORDER BY position->>'x' ASC, created_at ASC;
```
