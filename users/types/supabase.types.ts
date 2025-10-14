/**
 * Supabase-specific type definitions
 * Based on Supabase Auth JWT structure and API responses
 */

/**
 * Supabase JWT Payload
 * Standard claims in Supabase-issued JWTs
 * Reference: https://supabase.com/docs/guides/auth/jwt-fields
 */
export interface SupabaseJWTPayload {
  /** Authentication method used (e.g., "password", "oauth", "magic_link") */
  aud: string;

  /** Expiration timestamp (Unix time) */
  exp: number;

  /** Issued at timestamp (Unix time) */
  iat: number;

  /** Issuer - Supabase Auth endpoint */
  iss: string;

  /** Subject - Supabase user UUID */
  sub: string;

  /** User email address */
  email?: string;

  /** Phone number (if using phone auth) */
  phone?: string;

  /** User metadata from Supabase auth.users.user_metadata */
  user_metadata?: {
    name?: string;
    [key: string]: any;
  };

  /** App metadata from Supabase auth.users.app_metadata */
  app_metadata?: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };

  /** Postgres role for Row Level Security */
  role: string;

  /** Authentication assurance level (e.g., "aal1", "aal2" for MFA) */
  aal?: string;

  /** Session ID */
  session_id?: string;
}

/**
 * Supabase User object structure
 * Returned from Supabase auth endpoints
 */
export interface SupabaseUser {
  id: string;
  aud: string;
  role: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  user_metadata: {
    name?: string;
    [key: string]: any;
  };
  identities?: Array<{
    id: string;
    user_id: string;
    identity_data: Record<string, any>;
    provider: string;
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Response from Supabase auth.admin.createUser()
 * Used during user migration
 */
export interface SupabaseCreateUserResponse {
  user: SupabaseUser | null;
  session: null;
}

/**
 * Options for creating a user via admin API
 * Used in migration script
 */
export interface SupabaseCreateUserOptions {
  email: string;
  password?: string;
  password_hash?: string;
  email_confirm?: boolean;
  phone_confirm?: boolean;
  user_metadata?: {
    name?: string;
    [key: string]: any;
  };
  app_metadata?: Record<string, any>;
}

/**
 * Migration status for tracking user migration from local auth to Supabase
 */
export interface UserMigrationStatus {
  user_id: number;
  email: string;
  supabase_user_id: string | null;
  migrated_at: Date | null;
  migration_status: "pending" | "completed" | "failed";
  error_message?: string;
}
