// ============================================
// User Domain Types
// ============================================

/**
 * Database row interface for users table
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Safe user representation (excludes password_hash)
 * Used for API responses and client-facing data
 */
export interface SafeUser {
  id: number;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * JWT token payload structure
 */
export interface TokenPayload {
  userID: number;
  email: string;
}

/**
 * Helper function to convert User to SafeUser
 * Removes password_hash for security
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
