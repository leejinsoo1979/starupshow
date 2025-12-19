// 회의록 데이터 최종 수정 스크립트
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

function cleanMessage(content) {
  let cleaned = content;
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/\[(태그|제안|반박|근거|리스크|질문|결정)\]/g, '');
  cleaned = cleaned.replace(/\((FACT|ASSUMPTION|ESTIMATE|RISK)\)/gi, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

function formatMessages(messages) {
  return messages.map(m => `[${m.sender_name}]: ${m.content}`).join('\n\n');
}

async function generateAgentOpinions(messages, participants) {
  const model = getModel();
  const conversation = formatMessages(messages);

  const agents = participants.filter(p => p.type === 'agent');
  if (agents.length === 0) return [];

  const agentInfo = agents.map(a => a.name).join(', ');

  const prompt = `당신은 회의 분석가입니다.
다음 회의에서 각 참여자의 의견을 정리하세요.

참여자: ${agentInfo}

회의 내용:
${conversation}

다음 JSON 형식으로 응답하세요:
{
  "opinions": [
    {
      "agentName": "참여자 이름",
      "position": "찬성/반대/중립/조건부찬성 중 택1",
      "mainPoints": ["주요 주장1", "주요 주장2", "주요 주장3"],
      "reasoning": "핵심 근거 요약 (2-3문장)"
    }
  ]
}

규칙:
- ${agentInfo} 각각에 대해 의견을 정리
- 각 참여자가 실제로 말한 내용 기반으로만 정리
- mainPoints는 해당 참여자가 강조한 핵심 주장 2-3개
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

async function fixMeetingData() {
  console.log('=== 회의록 참여자 및 에이전트 의견 수정 ===\n');

  // 1. 회의록 조회
  const { data: record } = await supabase
    .from('meeting_records')
    .select('*')
    .eq('id', meetingId)
    .single();

  // 2. 채팅방 참여자 조회 (직접)
  const { data: chatParticipants } = await supabase
    .from('chat_participants')
    .select('participant_type, user_id, agent_id')
    .eq('room_id', roomId);

  // 3. 에이전트 정보 조회
  const agentIds = chatParticipants
    ?.filter(p => p.agent_id)
    .map(p => p.agent_id) || [];

  const { data: agents } = await supabase
    .from('deployed_agents')
    .select('id, name, description')
    .in('id', agentIds);

  // 4. 유저 정보 조회
  const userIds = chatParticipants
    ?.filter(p => p.user_id)
    .map(p => p.user_id) || [];

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds);

  // 5. 참여자 데이터 구성
  const participantsData = [];
  const participantMap = new Map();

  users?.forEach(u => {
    const userData = {
      type: 'user',
      id: u.id,
      name: u.name || '사용자',
      email: u.email,
    };
    participantsData.push(userData);
    participantMap.set(u.id, userData);
  });

  agents?.forEach(a => {
    const agentData = {
      type: 'agent',
      id: a.id,
      name: a.name,
      description: a.description,
    };
    participantsData.push(agentData);
    participantMap.set(a.id, agentData);
  });

  console.log('참여자:');
  participantsData.forEach(p => {
    console.log(`  - ${p.name} (${p.type})`);
  });

  // 6. 원본 메시지 다시 조회
  const { data: originalMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .gte('created_at', record.started_at)
    .lte('created_at', record.ended_at)
    .order('created_at', { ascending: true });

  // 7. 메시지 정제 및 발신자 매핑
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

  // 시스템 메시지 제외
  const filteredMessages = cleanedMessages.filter(m =>
    m.sender_type !== 'system' &&
    !m.content.includes('회의가 시작되었습니다') &&
    !m.content.includes('회의를 시작합니다') &&
    !m.content.includes('회의 종료') &&
    !m.content.includes('마무리하세요') &&
    m.content.trim().length > 10
  );

  console.log('\n메시지:', filteredMessages.length, '개');

  // 8. 에이전트 의견 재생성
  console.log('\n🤖 에이전트 의견 재생성 중...');
  const agentOpinions = await generateAgentOpinions(filteredMessages, participantsData);
  console.log('   ✓', agentOpinions.length, '개 생성');

  // 9. 회의록 업데이트
  const { error: updateError } = await supabase
    .from('meeting_records')
    .update({
      participants: participantsData,
      messages: filteredMessages,
      message_count: filteredMessages.length,
      participant_count: participantsData.filter(p => p.type === 'user').length,
      agent_count: participantsData.filter(p => p.type === 'agent').length,
      agent_opinions: agentOpinions,
    })
    .eq('id', meetingId);

  if (updateError) {
    console.log('❌ 업데이트 실패:', updateError.message);
    return;
  }

  console.log('\n✅ 업데이트 완료!\n');

  // 결과 출력
  console.log('=== 에이전트 의견 ===\n');
  agentOpinions.forEach(o => {
    console.log(`【${o.agentName}】 - ${o.position}`);
    console.log('  주요 주장:');
    o.mainPoints?.forEach(p => console.log(`    • ${p}`));
    console.log('  근거:', o.reasoning);
    console.log('');
  });
}

fixMeetingData();
