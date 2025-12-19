const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const roomId = '508ab8c8-1c65-4e8c-88ff-0976e59ad553';
  const meetingId = 'db0bc78c-9c42-40e2-9670-c2598f7a817c';

  // 1. 채팅방 생성자 찾기
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('created_by')
    .eq('id', roomId)
    .single();

  console.log('채팅방 생성자:', room?.created_by);

  // 2. DEV 유저 또는 첫번째 유저 찾기
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  const userId = room?.created_by || users?.[0]?.id;
  console.log('사용할 user_id:', userId);

  if (!userId) {
    console.log('유저 없음');
    return;
  }

  // 3. 참여자로 추가
  const { error: partError } = await supabase
    .from('chat_participants')
    .insert({
      room_id: roomId,
      user_id: userId,
      participant_type: 'user',
    });

  if (partError) {
    if (partError.code === '23505') {
      console.log('이미 참여자로 등록됨');
    } else {
      console.log('참여자 추가 에러:', partError.message);
    }
  } else {
    console.log('참여자 추가 완료');
  }

  // 4. 회의록 created_by 업데이트
  const { error: updateError } = await supabase
    .from('meeting_records')
    .update({ created_by: userId })
    .eq('id', meetingId);

  if (updateError) console.log('회의록 업데이트 에러:', updateError.message);
  else console.log('회의록 업데이트 완료');

  // 5. 확인
  const { data: check } = await supabase
    .from('chat_participants')
    .select('user_id, participant_type')
    .eq('room_id', roomId)
    .eq('participant_type', 'user');

  console.log('유저 참여자:', check);
}

fix();
