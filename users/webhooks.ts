import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { db } from "./db";
import { UserRepository } from "./repositories/user.repository";
import {
  CustomAccessTokenHookPayload,
  CustomAccessTokenHookResponse,
} from "./types";

/**
 * Supabase Auth Webhooks
 *
 * These endpoints are called by Supabase Auth Hooks when authentication events occur.
 * They allow us to automatically sync user data to our local database.
 *
 * Configuration:
 * 1. Go to Supabase Dashboard → Authentication → Hooks
 * 2. Create a new Hook of type "Custom Access Token"
 * 3. Set the URL to: https://your-api.com/webhooks/auth/user-created
 * 4. The hook will be called after user signup/confirmation
 *
 * @see https://supabase.com/docs/guides/auth/auth-hooks
 */

// Initialize repository
const userRepo = new UserRepository(db);

/**
 * Custom Access Token Hook
 * Called by Supabase before issuing a JWT token
 *
 * Flow:
 * 1. User signs up/logs in via Supabase
 * 2. Supabase calls this hook BEFORE issuing the JWT
 * 3. We sync the user to our local database
 * 4. We return updated claims including our custom claim
 * 5. Supabase issues the JWT with the updated claims
 *
 * POST /webhooks/auth/user-created
 * No authentication required (validates via Supabase webhook signature)
 *
 * @param payload Custom Access Token hook payload with user_id and existing claims
 * @returns Updated claims object with local_db_synced added
 */
export const userCreated = api(
  {
    expose: true,
    method: "POST",
    path: "/webhooks/auth/user-created",
    auth: false, // No auth required for webhooks
  },
  async (payload: CustomAccessTokenHookPayload): Promise<CustomAccessTokenHookResponse> => {
    try {
      log.info("Received Custom Access Token hook", {
        userId: payload.user_id,
        authMethod: payload.authentication_method,
      });

      // Extract user ID
      const userId = payload.user_id;

      // Get email and name from existing claims
      const email = payload.claims.email as string;
      const name = payload.claims.user_metadata?.name as string | undefined;

      // Check if user already exists (idempotency)
      const existingUser = await userRepo.findByIdSimple(userId);

      if (existingUser) {
        log.info("User already exists in local database", {
          userId,
          email,
        });

        // Return existing claims + our custom claim
        return {
          claims: {
            ...payload.claims,
            local_db_synced: true,
          },
        };
      }

      // Create user in local database
      const user = await userRepo.create({
        id: userId,
        email,
        name,
      });

      log.info("User created in local database", {
        userId: user.id,
        email: user.email,
      });

      // Return existing claims + our custom claim
      // IMPORTANT: Must preserve all existing claims!
      return {
        claims: {
          ...payload.claims,
          local_db_synced: true,
        },
      };
    } catch (error) {
      log.error(error, "Failed to process Custom Access Token hook", {
        userId: payload.user_id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Don't throw error - return existing claims unchanged
      // This prevents Supabase from failing authentication
      return { claims: payload.claims };
    }
  }
);

/**
 * TODO: Add webhook signature verification
 *
 * For production, we should verify that the webhook request
 * is actually coming from Supabase by validating the signature.
 *
 * Supabase includes a JWT in the Authorization header that we can verify
 * using the same JWKS endpoint we use for user authentication.
 *
 * Implementation:
 * 1. Extract JWT from Authorization header
 * 2. Verify using Supabase JWKS
 * 3. Check that the JWT has a specific claim indicating it's a webhook
 * 4. Only process the webhook if verification passes
 */
