// 회의록 AI 요약 재생성 스크립트
const { createClient } = require('@supabase/supabase-js');
const { ChatOpenAI } = require('@langchain/openai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const meetingId = 'db0bc78c-9c42-40e2-9670-c2598f7a817c';
const roomId = '508ab8c8-1c65-4e8c-88ff-0976e59ad553';

function getModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

function formatMessages(messages) {
  return messages.map(m => `[${m.sender_name}]: ${m.content}`).join('\n\n');
}

async function generateDecisionSummary(messages, topic) {
  const model = getModel();
  const conversation = formatMessages(messages);

  const prompt = `당신은 회의록 분석 전문가입니다.
다음 회의 내용을 분석하여 의사결정 요약을 작성하세요.

회의 주제: ${topic}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "summary": "전체 회의 요약 (2-3문장)",
  "decisions": ["결정사항1", "결정사항2", ...],
  "keyPoints": ["주요 논의사항1", "주요 논의사항2", ...]
}

규칙:
- 실제로 결정된 사항만 decisions에 포함
- 논의만 되고 결정되지 않은 것은 keyPoints에 포함
- 한국어로 작성`;

  try {
    const response = await model.invoke(prompt);
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Decision summary error:', error);
  }
  return { summary: '', decisions: [], keyPoints: [] };
}

async function generateActionTasks(messages, participants) {
  const model = getModel();
  const conversation = formatMessages(messages);
  const participantNames = participants.map(p => p.name).join(', ');

  const prompt = `당신은 프로젝트 매니저입니다.
다음 회의 내용에서 실행해야 할 태스크를 추출하세요.

참여자: ${participantNames}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "tasks": [
    {
      "task": "태스크 설명",
      "assignee": "담당자 이름 (명시된 경우만)",
      "deadline": "기한 (명시된 경우만)",
      "priority": "high/medium/low"
    }
  ]
}

규칙:
- 구체적이고 실행 가능한 태스크만 추출
- 담당자가 명시되지 않았으면 assignee는 null
- 기한이 명시되지 않았으면 deadline은 null
- 한국어로 작성`;

  try {
    const response = await model.invoke(prompt);
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.tasks || [];
    }
  } catch (error) {
    console.error('Action tasks error:', error);
  }
  return [];
}

async function generateAgentOpinions(messages, participants) {
  const model = getModel();
  const conversation = formatMessages(messages);

  const agents = participants.filter(p => p.type === 'agent');
  if (agents.length === 0) return [];

  const agentInfo = agents.map(a => `${a.name}${a.job_title ? ` (${a.job_title})` : ''}`).join(', ');

  const prompt = `당신은 회의 분석가입니다.
다음 회의에서 각 AI 에이전트의 의견을 정리하세요.

참여 에이전트: ${agentInfo}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "opinions": [
    {
      "agentName": "에이전트 이름",
      "position": "찬성/반대/중립/조건부찬성",
      "mainPoints": ["주요 주장1", "주요 주장2"],
      "reasoning": "핵심 근거 요약"
    }
  ]
}

규칙:
- 각 에이전트가 실제로 말한 내용만 포함
- 추측하지 말고 발언 내용 기반으로 정리
- 한국어로 작성`;

  try {
    const response = await model.invoke(prompt);
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.opinions || [];
    }
  } catch (error) {
    console.error('Agent opinions error:', error);
  }
  return [];
}

async function generateRiskSummary(messages) {
  const model = getModel();
  const conversation = formatMessages(messages);

  const prompt = `당신은 리스크 분석가입니다.
다음 회의 내용에서 언급된 리스크와 반대 의견을 추출하세요.

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "risks": [
    {
      "risk": "리스크 설명",
      "severity": "high/medium/low",
      "mitigation": "대응방안 (언급된 경우)",
      "raisedBy": "제기한 사람"
    }
  ]
}

규칙:
- 실제 언급된 리스크만 포함
- 한국어로 작성`;

  try {
    const response = await model.invoke(prompt);
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.risks || [];
    }
  } catch (error) {
    console.error('Risk summary error:', error);
  }
  return [];
}

async function generateNextAgenda(messages, topic) {
  const model = getModel();
  const conversation = formatMessages(messages);

  const prompt = `당신은 회의 기획자입니다.
다음 회의 내용을 분석하여 후속 논의가 필요한 안건을 제안하세요.

이번 회의 주제: ${topic}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "nextAgenda": [
    "안건1: 설명",
    "안건2: 설명"
  ]
}

규칙:
- 결정되지 않고 보류된 사항
- 추가 검토가 필요하다고 언급된 사항
- 최대 5개까지
- 한국어로 작성`;

  try {
    const response = await model.invoke(prompt);
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.nextAgenda || [];
    }
  } catch (error) {
    console.error('Next agenda error:', error);
  }
  return [];
}

