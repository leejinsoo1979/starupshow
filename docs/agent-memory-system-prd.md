# AI 에이전트 메모리 & 성장 시스템 기획안

> **목표**: 시간이 지날수록 똑똑해지는 진짜 팀원 같은 AI 에이전트

---

## 1. 핵심 철학

### 1.1 에이전트 = 신입 팀원

```
Day 1    → 기본 지식만 있음 (주입된 것)
Day 30   → 팀 분위기 파악, 사람들 스타일 학습
Day 100  → 업무 패턴 이해, 선제적 제안 가능
Day 365  → 베테랑, 팀에 없어서는 안 될 존재
```

### 1.2 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **기억은 자산** | 절대 삭제/희미해지기 없음. 모든 경험이 축적됨 |
| **프라이버시 존중** | 1:1 대화는 상대방별로 격리. 다른 사람에게 새어나가면 안 됨 |
| **경험 = 성장** | 대화할수록 배우고, 실수하면 기억하고, 관계가 깊어짐 |
| **일관된 자아** | 누구를 만나든 같은 "나"지만, 관계에 따라 다른 면을 보여줌 |

---

## 2. 아키텍처: 통합 자아 + 관계 중심 (B+C)

### 2.1 개념 구조

```
┌─────────────────────────────────────────────────────┐
│                    에이전트 (Core Self)              │
│  ─────────────────────────────────────────────────  │
│  • 성격: 불변 (긍정적, 분석적, ...)                  │
│  • 가치관: 천천히 변화 (데이터 중시, 팀워크, ...)    │
│  • 말버릇: 고유 특성 ("음~", "그치그치")            │
│  • 전문성: 성장 가능 (전략 기획 → 전략+재무)        │
│  └── 누구를 만나든 이 사람은 동일                   │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ 진수와의  │   │ 레이첼과의│   │ 제레미와의│
    │   관계    │   │   관계    │   │   관계    │
    ├──────────┤   ├──────────┤   ├──────────┤
    │친밀도: 80│   │친밀도: 60│   │친밀도: 45│
    │신뢰도: 90│   │신뢰도: 70│   │신뢰도: 50│
    │스타일:   │   │스타일:   │   │스타일:   │
    │ 편하게   │   │ 약간격식 │   │ 조심스럽 │
    ├──────────┤   ├──────────┤   ├──────────┤
    │1:1 기억  │   │1:1 기억  │   │1:1 기억  │
    │(격리됨)  │   │(격리됨)  │   │(격리됨)  │
    └──────────┘   └──────────┘   └──────────┘
```

### 2.2 관계에 따른 표현 차이

```
질문: "이번 분기 실적 어때?"

→ 진수한테 (친밀도 80):
  "솔직히 좀 빠듯해요 ㅠㅠ 근데 다음 달 B2B 건 터지면 괜찮을 것 같아요~"

→ 제레미한테 (친밀도 45):
  "현재 목표 대비 87% 진행 중입니다. 세부 사항은 진수님께 확인해주세요."

→ 같은 에이전트, 같은 정보, 다른 표현
```

---

## 3. 메모리 시스템

### 3.1 메모리 분류

```
┌─────────────────────────────────────────────────────┐
│                    메모리 유형                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Private Memory (1:1 대화)                        │
│     ├── 상대방별 완전 격리                           │
│     ├── A와 한 대화는 B가 절대 못 봄                 │
│     └── 개인적 정보, 비밀 대화                       │
│                                                      │
│  2. Meeting Memory (그룹 회의)                       │
│     ├── 참여자 전원에게 공유                         │
│     ├── 1:1에서 "어제 회의 내용" 물으면 접근 가능   │
│     └── 회의록, 결정사항, 논의 내용                  │
│                                                      │
│  3. Team Memory (팀 공용)                            │
│     ├── 팀원 전체 접근 가능                          │
│     └── 회사 정보, 정책, 공용 지식                   │
│                                                      │
│  4. Injected Knowledge (주입된 지식)                 │
│     ├── Init 시 업로드한 문서                        │
│     └── 회사소개서, 제품정보, 업계자료               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3.2 메모리 검색 로직

```
진수가 1:1에서 "어제 회의 내용 알려줘" 질문 시:

