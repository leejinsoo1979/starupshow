// 회의록 데이터 수정 및 재요약 스크립트
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

// 메시지 정제 - thinking 태그 등 제거
function cleanMessage(content) {
  let cleaned = content;
  // thinking 블록 제거
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 태그 제거
  cleaned = cleaned.replace(/\[(태그|제안|반박|근거|리스크|질문|결정)\]/g, '');
  cleaned = cleaned.replace(/\((FACT|ASSUMPTION|ESTIMATE|RISK)\)/gi, '');
  // 공백 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
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
  "summary": "전체 회의 요약 (3-5문장으로 상세하게)",
  "decisions": ["결정사항1", "결정사항2", ...],
  "keyPoints": ["주요 논의사항1", "주요 논의사항2", ...]
}

규칙:
- summary는 회의에서 논의된 핵심 내용, 각 참여자의 입장, 최종 결론을 포함
- 실제로 결정된 사항만 decisions에 포함
- 논의만 되고 결정되지 않은 것은 keyPoints에 포함
- 구체적인 숫자나 데이터가 언급되었다면 포함
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
      "task": "구체적인 태스크 설명",
      "assignee": "담당자 이름",
      "deadline": "기한",
      "priority": "high/medium/low"
    }
  ]
}

규칙:
- 회의에서 명시적으로 언급된 다음 단계, 할 일만 추출
- "~하기로 했다", "~해야 한다", "~를 진행하자" 같은 표현에서 태스크 추출
- 담당자가 명시되었으면 포함, 아니면 null
- 구체적이고 실행 가능한 형태로 작성
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
      "mainPoints": ["주요 주장1", "주요 주장2", "주요 주장3"],
      "reasoning": "핵심 근거 요약 (2-3문장)"
    }
  ]
}

규칙:
- 각 에이전트가 실제로 말한 내용 기반
- mainPoints는 해당 에이전트가 강조한 핵심 주장 3개
- reasoning은 그 주장의 근거를 요약
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
다음 회의 내용에서 언급된 리스크와 우려사항을 추출하세요.

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
- "단,", "하지만", "리스크", "우려", "문제" 등의 표현에서 추출
- severity는 비즈니스 영향도 기준
- 대응방안이 언급되었으면 포함
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
    "안건: 구체적인 설명"
  ]
}

규칙:
- 결정되지 않고 보류된 사항
- "추후 논의", "검토 필요", "데이터 확인 후" 같은 표현에서 추출
- 이번 회의 결정사항의 후속 조치
- 최대 5개, 우선순위 순서로
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

