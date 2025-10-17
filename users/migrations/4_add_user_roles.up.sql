-- Add user role enum and column to users table
-- This enables role-based access control for admin operations

-- Create user_role enum type
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Add role column to users table with default 'user'
ALTER TABLE users
ADD COLUMN role user_role NOT NULL DEFAULT 'user';

-- Create index for faster role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Comment on the column
COMMENT ON COLUMN users.role IS 'User role for authorization (user or admin)';
