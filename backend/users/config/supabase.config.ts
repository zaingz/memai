import { secret } from "encore.dev/config";

/**
 * Supabase Configuration
 * Manages Supabase project credentials and settings
 *
 * Setup Instructions:
 * 1. Create a Supabase project at https://supabase.com/dashboard
 * 2. Get credentials from: Project Settings → API
 * 3. Set secrets locally:
 *    encore secret set --type local SupabaseURL
 *    encore secret set --type local SupabaseAnonKey
 *    encore secret set --type local SupabaseServiceRoleKey
 * 4. Set secrets for production:
 *    encore secret set --type prod SupabaseURL
 *    encore secret set --type prod SupabaseAnonKey
 *    encore secret set --type prod SupabaseServiceRoleKey
 */

// Supabase project URL (e.g., https://xxxxx.supabase.co)
const supabaseURL = secret("SupabaseURL");

// Supabase anon/public key (safe for client-side use)
const supabaseAnonKey = secret("SupabaseAnonKey");

// Supabase service role key (admin privileges - NEVER expose to clients!)
const supabaseServiceRoleKey = secret("SupabaseServiceRoleKey");

/**
 * Supabase configuration object
 * Centralizes all Supabase-related settings
 */
export const SUPABASE_CONFIG = {
  /**
   * Project URL
   * Format: https://xxxxx.supabase.co
   */
  url: () => supabaseURL(),

  /**
   * Anonymous/Public key
   * Safe to use in frontend applications
   * Respects Row Level Security (RLS) policies
   */
  anonKey: () => supabaseAnonKey(),

  /**
   * Service role key
   * Full admin privileges, bypasses RLS
   * ONLY use server-side for admin operations
   * NEVER expose to clients or frontend
   */
  serviceRoleKey: () => supabaseServiceRoleKey(),

  /**
   * JWKS endpoint for JWT verification
   * Used by auth handler to validate Supabase JWTs
   * Format: https://xxxxx.supabase.co/auth/v1/.well-known/jwks.json
   */
  jwksEndpoint: () => `${supabaseURL()}/auth/v1/.well-known/jwks.json`,

  /**
   * Auth API endpoint
   * Base URL for authentication operations
   */
  authEndpoint: () => `${supabaseURL()}/auth/v1`,
} as const;
