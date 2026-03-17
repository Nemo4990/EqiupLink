/*
  # Add forum view count increment function

  Simple helper to safely increment a forum post's view_count without exposing
  direct update permission to all authenticated users.
*/

CREATE OR REPLACE FUNCTION increment_forum_view_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE forum_posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
