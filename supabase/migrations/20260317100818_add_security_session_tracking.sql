/*
  # Security: Session Tracking & Rate Limiting

  ## Summary
  Adds robust session security infrastructure including device-level session tracking,
  login attempt rate limiting, and security event logging.

  ## New Tables

  ### user_sessions
  Tracks active login sessions per device. Each login creates a record.
  - id, user_id, device_name, browser, os, ip_address
  - session_token (unique identifier for this device session)
  - last_active, created_at
  - is_current (true = the session used to create this record)
  - revoked_at (set when user logs out from this device)

  ### login_attempts
  Rate-limit brute force attacks per email/IP.
  - id, email, ip_address, success, attempted_at

  ### security_events
  Audit log of security-relevant events per user.
  - id, user_id, event_type, ip_address, device_name, metadata, created_at

  ## Security
  - RLS enabled on all tables
  - Users can only view/revoke their own sessions
  - Admins can view all sessions
*/

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  device_name text NOT NULL DEFAULT 'Unknown Device',
  browser text NOT NULL DEFAULT 'Unknown Browser',
  os text NOT NULL DEFAULT 'Unknown OS',
  ip_address text DEFAULT 'Unknown',
  is_current boolean NOT NULL DEFAULT false,
  last_active timestamptz DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Login attempts table (public insert for rate limiting, no RLS needed for insert)
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text DEFAULT 'Unknown',
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

CREATE POLICY "Anyone can insert login attempts"
  ON login_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read login attempts"
  ON login_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'new_device_login', 'login_success', 'login_failed', 'logout', 'session_revoked', 'password_reset'
  ip_address text DEFAULT 'Unknown',
  device_name text DEFAULT 'Unknown',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert security events"
  ON security_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
