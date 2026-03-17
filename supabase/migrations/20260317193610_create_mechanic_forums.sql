/*
  # Create Mechanic Forums System

  ## Overview
  A discussion forum for mechanics and electricians to ask questions, share challenges,
  and help each other. Only users with roles 'mechanic', 'technician', and 'electrician'
  (plus admins) can post — but anyone can read.

  ## New Tables

  ### forum_posts
  - Top-level discussion threads posted by mechanics/electricians/admins
  - id, author_id, title, body, category, tags, view_count, reply_count, is_pinned, is_locked, created_at, updated_at

  ### forum_replies
  - Replies to forum posts, can be nested one level deep (reply to a reply)
  - id, post_id, author_id, parent_reply_id (nullable), body, is_accepted_answer, created_at, updated_at

  ### forum_reactions
  - Upvote/helpful reactions on posts and replies
  - id, user_id, target_id, target_type ('post' | 'reply'), created_at
  - UNIQUE(user_id, target_id, target_type)

  ## Security
  - RLS enabled on all tables
  - Anyone can read posts, replies, and reactions (public forum)
  - Only mechanics, technicians, electricians, and admins can insert posts/replies
  - Authors can update/delete their own content
  - Admins can update/delete any content
*/

CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'hydraulics', 'engine', 'electrical', 'transmission', 'diagnostics', 'tips', 'tools', 'other')),
  tags text[] DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_accepted_answer boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'reply')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id, target_type)
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_target ON forum_reactions(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user ON forum_reactions(user_id);

CREATE POLICY "Anyone can read forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mechanics and electricians can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('mechanic', 'technician', 'electrician', 'admin')
    )
  );

CREATE POLICY "Authors and admins can update posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Authors and admins can delete posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Anyone can read forum replies"
  ON forum_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mechanics and electricians can create replies"
  ON forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('mechanic', 'technician', 'electrician', 'admin')
    )
  );

CREATE POLICY "Authors and admins can update replies"
  ON forum_replies FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Authors and admins can delete replies"
  ON forum_replies FOR DELETE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Anyone can read reactions"
  ON forum_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON forum_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove own reactions"
  ON forum_reactions FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION increment_forum_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_posts SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_forum_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_posts SET reply_count = GREATEST(reply_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_forum_reply_insert ON forum_replies;
CREATE TRIGGER on_forum_reply_insert
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION increment_forum_reply_count();

DROP TRIGGER IF EXISTS on_forum_reply_delete ON forum_replies;
CREATE TRIGGER on_forum_reply_delete
  AFTER DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION decrement_forum_reply_count();
