# Quick Start: Apply Database Migration

## TL;DR - 3 Step Process

### Step 1: Get the SQL
Copy this entire SQL code:

```sql
-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;
DROP POLICY IF EXISTS "Users can read embeddings for their documents" ON embeddings;
DROP POLICY IF EXISTS "Users can read their own security logs" ON security_logs;

-- Update documents.user_id column to UUID (PostgreSQL syntax)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE documents ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;

-- Update security_logs.user_id (add column if it doesn't exist)
ALTER TABLE security_logs DROP CONSTRAINT IF EXISTS security_logs_user_id_fkey;
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_logs' AND column_name = 'user_id') THEN
    ALTER TABLE security_logs ADD COLUMN user_id UUID;
  ELSE
    ALTER TABLE security_logs ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
  END IF;
END $$;

-- Update users table id to UUID
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::text::uuid;

-- Re-add foreign key constraints
ALTER TABLE documents ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE security_logs ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can read embeddings for their documents" ON embeddings FOR SELECT USING (doc_id IN (SELECT id FROM documents WHERE user_id = auth.uid()));
CREATE POLICY "Users can read their own security logs" ON security_logs FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
```

### Step 2: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Click your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 3: Paste & Run
1. Paste the SQL code above
2. Click **Run** button (or Cmd+Enter)
3. Wait for completion

## Done! ✅

Your database schema is now updated. You can now:
- ✅ Upload PDFs without 500 errors
- ✅ Each user's documents are isolated
- ✅ RLS policies enforce security
- ✅ Go back to the app and try uploading at `http://localhost:3000`

## Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| Error about policies not existing | That's fine, it means they don't exist yet. Continue. |
| Error about column already exists | That's fine, the migration is idempotent. Just run it. |
| Still getting 500 error after migration | Restart backend: `docker-compose restart backend` |

## Need More Info?
See `DATABASE_MIGRATION.md` for detailed explanation.
