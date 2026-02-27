-- Add likes column if it doesn't exist
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Function to safely increment likes
CREATE OR REPLACE FUNCTION increment_confession_likes(conf_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE confessions
  SET likes = likes + 1
  WHERE id = conf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
