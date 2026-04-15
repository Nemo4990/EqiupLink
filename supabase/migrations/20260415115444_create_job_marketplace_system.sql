/*
  # Job Marketplace System with Mechanic Verification

  ## Summary
  Comprehensive job marketplace where owners post jobs, platform admins match with verified mechanics,
  mechanics accept jobs, and owners rate mechanics. Includes full mechanic verification workflow.

  ## New Tables

  ### Mechanic Verification
  - `mechanic_verification_profiles`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `experience_level` (text) - novice, intermediate, advanced, expert
    - `years_experience` (integer) - years of experience
    - `cv_file_url` (text) - uploaded CV file
    - `current_work_status` (text) - employed, self-employed, looking, not-available
    - `educational_status` (text) - high_school, diploma, bachelors, masters, other
    - `willing_travel` (boolean) - willing to travel for jobs
    - `professionalism_score` (integer 0-100) - admin-assigned professionalism rating
    - `specializations` (jsonb array) - list of specializations
    - `additional_info` (text) - any other relevant info
    - `verified_by_admin` (boolean)
    - `verified_at` (timestamp)
    - `verification_notes` (text)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ### Job Postings
  - `job_postings`
    - `id` (uuid, primary key)
    - `owner_id` (uuid, foreign key to auth.users)
    - `title` (text) - job title
    - `description` (text) - detailed job description
    - `location` (text) - job location
    - `latitude` (numeric) - job location latitude
    - `longitude` (numeric) - job location longitude
    - `category` (text) - type of job
    - `estimated_duration` (text) - estimated time to complete
    - `budget_min` (integer) - minimum budget
    - `budget_max` (integer) - maximum budget
    - `urgency` (text) - low, medium, high, urgent
    - `status` (text) - posted, matched, in_progress, completed, cancelled
    - `assigned_mechanic_id` (uuid, foreign key to auth.users) - after admin assigns
    - `admin_id` (uuid, foreign key to auth.users) - admin who made the match
    - `photos` (jsonb array) - job photos
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
    - `completed_at` (timestamp)

  ### Job Matching & Assignment
  - `job_matches`
    - `id` (uuid, primary key)
    - `job_id` (uuid, foreign key to job_postings)
    - `mechanic_id` (uuid, foreign key to auth.users)
    - `admin_id` (uuid, foreign key to auth.users)
    - `match_score` (integer) - score based on experience, location, rating
    - `match_reason` (text) - why this mechanic was chosen
    - `contacted_at` (timestamp) - when admin contacted mechanic
    - `status` (text) - suggested, accepted, declined, completed
    - `created_at` (timestamp)

  ### Job Acceptance
  - `job_acceptances`
    - `id` (uuid, primary key)
    - `job_id` (uuid, foreign key to job_postings)
    - `mechanic_id` (uuid, foreign key to auth.users)
    - `accepted_at` (timestamp)
    - `started_at` (timestamp)
    - `completed_at` (timestamp)
    - `status` (text) - accepted, started, completed, cancelled
    - `created_at` (timestamp)

  ### Job Status Updates
  - `job_status_updates`
    - `id` (uuid, primary key)
    - `job_id` (uuid, foreign key to job_postings)
    - `updated_by` (uuid, foreign key to auth.users)
    - `status` (text) - current job status
    - `message` (text) - status update message
    - `created_at` (timestamp)

  ### Job Ratings & Reviews
  - `job_ratings`
    - `id` (uuid, primary key)
    - `job_id` (uuid, foreign key to job_postings)
    - `mechanic_id` (uuid, foreign key to auth.users)
    - `owner_id` (uuid, foreign key to auth.users)
    - `rating` (integer 1-5)
    - `review_title` (text)
    - `review_text` (text)
    - `professionalism` (integer 1-5)
    - `quality_of_work` (integer 1-5)
    - `punctuality` (integer 1-5)
    - `communication` (integer 1-5)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Owners can only view/post their own jobs
  - Mechanics can only view jobs assigned to them
  - Admins have full visibility for matching
  - Users can only rate jobs they own
*/

