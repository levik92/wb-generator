-- Add tutorial tracking to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN profiles.login_count IS 'Tracks number of logins for tutorial popup display';