async function regenerate() {
  console.log('=== 회의록 요약 재생성 시작 ===\n');

  // 1. 회의록 조회
  const { data: record } = await supabase
    .from('meeting_records')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (!record) {
    console.log('회의록을 찾을 수 없습니다.');
    return;
  }

  console.log('회의록:', record.room_name);
  console.log('메시지 수:', record.messages?.length || 0);

  // 2. 채팅방에서 meeting_config 조회
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('meeting_config')
    .eq('id', roomId)
    .single();

  const meetingConfig = room?.meeting_config || {};
  const outputs = meetingConfig.outputs || {};

  console.log('\n설정된 산출물 옵션:');
  console.log('- decisionSummary:', outputs.decisionSummary !== false);
  console.log('- actionTasks:', outputs.actionTasks === true);
  console.log('- agentOpinions:', outputs.agentOpinions === true);
  console.log('- riskSummary:', outputs.riskSummary === true);
  console.log('- nextAgenda:', outputs.nextAgenda === true);

  const messages = record.messages || [];
  const participants = record.participants || [];
  const topic = record.topic;

  if (messages.length === 0) {
    console.log('\n메시지가 없어 요약을 생성할 수 없습니다.');
    return;
  }

  console.log('\n=== AI 요약 생성 중... ===\n');

  // 3. 각 산출물 생성
  let summary = null;
  let keyPoints = [];
  let decisions = [];
  let actionItems = [];
  let agentOpinions = [];
  let risks = [];
  let nextAgenda = [];

  // 의사결정 요약 (기본)
  if (outputs.decisionSummary !== false) {
    console.log('📝 의사결정 요약 생성 중...');
    const result = await generateDecisionSummary(messages, topic);
    summary = result.summary;
    decisions = result.decisions;
    keyPoints = result.keyPoints;
    console.log('   - 요약:', summary?.substring(0, 50) + '...');
    console.log('   - 결정사항:', decisions.length, '개');
    console.log('   - 주요논의:', keyPoints.length, '개');
  }

  // 액션 아이템
  if (outputs.actionTasks) {
    console.log('✅ 액션 아이템 생성 중...');
    actionItems = await generateActionTasks(messages, participants);
    console.log('   - 태스크:', actionItems.length, '개');
  }

  // 에이전트 의견
  if (outputs.agentOpinions) {
    console.log('🤖 에이전트 의견 정리 중...');
    agentOpinions = await generateAgentOpinions(messages, participants);
    console.log('   - 의견:', agentOpinions.length, '개');
  }

  // 리스크 요약
  if (outputs.riskSummary) {
    console.log('⚠️ 리스크 요약 생성 중...');
    risks = await generateRiskSummary(messages);
    console.log('   - 리스크:', risks.length, '개');
  }

  // 다음 안건
  if (outputs.nextAgenda) {
    console.log('📋 다음 안건 생성 중...');
    nextAgenda = await generateNextAgenda(messages, topic);
    console.log('   - 안건:', nextAgenda.length, '개');
  }

  // 4. 회의록 업데이트
  console.log('\n=== 회의록 업데이트 중... ===');

  const { error: updateError } = await supabase
    .from('meeting_records')
    .update({
      meeting_config: meetingConfig,
      summary: summary,
      key_points: keyPoints,
      decisions: decisions,
      action_items: actionItems,
      agent_opinions: agentOpinions,
      risk_register: risks,
      next_agenda: nextAgenda,
    })
    .eq('id', meetingId);

  if (updateError) {
    console.log('❌ 업데이트 실패:', updateError.message);
  } else {
    console.log('✅ 회의록 업데이트 완료!');
    console.log('\n=== 최종 결과 ===');
    console.log('- 요약:', summary ? '생성됨' : '없음');
    console.log('- 주요논의:', keyPoints.length, '개');
    console.log('- 결정사항:', decisions.length, '개');
    console.log('- 액션아이템:', actionItems.length, '개');
    console.log('- 에이전트의견:', agentOpinions.length, '개');
    console.log('- 리스크:', risks.length, '개');
    console.log('- 다음안건:', nextAgenda.length, '개');
  }
}

regenerate();
