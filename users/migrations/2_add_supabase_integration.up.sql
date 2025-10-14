-- Migration: Add Supabase integration to users table
-- Description: Adds columns for tracking Supabase user IDs and migration status
-- Created: 2025-01-12

-- Add Supabase user ID column
-- This stores the UUID from Supabase auth.users.id
ALTER TABLE users
ADD COLUMN supabase_user_id UUID UNIQUE;

-- Add migration tracking column
-- Tracks whether this user has been migrated to Supabase
ALTER TABLE users
ADD COLUMN migrated_to_supabase BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for fast lookups by Supabase user ID
-- Used when validating JWTs (sub claim → user lookup)
CREATE INDEX idx_users_supabase_id ON users(supabase_user_id);

-- Create index for migration status queries
-- Useful for tracking migration progress
CREATE INDEX idx_users_migration_status ON users(migrated_to_supabase)
WHERE migrated_to_supabase = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN users.supabase_user_id IS 'UUID of user in Supabase Auth (maps to auth.users.id in Supabase)';
COMMENT ON COLUMN users.migrated_to_supabase IS 'Whether user has been migrated to Supabase Auth';
COMMENT ON INDEX idx_users_supabase_id IS 'Fast lookup for JWT validation (sub claim → user)';
COMMENT ON INDEX idx_users_migration_status IS 'Track unmigrated users for bulk migration';
