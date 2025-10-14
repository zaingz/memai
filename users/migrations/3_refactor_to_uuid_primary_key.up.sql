-- Migration: Refactor users table to use UUID as primary key
-- Description: Changes from BIGSERIAL to UUID primary key using Supabase user ID
-- This eliminates the need for UUID→integer conversion and aligns with Supabase design

-- Step 1: Drop the old id column and related constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS id;

-- Step 2: Make supabase_user_id the new primary key
ALTER TABLE users ALTER COLUMN supabase_user_id SET NOT NULL;
ALTER TABLE users RENAME COLUMN supabase_user_id TO id;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Step 3: Drop password_hash column (no longer needed with Supabase)
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Step 4: Update comments
COMMENT ON COLUMN users.id IS 'Supabase Auth user UUID (from auth.users.id)';
COMMENT ON TABLE users IS 'User accounts synchronized with Supabase Auth';