CREATE TABLE IF NOT EXISTS public.mechanic_verification_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_level text CHECK (experience_level IN ('novice', 'intermediate', 'advanced', 'expert')),
  years_experience integer DEFAULT 0,
  cv_file_url text,
  current_work_status text CHECK (current_work_status IN ('employed', 'self-employed', 'looking', 'not-available')),
  educational_status text CHECK (educational_status IN ('high_school', 'diploma', 'bachelors', 'masters', 'other')),
  willing_travel boolean DEFAULT false,
  professionalism_score integer DEFAULT 0 CHECK (professionalism_score >= 0 AND professionalism_score <= 100),
  specializations jsonb DEFAULT '[]'::jsonb,
  additional_info text,
  verified_by_admin boolean DEFAULT false,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  category text NOT NULL,
  estimated_duration text,
  budget_min integer,
  budget_max integer,
  urgency text DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'posted' CHECK (status IN ('posted', 'matched', 'in_progress', 'completed', 'cancelled')),
  assigned_mechanic_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  photos jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score integer,
  match_reason text,
  contacted_at timestamptz,
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'declined', 'completed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.job_postings(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'accepted' CHECK (status IN ('accepted', 'started', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title text,
  review_text text,
  professionalism integer CHECK (professionalism >= 1 AND professionalism <= 5),
  quality_of_work integer CHECK (quality_of_work >= 1 AND quality_of_work <= 5),
  punctuality integer CHECK (punctuality >= 1 AND punctuality <= 5),
  communication integer CHECK (communication >= 1 AND communication <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mechanic_verification_user_id ON public.mechanic_verification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_verification_verified ON public.mechanic_verification_profiles(verified_by_admin);
CREATE INDEX IF NOT EXISTS idx_job_postings_owner_id ON public.job_postings(owner_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_mechanic_id ON public.job_postings(assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON public.job_postings(location);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON public.job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_mechanic_id ON public.job_matches(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_status ON public.job_matches(status);
CREATE INDEX IF NOT EXISTS idx_job_acceptances_job_id ON public.job_acceptances(job_id);
CREATE INDEX IF NOT EXISTS idx_job_acceptances_mechanic_id ON public.job_acceptances(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_job_status_updates_job_id ON public.job_status_updates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_ratings_mechanic_id ON public.job_ratings(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_job_ratings_job_id ON public.job_ratings(job_id);

ALTER TABLE public.mechanic_verification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_ratings ENABLE ROW LEVEL SECURITY;

-- Mechanic Verification Policies
CREATE POLICY "Mechanics can view own verification profile"
  ON public.mechanic_verification_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification profiles"
  ON public.mechanic_verification_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Mechanics can update own verification profile"
  ON public.mechanic_verification_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification profiles"
  ON public.mechanic_verification_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert verification profiles"
  ON public.mechanic_verification_profiles FOR INSERT
  WITH CHECK (true);

-- Job Posting Policies
CREATE POLICY "Owners can view own jobs"
  ON public.job_postings FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Assigned mechanics can view their jobs"
  ON public.job_postings FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_mechanic_id);

CREATE POLICY "Admins can view all jobs"
  ON public.job_postings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Owners can create jobs"
  ON public.job_postings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own jobs"
  ON public.job_postings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id AND status IN ('posted', 'matched'))
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can assign mechanics to jobs"
  ON public.job_postings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job Matches Policies
CREATE POLICY "Mechanics can view matches for their jobs"
  ON public.job_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = mechanic_id);

CREATE POLICY "Admins can view all matches"
  ON public.job_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create matches"
  ON public.job_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Mechanics can update own match status"
  ON public.job_matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = mechanic_id)
  WITH CHECK (auth.uid() = mechanic_id);

-- Job Acceptance Policies
CREATE POLICY "Mechanics can view own acceptances"
  ON public.job_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = mechanic_id);

CREATE POLICY "Owners can view acceptances for their jobs"
  ON public.job_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE job_postings.id = job_acceptances.job_id
      AND job_postings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all acceptances"
  ON public.job_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Mechanics can insert acceptances"
  ON public.job_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mechanic_id);

CREATE POLICY "Mechanics can update own acceptances"
  ON public.job_acceptances FOR UPDATE
  TO authenticated
  USING (auth.uid() = mechanic_id)
  WITH CHECK (auth.uid() = mechanic_id);

-- Job Status Updates Policies
CREATE POLICY "Mechanics can view status updates for their jobs"
  ON public.job_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE job_postings.id = job_status_updates.job_id
      AND job_postings.assigned_mechanic_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view status updates for their jobs"
  ON public.job_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE job_postings.id = job_status_updates.job_id
      AND job_postings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all status updates"
  ON public.job_status_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert status updates"
  ON public.job_status_updates FOR INSERT
  WITH CHECK (true);

-- Job Ratings Policies
CREATE POLICY "Owners can view ratings for their jobs"
  ON public.job_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = mechanic_id);

CREATE POLICY "Admins can view all ratings"
  ON public.job_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Owners can create ratings"
  ON public.job_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their ratings"
  ON public.job_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
