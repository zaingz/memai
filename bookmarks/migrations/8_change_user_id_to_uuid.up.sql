-- Migration: Change bookmarks.user_id from BIGINT to UUID
-- Description: Aligns with users table UUID primary key refactoring

-- Step 1: Drop existing indexes
DROP INDEX IF EXISTS idx_bookmarks_user_id;
DROP INDEX IF EXISTS idx_bookmarks_user_id_created_at;

-- Step 2: Change user_id column type to UUID
ALTER TABLE bookmarks ALTER COLUMN user_id TYPE UUID USING NULL::UUID;

-- Step 3: For fresh databases, set all existing bookmarks to NULL
-- (They will be assigned to users when users create new bookmarks)
UPDATE bookmarks SET user_id = NULL WHERE user_id IS NOT NULL;

-- Step 4: Recreate indexes
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_user_id_created_at ON bookmarks(user_id, created_at DESC);

-- Step 5: Update comments
COMMENT ON COLUMN bookmarks.user_id IS 'UUID of user who created this bookmark (references users.id)';
