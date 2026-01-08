-- Add 'weblink' media type support to shared_viewer_state

-- Drop and recreate the check constraint to include 'weblink'
ALTER TABLE shared_viewer_state
DROP CONSTRAINT IF EXISTS shared_viewer_state_media_type_check;

ALTER TABLE shared_viewer_state
ADD CONSTRAINT shared_viewer_state_media_type_check
CHECK (media_type IN ('pdf', 'image', 'video', 'weblink'));
