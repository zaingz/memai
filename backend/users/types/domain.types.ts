// ============================================
// User Domain Types
// ============================================

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
