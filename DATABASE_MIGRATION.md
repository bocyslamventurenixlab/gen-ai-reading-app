# Database Schema Migration Guide

## Problem
The original database schema used `INTEGER` for `user_id`, but Supabase Auth provides **UUID** (string) user IDs. This causes a type mismatch when inserting documents.

**Error:** `invalid input syntax for type integer: "24c88fd5-5fc3-4b49-93cc-2652ec98fc23"`

## Solution
Update the database schema to use UUID for user IDs to match Supabase Auth.

## Steps to Apply Migration

### Option 1: Use Supabase SQL Editor (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `database/migrations/002_fix_uuid_schema.sql`
5. Click **Run**

### Option 2: Use psql (Command Line)

```bash
# Connect to your Supabase database
psql -h db.supabase.co -U postgres -d postgres << EOF
$(cat database/migrations/002_fix_uuid_schema.sql)
EOF
```

Replace with your actual Supabase credentials.

## What the Migration Does

1. ✅ Drops existing RLS policies (to avoid conflicts)
2. ✅ Converts `user_id` columns from INTEGER to UUID
3. ✅ Updates foreign key constraints
4. ✅ Re-enables Row Level Security (RLS) with proper policies
5. ✅ Creates performance indexes
6. ✅ Adds helpful column comments

## RLS Policies Applied

After migration, these policies will enforce security:

| Policy | Table | Effect |
|--------|-------|--------|
| `Users can read their own documents` | documents | SELECT only own docs |
| `Users can create their own documents` | documents | INSERT only if user_id matches |
| `Users can update their own documents` | documents | UPDATE only own docs |
| `Users can delete their own documents` | documents | DELETE only own docs |
| `Users can read embeddings for their documents` | embeddings | SELECT embeddings for own docs |
| `Users can read their own security logs` | security_logs | SELECT own security logs |

## Verification

After applying the migration, verify the schema change:

```sql
-- Check documents table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents';

-- Check RLS is enabled
SELECT * FROM pg_tables 
WHERE tablename = 'documents' AND rowsecurity = true;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'documents';
```

Expected output:
```
column_name | data_type
------------|----------
id          | bigint
user_id     | uuid         ← Should be UUID now
title       | text
upload_date | timestamp with time zone
```

## What Happens After Migration

✅ **Documents table now correctly stores Supabase Auth UUIDs**
✅ **RLS policies enforce user data isolation**
✅ **Upload endpoint will work without type errors**
✅ **Each user can only access their own documents**

## Troubleshooting

### Error: "Column user_id of relation documents already exists"
This means the column already exists. You can ignore this error.

### Error: "Relation documents does not exist"
The documents table hasn't been created yet. Run the initial migration first (`001_initial.sql`).

### Error: "Cannot drop policy, it does not exist"
This is normal if the policies don't exist yet. The migration uses `DROP IF EXISTS` to handle this.

## Backend Code Already Updated

The backend code has been updated to:
1. Extract user_id from the `X-User-ID` header (passed by the gateway)
2. Include user_id in all database INSERT operations
3. RLS policies automatically enforce user isolation at the database level

## Testing After Migration

Once the migration is applied:

1. Login to the app at `http://localhost:3000`
2. Click "Upload PDF"
3. Select a PDF file
4. The upload should succeed without 500 errors
5. Your document will be stored with your user_id
6. Only you can see your documents
