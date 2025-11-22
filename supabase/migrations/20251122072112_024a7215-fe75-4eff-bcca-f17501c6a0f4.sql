-- Add storage tracking column to profiles
ALTER TABLE profiles ADD COLUMN total_storage_used BIGINT DEFAULT 0;

-- Create RPC function for atomic storage updates
CREATE OR REPLACE FUNCTION update_user_storage(
  p_user_id UUID,
  p_size_delta BIGINT
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET total_storage_used = GREATEST(0, total_storage_used + p_size_delta)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PDF summaries table (caching)
CREATE TABLE pdf_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdf_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
ON pdf_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own summaries"
ON pdf_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
ON pdf_summaries FOR DELETE
USING (auth.uid() = user_id);

-- Study guides table (caching)
CREATE TABLE study_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study guides"
ON study_guides FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study guides"
ON study_guides FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study guides"
ON study_guides FOR DELETE
USING (auth.uid() = user_id);

-- Chat conversations table
CREATE TABLE pdf_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_file_id UUID NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdf_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON pdf_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON pdf_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON pdf_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON pdf_conversations FOR DELETE
USING (auth.uid() = user_id);