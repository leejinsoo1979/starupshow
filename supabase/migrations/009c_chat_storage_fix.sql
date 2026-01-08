-- Fix chat-files bucket: add video types and increase size limit
-- Previous migration had missing video types

-- Update bucket with video support and larger size limit
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100MB for videos
  allowed_mime_types = ARRAY[
    -- Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    -- Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
WHERE id = 'chat-files';

-- If bucket doesn't exist, create it with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  104857600, -- 100MB
  ARRAY[
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
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
