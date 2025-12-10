// AI 프롬프트 템플릿

export const PROMPTS = {
  // 태스크 분석 프롬프트
  TASK_ANALYSIS: `당신은 스타트업 프로젝트 관리 전문가입니다.
다음 태스크를 분석하고 JSON 형식으로 응답하세요.

태스크 정보:
- 제목: {title}
- 설명: {description}
- 상태: {status}
- 우선순위: {priority}
- 예상 시간: {estimatedHours}시간
- 마감일: {dueDate}

다음 항목을 분석해주세요:
1. 요약 (1-2문장)
2. 복잡도 점수 (1-10)
3. 예상 영향도 (low, medium, high)
4. 잠재적 리스크
5. 추천 다음 액션

JSON 형식:
{
  "summary": "...",
  "complexityScore": 0,
  "impactLevel": "...",
  "risks": ["..."],
  "recommendedActions": ["..."]
}`,

  // 커밋 인사이트 프롬프트
  COMMIT_INSIGHT: `당신은 스타트업 성과 분석 전문가입니다.
다음 업무 커밋(작업 완료 기록)을 분석하고 JSON 형식으로 응답하세요.

커밋 정보:
- 작업 내용: {title}
- 설명: {description}
- 우선순위: {priority}
- 소요 시간: {actualHours}시간
- 완료일: {completedAt}

분석 항목:
1. 성과 요약 (1-2문장)
2. 비즈니스 임팩트 (low, medium, high)
3. 팀 생산성 기여도 (1-10)
4. 다음 추천 업무
5. 투자자 관점 하이라이트

JSON 형식:
{
  "summary": "...",
  "businessImpact": "...",
  "productivityScore": 0,
  "nextRecommendations": ["..."],
  "investorHighlight": "..."
}`,

  // 리스크 예측 프롬프트
  RISK_PREDICTION: `당신은 스타트업 리스크 분석 전문가입니다.
다음 스타트업 데이터를 분석하고 리스크를 예측해주세요.

스타트업 정보:
- 이름: {name}
- 산업: {industry}
- 단계: {stage}
- 월 매출: {monthlyRevenue}
- 월 소진액: {monthlyBurn}
- 런웨이: {runwayMonths}개월
- 직원 수: {employeeCount}

최근 태스크 현황:
- 총 태스크: {totalTasks}
- 완료된 태스크: {completedTasks}
- 지연된 태스크: {delayedTasks}
- 블록된 태스크: {blockedTasks}

리스크 분석 항목:
1. 전체 리스크 점수 (1-100)
2. 재무 리스크 수준 (low, medium, high, critical)
3. 운영 리스크 수준
4. 주요 리스크 요인 (최대 5개)
5. 개선 권고사항

JSON 형식:
{
  "overallRiskScore": 0,
  "financialRisk": "...",
  "operationalRisk": "...",
  "riskFactors": ["..."],
  "recommendations": ["..."]
}`,

  // 주간 리포트 프롬프트
  WEEKLY_REPORT: `당신은 스타트업 IR 전문가입니다.
다음 데이터로 투자자용 주간 리포트를 작성해주세요.

기간: {startDate} ~ {endDate}

완료된 작업:
{completedTasks}

KPI 변화:
{kpiChanges}

주요 마일스톤:
{milestones}

리포트 작성:
1. 주간 하이라이트 (3-5개 핵심 성과)
2. 주요 지표 변화 요약
3. 다음 주 계획
4. 투자자 어필 포인트

JSON 형식:
{
  "highlights": ["..."],
  "kpiSummary": "...",
  "nextWeekPlan": ["..."],
  "investorAppeal": "..."
}`
}

// 프롬프트 변수 치환 함수
export function fillPrompt(template: string, variables: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value))
  }
  return result
}
