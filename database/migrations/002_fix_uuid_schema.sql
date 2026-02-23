-- Migration: Fix UUID schema for Supabase Auth integration
-- This migration updates the documents table to use UUID for user_id
-- to match Supabase Auth user IDs

-- 1. Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Users can read embeddings for their documents" ON embeddings;
DROP POLICY IF EXISTS "Users can read their own security logs" ON security_logs;

-- 2. Drop existing constraints and foreign keys
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE security_logs DROP CONSTRAINT IF EXISTS security_logs_user_id_fkey;

-- 3. Update documents.user_id column to UUID (PostgreSQL syntax)
ALTER TABLE documents ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- 4. Update security_logs.user_id column to UUID (add if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE security_logs ADD COLUMN user_id UUID;
  ELSE
    ALTER TABLE security_logs ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
  END IF;
END $$;

-- 5. Update users table to use UUID for id
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::text::uuid;

-- 6. Re-add foreign key constraints
ALTER TABLE documents 
ADD CONSTRAINT documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE security_logs 
ADD CONSTRAINT security_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for documents
CREATE POLICY "Users can read their own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE
USING (auth.uid() = user_id);

-- 9. Enable RLS on embeddings table
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for embeddings
CREATE POLICY "Users can read embeddings for their documents"
ON embeddings FOR SELECT
USING (
  doc_id IN (
    SELECT id FROM documents WHERE user_id = auth.uid()
  )
);

-- 11. Enable RLS on security_logs table
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for security_logs
CREATE POLICY "Users can read their own security logs"
ON security_logs FOR SELECT
USING (auth.uid() = user_id);

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- 14. Add helpful comment
COMMENT ON COLUMN documents.user_id IS 'UUID of the user who owns this document (from Supabase Auth)';
COMMENT ON COLUMN security_logs.user_id IS 'UUID of the user who triggered this security log (from Supabase Auth)';