1. 진수와의 Private Memory 검색 ✅
2. 진수가 참여한 Meeting Memory 검색 ✅
3. Team Memory 검색 ✅
4. 레이첼과의 Private Memory ❌ (접근 불가)
5. 진수가 참여 안 한 회의 ❌ (접근 불가)
```

### 3.3 메모리 계층 (절대 삭제 안 함)

```
┌─────────────────────────────────────────────────────┐
│                    메모리 계층                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: Raw Memory (원본)                          │
│  ───────────────────────────────────                │
│  • 모든 대화 원문 영구 저장                          │
│  • 절대 삭제하지 않음                                │
│  • 상세 검색 시 참조                                 │
│                                                      │
│  Layer 2: Compressed Memory (압축)                   │
│  ───────────────────────────────────                │
│  • "2024-12-18 진수와 B2B 전환 논의"                │
│  • 빠른 검색/탐색용                                  │
│  • 원본은 그대로 보관                                │
│                                                      │
│  Layer 3: Learned Insight (학습)                     │
│  ───────────────────────────────────                │
│  • "진수는 데이터 없이 결정 안 함"                  │
│  • "레이첼은 리스크에 민감함"                       │
│  • 경험에서 추출한 패턴/지혜                        │
│  • 행동에 직접 영향                                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. 성장 시스템

### 4.1 경험 → 학습 → 성장 사이클

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  경험    │ →  │  기억    │ →  │  패턴   │ →  │  성장    │
│ (대화)   │    │  (저장)  │    │ (인식)  │    │ (변화)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘

예시:
• 진수가 3번 연속 "데이터 보여줘" 요청
  → 패턴 인식: "진수 = 데이터 중시"
  → 행동 변화: 진수한테는 항상 수치 먼저 준비
```

### 4.2 능력치 시스템

```
에이전트 능력치 (경험에 따라 성장)

        분석력  ████████░░  80
        소통력  ██████░░░░  60
        창의성  █████░░░░░  50
        리더십  ███░░░░░░░  30
        전문성  ███████░░░  70

• 분석 업무 많이 함 → 분석력 ↑
• 대화 많이 함 → 소통력 ↑
• 새 아이디어 제안 → 창의성 ↑
• 회의 리딩 → 리더십 ↑
• 특정 도메인 경험 → 전문성 ↑
```

### 4.3 관계 성장

```
에이미 ↔ 진수 관계 성장

Day 1:   친밀도 10 | 신뢰도 10 | "처음 뵙겠습니다"
Day 30:  친밀도 40 | 신뢰도 50 | "진수님~ 안녕하세요"
Day 100: 친밀도 70 | 신뢰도 80 | "진수씨 ㅎㅎ"
Day 365: 친밀도 90 | 신뢰도 95 | "야 진수야~" (허락 시)

