-- Reading App: Full Database Schema
-- Compatible with PostgreSQL + pgvector (Supabase)
-- Uses UUID for Supabase Auth integration

-- 1. Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Users Table: Stores user references from Supabase Auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Documents Table: Stores metadata for uploaded files
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Embeddings Table: Stores the actual text chunks and their vectors
-- Note: Dimensions are set to 1536 to match 'text-embedding-3-small'
CREATE TABLE IF NOT EXISTS embeddings (
  id BIGSERIAL PRIMARY KEY,
  doc_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- 5. Security Logs: Tracks potential prompt injection attempts
CREATE TABLE IF NOT EXISTS security_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'injection', 'malicious_intent'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Vector Similarity Search Function
-- This function is called by the Librarian Agent to find the most relevant context
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

-- 7. Row Level Security (RLS) Policies
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for SELECT: Users can only read their own documents
CREATE POLICY "Users can read their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create RLS policy for INSERT: Users can only insert documents with their own user_id
CREATE POLICY "Users can create their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create RLS policy for UPDATE: Users can only update their own documents
CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create RLS policy for DELETE: Users can only delete their own documents
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Enable RLS on embeddings table
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only read embeddings for their own documents
CREATE POLICY "Users can read embeddings for their documents"
  ON embeddings FOR SELECT
  USING (
    doc_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    ) OR auth.uid() IS NULL
  );

-- Create RLS policy: Users (service role) can insert embeddings for their documents
CREATE POLICY "Users can insert embeddings for their documents"
  ON embeddings FOR INSERT
  WITH CHECK (
    doc_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    ) OR auth.uid() IS NULL
  );

-- Enable RLS on security_logs table
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only read their own security logs
CREATE POLICY "Users can read their own security logs"
  ON security_logs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Create RLS policy: Users (service role) can insert their own security logs
CREATE POLICY "Users can insert their own security logs"
  ON security_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- 8. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_doc_id ON embeddings(doc_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- 9. Table Comments for Documentation
COMMENT ON TABLE documents IS 'Stores PDF document metadata with UUID-based user isolation';
COMMENT ON TABLE embeddings IS 'Stores text chunks and their vector embeddings for semantic search';
COMMENT ON TABLE security_logs IS 'Tracks security events and potential injection attempts';
COMMENT ON COLUMN documents.user_id IS 'UUID of the user who owns this document (from Supabase Auth)';
COMMENT ON COLUMN security_logs.user_id IS 'UUID of the user who triggered this security log (from Supabase Auth)';