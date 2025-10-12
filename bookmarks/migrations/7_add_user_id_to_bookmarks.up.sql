-- Add user_id column to bookmarks table
-- This associates each bookmark with a user for data isolation
-- NOTE: Cannot use foreign key constraint as users and bookmarks are in separate databases
-- Referential integrity must be enforced at the application level

-- Step 1: Add user_id column as nullable first
ALTER TABLE bookmarks
ADD COLUMN user_id BIGINT;

-- Step 2: Set default user_id to 1 for any existing bookmarks
-- (Assumes user with id=1 exists in users service)
UPDATE bookmarks
SET user_id = 1
WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL now that all rows have a value
ALTER TABLE bookmarks
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Create index on user_id for efficient filtering
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- Step 5: Create composite index for common query patterns
CREATE INDEX idx_bookmarks_user_id_created_at ON bookmarks(user_id, created_at DESC);
