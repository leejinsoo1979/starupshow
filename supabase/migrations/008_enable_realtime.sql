-- Enable Realtime for chat tables

-- chat_messages 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- chat_participants 테이블에 Realtime 활성화 (타이핑 상태용)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- chat_rooms 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
