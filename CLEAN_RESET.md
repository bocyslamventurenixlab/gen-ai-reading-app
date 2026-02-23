# Clean Schema Reset (Easiest Approach)

## Use This If You Want to Start Fresh

If you have no important data in your database, this is the **simplest solution**.

### 3 Steps

**Step 1:** Open Supabase SQL Editor
- Go to https://app.supabase.com
- Open your project
- Click **SQL Editor** → **New Query**

**Step 2:** Copy this SQL

```sql
-- Drop all existing tables and functions
DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Users can read embeddings for their documents" ON embeddings;
DROP POLICY IF EXISTS "Users can read their own security logs" ON security_logs;

DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS match_embeddings(vector(1536), float, int, bigint) CASCADE;

-- Create everything fresh with correct UUID types
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE embeddings (
  id BIGSERIAL PRIMARY KEY,
  doc_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

CREATE TABLE security_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own documents"
  ON documents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read embeddings for their documents"
  ON embeddings FOR SELECT USING (doc_id IN (SELECT id FROM documents WHERE user_id = auth.uid()));

CREATE POLICY "Users can read their own security logs"
  ON security_logs FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_embeddings_doc_id ON embeddings(doc_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
```

**Step 3:** Click **Run**

Done! ✅

## What This Does

- ✅ Drops all existing tables (users, documents, embeddings, security_logs)
- ✅ Drops all old policies and functions
- ✅ Recreates **everything from scratch** with correct UUID types
- ✅ Enables RLS for security
- ✅ Creates all necessary indexes

## After This

1. Restart backend:
   ```bash
   docker-compose restart backend
   ```

2. Go to http://localhost:3000

3. Login and try uploading a PDF - **should work now!** ✅

## Why This Works

- **No type conversion errors** - everything created as UUID from the start
- **No orphaned constraints** - clean slate
- **Proper RLS policies** - user isolation enforced at DB level
- **Indexes for performance** - ready for production

---

**Note:** Use this only if you don't have important data. If you need to preserve data, see `DATABASE_MIGRATION.md` for the careful migration approach.