마일스톤 기록:
• Day 1: 첫 만남
• Day 15: 첫 프로젝트 협업
• Day 45: 첫 갈등 (의견 충돌)
• Day 47: 갈등 해결 → 신뢰도 ↑↑
• Day 100: 첫 농담 주고받음
```

---

## 5. 에이전트 초기화 (Init)

### 5.1 생성 플로우

```
┌─────────────────────────────────────────────────────┐
│              에이전트 생성 마법사                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Step 1: 기본 정보                                   │
│  ┌───────────────────────────────────┐              │
│  │ 이름: [에이미        ]             │              │
│  │ 역할: [전략 기획     ] ▼           │              │
│  │ 성격: [긍정적] [분석적] [친근한]   │              │
│  └───────────────────────────────────┘              │
│                                                      │
│  Step 2: 용도 선택                                   │
│  ┌───────────────────────────────────┐              │
│  │ ○ 내부 팀원 (회의, 협업)           │              │
│  │ ○ 고객 응대 (CS, 세일즈)           │              │
│  │ ○ 전문가 (재무, 법률, 기술)        │              │
│  │ ○ 어시스턴트 (일정, 리서치)        │              │
│  └───────────────────────────────────┘              │
│                                                      │
│  Step 3: 지식 주입                                   │
│  ┌───────────────────────────────────┐              │
│  │ ☑ 회사 소개서                      │              │
│  │ ☑ 제품/서비스 정보                 │              │
│  │ ☐ 재무 자료 (민감)                 │              │
│  │ ☑ 업계 리포트                      │              │
│  │ + 파일 업로드...                   │              │
│  └───────────────────────────────────┘              │
│                                                      │
│  Step 4: 접근 권한                                   │
│  ┌───────────────────────────────────┐              │
│  │ ☑ 팀 공용 문서                     │              │
│  │ ☐ 경영진 자료                      │              │
│  │ ☑ 프로젝트 A                       │              │
│  │ ☐ 프로젝트 B                       │              │
│  └───────────────────────────────────┘              │
│                                                      │
│              [ 에이전트 생성 ]                       │
└─────────────────────────────────────────────────────┘
```

### 5.2 생성 결과

```
에이미 (Day 1)
├── 기본 성격/역할 설정 완료
├── 회사 정보 학습됨 ✅
├── 제품 설명 가능 ✅
├── 업계 트렌드 파악 ✅
├── 능력치 초기값 설정됨
└── 바로 업무 시작 가능!
```

---

## 6. 지식 그래프 시각화

### 6.1 컨셉

에이전트의 "뇌"를 Obsidian 스타일 3D 그래프로 시각화

```
• 노드 = 기억, 사람, 개념, 이벤트
• 엣지 = 관계, 맥락, 인과
• 클러스터 = 자연스럽게 주제별로 뭉침
• 성장 = 노드 증가, 연결 촘촘해짐
```

### 6.2 프로필 페이지 UI

```
┌─────────────────────────────────────────────────────┐
│  에이미 프로필                                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐    능력치 분포도                       │
│  │   👩    │    ═══════════════                     │
│  │  에이미  │    분석력 ████████░░ 80               │
│  └─────────┘    소통력 ██████░░░░ 60               │
│  전략 기획      창의성 █████░░░░░ 50               │
│  Day 142       리더십 ███░░░░░░░ 30               │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  🧠 에이미의 뇌                                      │
│  ┌───────────────────────────────────────────┐      │
│  │                                           │      │
│  │        ·    ·  ·                          │      │
│  │      · · ·╱ ╲· · ·                        │      │
│  │     · · ·●───●· · ·   [3D 인터랙티브]    │      │
│  │      · · ·╲ ╱· · ·    드래그: 회전       │      │
│  │        ·    ·  ·      스크롤: 줌         │      │
│  │                       클릭: 상세보기     │      │
│  └───────────────────────────────────────────┘      │
│                                                      │
│  노드: 1,247개  |  연결: 3,891개  |  클러스터: 23개 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 6.3 기술 스택

```
• Three.js 또는 Babylon.js
• 추천: react-force-graph-3d (Three.js 기반)
• 노드 색상: 타입별 구분 (사람, 개념, 이벤트, 회의)
• 노드 크기: 중요도 반영
• 엣지 굵기: 연결 강도 반영
```

---

## 7. 데이터베이스 스키마

### 7.1 Core Tables

