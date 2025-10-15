/**
 * Supabase Auth Webhook Types
 *
 * These types define the payloads sent by Supabase Auth Hooks
 * when authentication events occur (user created, etc.)
 *
 * @see https://supabase.com/docs/guides/auth/auth-hooks
 */

/**
 * Supabase Auth Hook Event Types
 */
export type AuthHookEvent =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "password.recovery";

/**
 * User metadata from Supabase (simplified for Encore compatibility)
 */
export interface SupabaseUserMetadata {
  name?: string;
}

/**
 * App metadata from Supabase (simplified for Encore compatibility)
 */
export interface SupabaseAppMetadata {
  provider?: string;
  providers?: string[];
}

/**
 * User identity from Supabase
 */
export interface SupabaseIdentity {
  id: string;
  user_id: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string;
  updated_at: string;
}

/**
 * User data from Supabase Auth Hook
 */
export interface SupabaseAuthUser {
  id: string; // UUID
  aud: string; // "authenticated"
  role: string; // "authenticated"
  email: string;
  email_confirmed_at: string | null; // ISO timestamp
  phone: string | null;
  confirmed_at: string | null; // ISO timestamp
  last_sign_in_at: string | null; // ISO timestamp
  app_metadata: SupabaseAppMetadata;
  user_metadata: SupabaseUserMetadata;
  identities: SupabaseIdentity[];
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Custom JWT claims that can be added via webhook
 */
export interface CustomClaims {
  local_db_synced?: boolean;
}

/**
 * Webhook payload from Supabase Auth Hook
 */
export interface AuthWebhookPayload {
  event: AuthHookEvent;
  user: SupabaseAuthUser;
  claims?: CustomClaims; // Custom JWT claims
}

/**
 * Response from webhook handler
 * Return custom claims to add to the JWT
 */
export interface AuthWebhookResponse {
  claims?: CustomClaims;
}

/**
 * Custom Access Token Hook Payload
 *
 * This is the payload structure for Supabase Custom Access Token hooks.
 * Different from other webhook types!
 *
 * @see https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
 */
export interface CustomAccessTokenHookPayload {
  /**
   * User ID attempting to sign in
   */
  user_id: string;

  /**
   * Existing JWT claims that will be included in the token
   * You must preserve all existing claims and can add custom ones
   */
  claims: Record<string, any>;

  /**
   * Authentication method used (password, oauth, otp, etc.)
   */
  authentication_method: string;
}

/**
 * Custom Access Token Hook Response
 * Must return the updated claims object
 */
export interface CustomAccessTokenHookResponse {
  /**
   * Updated claims object (must include all required claims)
   */
  claims: Record<string, any>;
}
