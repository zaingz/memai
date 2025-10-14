-- Migration: Change daily_digests.user_id from BIGINT to UUID
-- Description: Aligns with users table UUID primary key refactoring

-- Step 1: Change user_id column type to UUID
ALTER TABLE daily_digests ALTER COLUMN user_id TYPE UUID USING NULL::UUID;

-- Step 2: Update comments
COMMENT ON COLUMN daily_digests.user_id IS 'UUID of user for this digest (references users.id), NULL for global digests';
