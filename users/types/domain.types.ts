// ============================================
// User Domain Types
// ============================================

/**
 * User role enum for authorization
 * NOTE: Current schema doesn't have role field yet
 * This enum is defined for future use and middleware compatibility
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

/**
 * Database row interface for users table
 * Uses UUID as primary key (Supabase user ID)
 */
export interface User {
  id: string; // UUID from Supabase
  email: string;
  name: string | null;
  migrated_to_supabase: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Safe user representation for API responses
 */
export interface SafeUser {
  id: string; // UUID from Supabase
  email: string;
  name: string | null;
  migrated_to_supabase: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * JWT token payload structure
 */
export interface TokenPayload {
  userID: string; // UUID from Supabase
  email: string;
}

/**
 * Helper function to convert User to SafeUser
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    migrated_to_supabase: user.migrated_to_supabase,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
