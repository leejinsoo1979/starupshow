/**
 * chat-files 버킷 설정 수정 스크립트
 * 비디오 타입 추가 및 파일 크기 제한 증가
 *
 * 실행: npx ts-node scripts/fix_chat_storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function fixChatStorage() {
  console.log('🔧 Fixing chat-files bucket...')

  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]

  // 1. Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.error('Failed to list buckets:', listError)
    return
  }

  console.log('Existing buckets:', buckets.map(b => b.id))
  const chatFilesBucket = buckets.find(b => b.id === 'chat-files')

  if (!chatFilesBucket) {
    // Create bucket with default size (50MB on free tier)
    console.log('Creating chat-files bucket...')
    const { error: createError } = await supabase.storage.createBucket('chat-files', {
      public: true,
      fileSizeLimit: 52428800, // 50MB (Supabase free tier limit)
      allowedMimeTypes
    })

    if (createError) {
      console.error('Failed to create bucket:', createError)
      // Try without size limit
      console.log('Trying without explicit size limit...')
      const { error: createError2 } = await supabase.storage.createBucket('chat-files', {
        public: true,
        allowedMimeTypes
      })
      if (createError2) {
        console.error('Still failed:', createError2)
      } else {
        console.log('✅ Bucket created (with default size limit)')
      }
    } else {
      console.log('✅ Bucket created successfully')
    }
  } else {
    // Update bucket
    console.log('Bucket exists, updating settings...')
    console.log('Current settings:', chatFilesBucket)
    const { error: updateError } = await supabase.storage.updateBucket('chat-files', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes
    })

    if (updateError) {
      console.error('Failed to update bucket:', updateError)
      // Try just updating mime types
      console.log('Trying to update just MIME types...')
      const { error: updateError2 } = await supabase.storage.updateBucket('chat-files', {
        public: true,
        allowedMimeTypes
      })
      if (updateError2) {
        console.error('Still failed:', updateError2)
      } else {
        console.log('✅ Bucket MIME types updated')
      }
    } else {
      console.log('✅ Bucket updated successfully')
    }
  }

  // 2. Check shared_viewer_state table
  console.log('\n🔍 Checking shared_viewer_state table...')
  const { error: tableError } = await supabase
    .from('shared_viewer_state')
    .select('id')
    .limit(1)

  if (tableError) {
    console.error('❌ shared_viewer_state table error:', tableError.message)
    console.log('\nTo fix, run this SQL in Supabase Dashboard > SQL Editor:')
    console.log(`
CREATE TABLE IF NOT EXISTS shared_viewer_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('pdf', 'image', 'video')),
  media_url TEXT NOT NULL,
  media_name TEXT NOT NULL,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  playback_time DECIMAL DEFAULT 0,
  duration DECIMAL,
  is_playing BOOLEAN DEFAULT false,
  zoom_level DECIMAL DEFAULT 1.0,
  presenter_id UUID,
  presenter_type TEXT CHECK (presenter_type IN ('user', 'agent')),
  selection JSONB,
  annotations JSONB DEFAULT '[]',
  highlight_regions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_viewer_room ON shared_viewer_state(room_id);
    `)
  } else {
    console.log('✅ shared_viewer_state table exists')
  }

  console.log('\n✅ Done!')
}

fixChatStorage().catch(console.error)
