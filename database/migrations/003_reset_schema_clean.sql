-- Clean Reset: Drop and recreate schema with correct UUID support
-- Use this if you want to start fresh (no existing data)

-- 1. Drop all dependent objects
DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Users can read embeddings for their documents" ON embeddings;
DROP POLICY IF EXISTS "Users can read their own security logs" ON security_logs;

-- 2. Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Drop functions
DROP FUNCTION IF EXISTS match_embeddings(vector(1536), float, int, bigint) CASCADE;

-- 4. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 5. Create users table with UUID
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create documents table with UUID user_id
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create embeddings table
CREATE TABLE embeddings (
  id BIGSERIAL PRIMARY KEY,
  doc_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- 8. Create security_logs table with UUID user_id
CREATE TABLE security_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_doc_id bigint
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.content,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE embeddings.doc_id = filter_doc_id
  AND 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 10. Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for documents
CREATE POLICY "Users can read their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 12. Create RLS policies for embeddings
CREATE POLICY "Users can read embeddings for their documents"
  ON embeddings FOR SELECT
  USING (
    doc_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid() 
    ) OR auth.uid() IS NULL
  );

-- 13. Create RLS policies for security_logs
CREATE POLICY "Users can read their own security logs"
  ON security_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- 14. Create indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_embeddings_doc_id ON embeddings(doc_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);

-- Done! Schema is now ready with proper UUID support
COMMENT ON TABLE documents IS 'Stores PDF document metadata with UUID-based user isolation';
COMMENT ON TABLE embeddings IS 'Stores document embeddings for semantic search';
COMMENT ON TABLE security_logs IS 'Tracks security events and potential injection attempts';
