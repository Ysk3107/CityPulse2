-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'official'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing users to have citizen role by default
UPDATE profiles SET role = 'citizen' WHERE role IS NULL;