async function fixMeetingData() {
  console.log('=== 회의록 데이터 수정 시작 ===\n');

  // 1. 회의록 조회
  const { data: record } = await supabase
    .from('meeting_records')
    .select('*')
    .eq('id', meetingId)
    .single();

  // 2. 채팅방 참여자 정보 조회
  const { data: chatParticipants } = await supabase
    .from('chat_participants')
    .select(`
      id,
      participant_type,
      user_id,
      agent_id,
      users:user_id (id, name, email),
      deployed_agents:agent_id (id, name, persona, job_title)
    `)
    .eq('room_id', roomId);

  console.log('채팅방 참여자:', chatParticipants?.length || 0, '명');

  // 3. 참여자 정보 정리
  const participantsData = [];
  const participantMap = new Map();

  chatParticipants?.forEach(p => {
    if (p.participant_type === 'user' && p.users) {
      const userData = {
        type: 'user',
        id: p.user_id,
        name: p.users.name || '사용자',
        email: p.users.email,
      };
      participantsData.push(userData);
      participantMap.set(p.user_id, userData);
    } else if (p.participant_type === 'agent' && p.deployed_agents) {
      const agentData = {
        type: 'agent',
        id: p.agent_id,
        name: p.deployed_agents.name,
        persona: p.deployed_agents.persona,
        job_title: p.deployed_agents.job_title,
      };
      participantsData.push(agentData);
      participantMap.set(p.agent_id, agentData);
    }
  });

  console.log('정리된 참여자:');
  participantsData.forEach(p => {
    console.log(`  - ${p.name} (${p.type})${p.job_title ? ' - ' + p.job_title : ''}`);
  });

  // 4. 원본 메시지 다시 조회 (sender 정보 포함)
  const { data: originalMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .gte('created_at', record.started_at)
    .lte('created_at', record.ended_at)
    .order('created_at', { ascending: true });

  console.log('\n원본 메시지:', originalMessages?.length || 0, '개');

  // 5. 메시지 정제 및 발신자 매핑
  const cleanedMessages = originalMessages?.map(m => {
    let senderName = '알수없음';
    let senderId = null;

    if (m.sender_type === 'user') {
      const user = participantMap.get(m.sender_user_id);
      senderName = user?.name || '사용자';
      senderId = m.sender_user_id;
    } else if (m.sender_type === 'agent') {
      const agent = participantMap.get(m.sender_agent_id);
      senderName = agent?.name || 'AI';
      senderId = m.sender_agent_id;
    } else if (m.sender_type === 'system') {
      senderName = '시스템';
    }

    return {
      id: m.id,
      content: cleanMessage(m.content),
      sender_type: m.sender_type,
      sender_name: senderName,
      sender_id: senderId,
      created_at: m.created_at,
    };
  }) || [];

  // 시스템 메시지 제외 (회의 시작/종료 알림 등)
  const filteredMessages = cleanedMessages.filter(m =>
    m.sender_type !== 'system' &&
    !m.content.includes('회의가 시작되었습니다') &&
    !m.content.includes('회의를 시작합니다') &&
    !m.content.includes('회의 종료') &&
    !m.content.includes('마무리하세요') &&
    m.content.trim().length > 10
  );

  console.log('정제된 메시지:', filteredMessages.length, '개');

  // 6. meeting_config 조회
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('meeting_config')
    .eq('id', roomId)
    .single();

  const meetingConfig = room?.meeting_config || {};
  const outputs = meetingConfig.outputs || {};
  const topic = record.topic;

  console.log('\n=== AI 요약 재생성 중... ===\n');

  // 7. 요약 생성
  let summary = null;
  let keyPoints = [];
  let decisions = [];
  let actionItems = [];
  let agentOpinions = [];
  let risks = [];
  let nextAgenda = [];

  if (outputs.decisionSummary !== false) {
    console.log('📝 의사결정 요약 생성 중...');
    const result = await generateDecisionSummary(filteredMessages, topic);
    summary = result.summary;
    decisions = result.decisions;
    keyPoints = result.keyPoints;
    console.log('   ✓ 요약 완료');
  }

  if (outputs.actionTasks) {
    console.log('✅ 액션 아이템 생성 중...');
    actionItems = await generateActionTasks(filteredMessages, participantsData);
    console.log('   ✓', actionItems.length, '개 생성');
  }

  if (outputs.agentOpinions) {
    console.log('🤖 에이전트 의견 정리 중...');
    agentOpinions = await generateAgentOpinions(filteredMessages, participantsData);
    console.log('   ✓', agentOpinions.length, '개 생성');
  }

  if (outputs.riskSummary) {
    console.log('⚠️ 리스크 요약 생성 중...');
    risks = await generateRiskSummary(filteredMessages);
    console.log('   ✓', risks.length, '개 생성');
  }

  if (outputs.nextAgenda) {
    console.log('📋 다음 안건 생성 중...');
    nextAgenda = await generateNextAgenda(filteredMessages, topic);
    console.log('   ✓', nextAgenda.length, '개 생성');
  }

  // 8. 회의록 업데이트
  console.log('\n=== 회의록 업데이트 중... ===');

  const { error: updateError } = await supabase
    .from('meeting_records')
    .update({
      participants: participantsData,
      messages: filteredMessages,
      message_count: filteredMessages.length,
      participant_count: participantsData.filter(p => p.type === 'user').length,
      agent_count: participantsData.filter(p => p.type === 'agent').length,
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
    return;
  }

  console.log('✅ 회의록 업데이트 완료!\n');

  // 9. 결과 출력
  console.log('=== 최종 결과 ===\n');

  console.log('📝 요약:');
  console.log(summary);

  console.log('\n📌 주요 논의사항:');
  keyPoints.forEach((p, i) => console.log(`  ${i+1}. ${p}`));

  console.log('\n✅ 결정사항:');
  decisions.forEach((d, i) => console.log(`  ${i+1}. ${d}`));

  console.log('\n📋 액션아이템:');
  actionItems.forEach((a, i) => console.log(`  ${i+1}. ${a.task}${a.assignee ? ' (@' + a.assignee + ')' : ''} [${a.priority}]`));

  console.log('\n🤖 에이전트 의견:');
  agentOpinions.forEach(o => {
    console.log(`  [${o.agentName}] - ${o.position}`);
    o.mainPoints?.forEach(p => console.log(`    • ${p}`));
  });

  console.log('\n⚠️ 리스크:');
  risks.forEach((r, i) => console.log(`  ${i+1}. ${r.risk} [${r.severity}]`));

  console.log('\n📅 다음 안건:');
  nextAgenda.forEach((a, i) => console.log(`  ${i+1}. ${a}`));
}

fixMeetingData();
