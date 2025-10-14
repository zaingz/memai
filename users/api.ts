import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import { db } from "./db";
import { UserRepository } from "./repositories/user.repository";
import { MeResponse, UpdateProfileRequest, UpdateProfileResponse } from "./types";

/**
 * API Endpoints for User Management
 *
 * NOTE: Signup and Login are now handled by Supabase Auth
 * - Signup: Use Supabase client library or POST to https://wykjjshvcwfiyvzmvocf.supabase.co/auth/v1/signup
 * - Login: Use Supabase client library or POST to https://wykjjshvcwfiyvzmvocf.supabase.co/auth/v1/token
 * - Password Reset: Handled by Supabase (auth.resetPasswordForEmail())
 * - Email Verification: Handled by Supabase automatically
 *
 * This API only provides:
 * - GET /users/me - Fetch user profile from local database
 */

// Initialize repository
const userRepo = new UserRepository(db);

/**
 * ARCHIVED ENDPOINTS:
 * The following endpoints have been replaced by Supabase Auth:
 * - POST /users/signup → Use Supabase signUp()
 * - POST /users/login → Use Supabase signInWithPassword()
 *
 * See users/_archived/ for old implementation
 *
 * Frontend Integration Example:
 *   import { createClient } from '@supabase/supabase-js'
 *   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
 *
 *   // Signup
 *   const { data, error } = await supabase.auth.signUp({
 *     email: 'user@example.com',
 *     password: 'password123'
 *   })
 *
 *   // Login
 *   const { data, error } = await supabase.auth.signInWithPassword({
 *     email: 'user@example.com',
 *     password: 'password123'
 *   })
 *
 *   // Password Reset
 *   await supabase.auth.resetPasswordForEmail('user@example.com')
 */

/**
 * Get Current User Endpoint
 * Returns the currently authenticated user's information from local database
 *
 * GET /users/me
 * Headers: Authorization: Bearer <supabase-token>
 * Returns: { user: SafeUser }
 *
 * NOTE: This endpoint fetches user data from YOUR database, not Supabase.
 * The JWT is validated by Supabase, then we look up additional user data locally.
 */
export const me = api(
  { expose: true, method: "GET", path: "/users/me", auth: true },
  async (): Promise<MeResponse> => {
    // Get authenticated user data from auth handler
    // auth.userID is now the Supabase user UUID (not the integer ID)
    const auth = getAuthData();

    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    try {
      // Look up user by Supabase UUID (which is now the primary key)
      const user = await userRepo.findById(auth.userID);

      if (!user) {
        log.warn("User not found in local database", {
          userId: auth.userID,
          email: auth.email,
        });
        throw new Error(
          `User ${auth.userID} authenticated with Supabase but not found in local database. User may need to be created.`
        );
      }

      log.info("User fetched current user info", {
        userId: user.id,
      });

      const safeUser = {
        id: user.id, // UUID from Supabase
        email: user.email,
        name: user.name,
        migrated_to_supabase: user.migrated_to_supabase,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      return { user: safeUser };
    } catch (error) {
      log.error(error, "Failed to fetch current user", {
        userId: auth.userID,
      });

      throw APIError.notFound("User not found in local database");
    }
  }
);

/**
 * Update Current User Profile Endpoint
 * Updates the authenticated user's profile information
 *
 * PATCH /users/me
 * Headers: Authorization: Bearer <supabase-token>
 * Body: { name?: string }
 * Returns: { user: SafeUser }
 *
 * NOTE: This endpoint updates the user's profile in our local database.
 * Email changes should be handled directly via Supabase client SDK.
 */
export const updateProfile = api(
  { expose: true, method: "PATCH", path: "/users/me", auth: true },
  async (req: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    // Get authenticated user data from auth handler
    const auth = getAuthData();

    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    try {
      // Validate that at least one field is provided
      if (req.name === undefined) {
        throw APIError.invalidArgument(
          "At least one field must be provided for update"
        );
      }

      // Update user profile
      const updatedUser = await userRepo.update(auth.userID, {
        name: req.name,
      });

      log.info("User updated profile", {
        userId: updatedUser.id,
        updatedFields: Object.keys(req),
      });

      const safeUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        migrated_to_supabase: updatedUser.migrated_to_supabase,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      };

      return { user: safeUser };
    } catch (error) {
      log.error(error, "Failed to update user profile", {
        userId: auth.userID,
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Failed to update user profile");
    }
  }
);
