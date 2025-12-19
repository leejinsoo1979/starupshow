// 최근 회의 데이터 복구 스크립트
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recoverMeeting() {
  // 1. 최근 메시지가 있는 채팅방 찾기
  const { data: recentMessages, error: msgError } = await supabase
    .from('chat_messages')
    .select('room_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (msgError || !recentMessages?.length) {
    console.log('최근 메시지 없음:', msgError?.message);
    return;
  }

  const roomId = recentMessages[0].room_id;
  console.log('최근 활동 채팅방:', roomId);

  // 2. 채팅방 정보
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  console.log('채팅방 정보:', {
    name: room?.name,
    meeting_topic: room?.meeting_topic,
    is_meeting_active: room?.is_meeting_active,
    meeting_started_at: room?.meeting_started_at,
  });

  // 3. 최근 1시간 메시지 조회
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: true });

  console.log(`최근 1시간 메시지 수: ${messages?.length || 0}`);

  if (!messages?.length) {
    console.log('복구할 메시지가 없습니다.');
    return;
  }

  // 4. 참여자 정보
  const { data: participants } = await supabase
    .from('chat_participants')
    .select(`
      id, participant_type, user_id, agent_id,
      users:user_id (id, name, email),
      deployed_agents:agent_id (id, name, persona, job_title)
    `)
    .eq('room_id', roomId);

  // 5. 회의록 이미 있는지 확인
  const { data: existingRecords } = await supabase
    .from('meeting_records')
    .select('id, created_at, topic')
    .eq('room_id', roomId)
    .gte('created_at', oneHourAgo);

  if (existingRecords?.length) {
    console.log('이미 회의록 존재:', existingRecords);
    return;
  }

  // 6. 회의록 생성
  const userParticipants = participants?.filter(p => p.participant_type === 'user') || [];
  const agentParticipants = participants?.filter(p => p.participant_type === 'agent') || [];

  const participantsData = [
    ...userParticipants.map(p => ({
      type: 'user',
      id: p.user_id,
      name: p.users?.name || '사용자',
    })),
    ...agentParticipants.map(p => ({
      type: 'agent',
      id: p.agent_id,
      name: p.deployed_agents?.name || 'AI',
    })),
  ];

  const messagesData = messages.map(m => {
    const sender = m.sender_type === 'user'
      ? participantsData.find(p => p.type === 'user' && p.id === m.sender_user_id)
      : participantsData.find(p => p.type === 'agent' && p.id === m.sender_agent_id);
    return {
      id: m.id,
      content: m.content,
      sender_type: m.sender_type,
      sender_name: sender?.name || '알수없음',
      sender_id: m.sender_type === 'user' ? m.sender_user_id : m.sender_agent_id,
      created_at: m.created_at,
    };
  });

  const startedAt = messages[0].created_at;
  const endedAt = messages[messages.length - 1].created_at;
  const durationMinutes = Math.round((new Date(endedAt) - new Date(startedAt)) / 60000);

  const { data: record, error: insertError } = await supabase
    .from('meeting_records')
    .insert({
      room_id: roomId,
      room_name: room?.name || '채팅방',
      topic: room?.meeting_topic || '회의',
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      participant_count: userParticipants.length,
      agent_count: agentParticipants.length,
      message_count: messages.length,
      messages: messagesData,
      participants: participantsData,
      created_by: userParticipants[0]?.user_id,
    })
    .select()
    .single();

  if (insertError) {
    console.error('회의록 생성 실패:', insertError);
  } else {
    console.log('✅ 회의록 복구 완료:', record.id);
  }
}

recoverMeeting();
