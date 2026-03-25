/*
  # Mechanic Competition, Streaks & Engagement Notification System

  ## Overview
  Adds a full gamification and engagement system for mechanics including:
  - Daily login streaks
  - Weekly leaderboard based on jobs completed
  - Reward points system
  - Engagement event tracking (for smart notification triggers)

  ## New Tables
  - `mechanic_streaks` — tracks daily login streaks per mechanic
  - `mechanic_rewards` — cumulative reward points and level badges
  - `mechanic_leaderboard_entries` — weekly snapshot entries for ranking
  - `engagement_events` — tracks user engagement actions for smart notification logic

  ## Security
  - RLS enabled on all tables
  - Mechanics can only read/write their own records
  - Leaderboard entries readable by all authenticated users (competitive element)

  ## Notes
  1. Streak is incremented by a function called on login/dashboard visit
  2. Reward points: 10pts per job, 5pts per review, 2pts per login day
  3. Leaderboard resets weekly (tracked via week_start column)
  4. engagement_events used by edge function to determine when to send nudge notifications
*/

-- Daily login streak tracking
CREATE TABLE IF NOT EXISTS mechanic_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date DEFAULT NULL,
  total_active_days integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (mechanic_id)
);

ALTER TABLE mechanic_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view own streak"
  ON mechanic_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can insert own streak"
  ON mechanic_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can update own streak"
  ON mechanic_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = mechanic_id)
  WITH CHECK (auth.uid() = mechanic_id);

CREATE INDEX IF NOT EXISTS idx_mechanic_streaks_mechanic_id ON mechanic_streaks(mechanic_id);

-- Reward points and level
CREATE TABLE IF NOT EXISTS mechanic_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  weekly_points integer NOT NULL DEFAULT 0,
  monthly_points integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'rookie',
  jobs_completed integer NOT NULL DEFAULT 0,
  reviews_received integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (mechanic_id)
);

ALTER TABLE mechanic_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanics can view own rewards"
  ON mechanic_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can insert own rewards"
  ON mechanic_rewards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can update own rewards"
  ON mechanic_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = mechanic_id)
  WITH CHECK (auth.uid() = mechanic_id);

-- Allow all authenticated users to read leaderboard data
CREATE POLICY "All authenticated can read rewards for leaderboard"
  ON mechanic_rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_mechanic_rewards_mechanic_id ON mechanic_rewards(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_rewards_weekly_points ON mechanic_rewards(weekly_points DESC);

-- Weekly leaderboard entries
CREATE TABLE IF NOT EXISTS mechanic_leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  jobs_completed integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  rank integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (mechanic_id, week_start)
);

ALTER TABLE mechanic_leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view leaderboard"
  ON mechanic_leaderboard_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mechanics can insert own leaderboard entries"
  ON mechanic_leaderboard_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can update own leaderboard entries"
  ON mechanic_leaderboard_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = mechanic_id)
  WITH CHECK (auth.uid() = mechanic_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_start ON mechanic_leaderboard_entries(week_start, points_earned DESC);

-- Engagement events for smart notification triggers
CREATE TABLE IF NOT EXISTS engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own engagement events"
  ON engagement_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement events"
  ON engagement_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id ON engagement_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events(event_type, created_at DESC);

-- Function to upsert daily streak on login
CREATE OR REPLACE FUNCTION update_mechanic_streak(p_mechanic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_total_days integer;
  v_new_streak integer;
  v_is_new_day boolean := false;
BEGIN
  SELECT last_active_date, current_streak, longest_streak, total_active_days
  INTO v_last_date, v_current_streak, v_longest_streak, v_total_days
  FROM mechanic_streaks
  WHERE mechanic_id = p_mechanic_id;

  IF NOT FOUND THEN
    INSERT INTO mechanic_streaks (mechanic_id, current_streak, longest_streak, last_active_date, total_active_days)
    VALUES (p_mechanic_id, 1, 1, v_today, 1);
    v_is_new_day := true;
    v_new_streak := 1;
  ELSIF v_last_date = v_today THEN
    v_new_streak := v_current_streak;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
    v_is_new_day := true;
    UPDATE mechanic_streaks SET
      current_streak = v_new_streak,
      longest_streak = GREATEST(v_longest_streak, v_new_streak),
      last_active_date = v_today,
      total_active_days = v_total_days + 1,
      updated_at = now()
    WHERE mechanic_id = p_mechanic_id;
  ELSE
    v_new_streak := 1;
    v_is_new_day := true;
    UPDATE mechanic_streaks SET
      current_streak = 1,
      last_active_date = v_today,
      total_active_days = v_total_days + 1,
      updated_at = now()
    WHERE mechanic_id = p_mechanic_id;
  END IF;

  RETURN jsonb_build_object('streak', v_new_streak, 'is_new_day', v_is_new_day);
END;
$$;

-- Function to add reward points
CREATE OR REPLACE FUNCTION add_mechanic_reward_points(p_mechanic_id uuid, p_points integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_level text;
BEGIN
  INSERT INTO mechanic_rewards (mechanic_id, total_points, weekly_points, monthly_points)
  VALUES (p_mechanic_id, p_points, p_points, p_points)
  ON CONFLICT (mechanic_id) DO UPDATE SET
    total_points = mechanic_rewards.total_points + p_points,
    weekly_points = mechanic_rewards.weekly_points + p_points,
    monthly_points = mechanic_rewards.monthly_points + p_points,
    updated_at = now();

  SELECT total_points INTO v_total FROM mechanic_rewards WHERE mechanic_id = p_mechanic_id;

  IF v_total >= 1000 THEN v_level := 'master';
  ELSIF v_total >= 500 THEN v_level := 'expert';
  ELSIF v_total >= 200 THEN v_level := 'pro';
  ELSIF v_total >= 50 THEN v_level := 'skilled';
  ELSE v_level := 'rookie';
  END IF;

  UPDATE mechanic_rewards SET level = v_level WHERE mechanic_id = p_mechanic_id;
END;
$$;
