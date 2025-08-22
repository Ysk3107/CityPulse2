-- Add photos column to reports table
ALTER TABLE reports ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Update RLS policy to include photos
DROP POLICY IF EXISTS "Users can view all reports" ON reports;
CREATE POLICY "Users can view all reports" ON reports
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reports" ON reports;
CREATE POLICY "Users can insert their own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);