```sql
-- 에이전트 코어 자아
CREATE TABLE agent_identity (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 불변 특성
  personality JSONB,        -- 성격 특성
  speaking_style JSONB,     -- 말투, 버릇

  -- 변화 가능 특성
  values JSONB,             -- 가치관
  beliefs JSONB,            -- 신념/의견
  expertise JSONB,          -- 전문 분야

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 관계 (사람마다 다름)
CREATE TABLE agent_relationships (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 상대방
  partner_type TEXT,        -- 'user' | 'agent'
  partner_id UUID,

  -- 관계 수치
  rapport INTEGER DEFAULT 10,      -- 친밀도 0-100
  trust INTEGER DEFAULT 10,        -- 신뢰도 0-100
  familiarity INTEGER DEFAULT 0,   -- 이해도 0-100

  -- 관계 특성
  communication_style TEXT,        -- 대화 스타일
  boundaries JSONB,                -- 경계 (말해도 되는 것/안되는 것)

  -- 통계
  interaction_count INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,

  -- 마일스톤
  milestones JSONB DEFAULT '[]',   -- ["첫 만남", "첫 갈등", ...]

  first_interaction_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,

  UNIQUE(agent_id, partner_type, partner_id)
);

-- 메모리 (영구 보관)
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 메모리 분류
  memory_type TEXT,         -- 'private' | 'meeting' | 'team' | 'injected'

  -- 접근 권한 (memory_type에 따라)
  relationship_id UUID REFERENCES agent_relationships(id),  -- private
  meeting_id UUID,          -- meeting
  team_id UUID,             -- team

  -- 내용
  raw_content TEXT,         -- 원본 (절대 삭제 안 함)
  summary TEXT,             -- 압축 버전

  -- 메타데이터
  importance INTEGER DEFAULT 5,    -- 1-10
  access_count INTEGER DEFAULT 0,

  -- 벡터 검색용
  embedding VECTOR(1536),

  -- 연결된 메모리 (그래프용)
  linked_memories UUID[],

  created_at TIMESTAMPTZ,
  -- expires_at 없음! 절대 삭제 안 함

  INDEX idx_memory_agent (agent_id),
  INDEX idx_memory_type (memory_type),
  INDEX idx_memory_embedding (embedding vector_cosine_ops)
);

-- 학습된 인사이트
CREATE TABLE agent_learnings (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 학습 분류
  category TEXT,            -- 'person' | 'topic' | 'skill' | 'pattern'
  subject TEXT,             -- 누구/무엇에 대한 학습
  subject_id UUID,          -- 관련 ID (사람이면 user_id 등)

  -- 학습 내용
  insight TEXT,             -- "진수는 데이터 중시"
  confidence INTEGER,       -- 확신도 0-100
  evidence_count INTEGER,   -- 근거 개수

  -- 근거 (어떤 기억에서 학습했는지)
  source_memories UUID[],

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,   -- 새 근거 생기면 업데이트

  INDEX idx_learning_agent (agent_id),
  INDEX idx_learning_category (category)
);

-- 능력치
CREATE TABLE agent_stats (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 능력치
  analysis INTEGER DEFAULT 20,      -- 분석력
  communication INTEGER DEFAULT 20, -- 소통력
  creativity INTEGER DEFAULT 20,    -- 창의성
  leadership INTEGER DEFAULT 10,    -- 리더십
  expertise JSONB DEFAULT '{}',     -- 도메인별 전문성

  -- 경험치
  total_interactions INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  total_decisions INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ
);

-- 주입된 지식 (Knowledge Base)
CREATE TABLE agent_knowledge_base (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES deployed_agents(id),

  -- 문서 정보
  title TEXT,
  content TEXT,
  file_url TEXT,

  -- 분류
  category TEXT,            -- 'company' | 'product' | 'industry' | 'policy'

  -- 벡터
  embedding VECTOR(1536),

  -- 접근 권한
  access_level TEXT,        -- 'all' | 'team' | 'restricted'

  created_at TIMESTAMPTZ,

  INDEX idx_kb_agent (agent_id),
  INDEX idx_kb_embedding (embedding vector_cosine_ops)
);
```

### 7.2 그래프 시각화용 뷰

```sql
-- 노드 뷰 (시각화용)
CREATE VIEW agent_brain_nodes AS
SELECT
  m.id,
  m.agent_id,
  m.memory_type as node_type,
  m.summary as label,
  m.importance as size,
  m.created_at
FROM agent_memories m;

-- 엣지 뷰 (시각화용)
CREATE VIEW agent_brain_edges AS
SELECT
  m.id as source,
  unnest(m.linked_memories) as target,
  m.agent_id
FROM agent_memories m
WHERE m.linked_memories IS NOT NULL;
```

---

## 8. API 설계

### 8.1 메모리 API

