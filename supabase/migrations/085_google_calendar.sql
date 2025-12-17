-- Google Calendar Integration
-- Store OAuth tokens and calendar sync settings

-- Google Calendar connections table
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,

  -- Google account info
  google_email TEXT NOT NULL,
  google_account_id TEXT,

  -- Sync settings
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  -- Selected calendars to sync (JSON array of calendar IDs)
  selected_calendars JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per user
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_google_calendar_user ON google_calendar_connections(user_id);
CREATE INDEX idx_google_calendar_active ON google_calendar_connections(is_active) WHERE is_active = true;

-- Google Calendar events cache (for faster local queries)
CREATE TABLE IF NOT EXISTS google_calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES google_calendar_connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Google event data
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  timezone TEXT,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,

  -- Status
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled

  -- Attendees (JSON array)
  attendees JSONB DEFAULT '[]'::jsonb,

  -- Meeting link
  meeting_url TEXT,

  -- Color
  color TEXT DEFAULT 'blue',

  -- Metadata
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for Google event
  UNIQUE(connection_id, google_event_id)
);

-- Indexes for event queries
CREATE INDEX idx_gcal_events_user ON google_calendar_events_cache(user_id);
CREATE INDEX idx_gcal_events_time ON google_calendar_events_cache(start_time, end_time);
CREATE INDEX idx_gcal_events_google_id ON google_calendar_events_cache(google_event_id);

-- RLS Policies
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events_cache ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own google calendar connections"
  ON google_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar connections"
  ON google_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar connections"
  ON google_calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar connections"
  ON google_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see their own cached events
CREATE POLICY "Users can view own google calendar events"
  ON google_calendar_events_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar events"
  ON google_calendar_events_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar events"
  ON google_calendar_events_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar events"
  ON google_calendar_events_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER google_calendar_connections_updated
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();

CREATE TRIGGER google_calendar_events_updated
  BEFORE UPDATE ON google_calendar_events_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_google_calendar_updated_at();