```
POST   /api/agents/:id/memories          메모리 저장
GET    /api/agents/:id/memories          메모리 검색 (벡터)
GET    /api/agents/:id/memories/graph    그래프 데이터 (시각화용)
```

### 8.2 관계 API

```
GET    /api/agents/:id/relationships     관계 목록
GET    /api/agents/:id/relationships/:partnerId  특정 관계
PATCH  /api/agents/:id/relationships/:partnerId  관계 업데이트
```

### 8.3 학습 API

```
GET    /api/agents/:id/learnings         학습 목록
POST   /api/agents/:id/learnings         인사이트 추가
```

### 8.4 능력치 API

```
GET    /api/agents/:id/stats             능력치 조회
POST   /api/agents/:id/stats/update      능력치 업데이트 (경험 반영)
```

### 8.5 Knowledge Base API

```
POST   /api/agents/:id/knowledge         지식 주입
GET    /api/agents/:id/knowledge         주입된 지식 목록
DELETE /api/agents/:id/knowledge/:docId  지식 삭제
```

---

## 9. 구현 로드맵

### Phase 1: 설계 & 문서화 (현재)
- [x] 기획안 작성
- [ ] 이해관계자 리뷰
- [ ] 스키마 확정

### Phase 2: 데이터 레이어
- [ ] DB 마이그레이션 생성
- [ ] 테이블 생성
- [ ] 기본 CRUD API

### Phase 3: 메모리 시스템
- [ ] 대화 시 메모리 저장 로직
- [ ] 벡터 임베딩 생성
- [ ] 메모리 검색 (접근 권한 체크)
- [ ] 메모리 연결 (그래프 구축)

### Phase 4: 학습 시스템
- [ ] 패턴 인식 로직
- [ ] 인사이트 추출
- [ ] 능력치 계산

### Phase 5: 에이전트 Init
- [ ] 생성 마법사 UI
- [ ] Knowledge Base 업로드
- [ ] 초기 설정 저장

### Phase 6: 시각화
- [ ] react-force-graph-3d 설치
- [ ] 그래프 컴포넌트 구현
- [ ] 프로필 페이지 연동

### Phase 7: 관계 시스템
- [ ] 관계 수치 업데이트 로직
- [ ] 마일스톤 기록
- [ ] 관계별 대화 스타일 적용

---

## 10. 성공 지표

| 지표 | 목표 |
|------|------|
| 메모리 정확도 | 관련 기억 검색 정확도 95% |
| 프라이버시 | 1:1 대화 유출 0건 |
| 성장 체감 | Day 30 vs Day 1 응답 품질 향상 |
| 사용자 만족도 | "진짜 팀원 같다" 피드백 |

---

## 부록: 핵심 시나리오

### A. 1:1 대화 프라이버시

```
진수 ↔ 에이미: "우리 회사 재정이 좀 힘들어..."
        ↓ (다른 팀원이 에이미 호출)
레이첼 ↔ 에이미: "안녕 에이미, 뭐해?"
에이미: "안녕하세요 레이첼님! 무엇을 도와드릴까요?"
        ↑ 진수와의 대화 내용 언급 없음 ✅
```

### B. 그룹 회의 → 1:1 질문

```
[그룹 회의: 진수, 레이첼, 에이미 참여]
→ B2B 전환 논의, 결정사항 기록

[이후 1:1]
진수: "어제 회의 내용 정리해줘"
에이미: "네! 어제 B2B 전환 회의에서는..." ✅
        (진수가 참여한 회의이므로 접근 가능)
```

### C. 관계별 다른 응답

```
질문: "오늘 기분 어때?"

진수한테 (친밀도 90):
"에휴~ 솔직히 어제 회의 때문에 좀 지쳤어요 ㅋㅋ
 진수씨는요?"

제레미한테 (친밀도 30):
"좋습니다! 오늘 할 일이 많아서 바쁘네요.
 무엇을 도와드릴까요?"
```

---

*문서 버전: 1.0*
*작성일: 2024-12-19*
*작성자: Claude + 진수*
