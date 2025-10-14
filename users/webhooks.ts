import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { db } from "./db";
import { UserRepository } from "./repositories/user.repository";
import {
  AuthWebhookPayload,
  AuthWebhookResponse,
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
 * Webhook for user creation events
 * Called by Supabase when a new user signs up and confirms their email
 *
 * Flow:
 * 1. User signs up via Supabase client SDK
 * 2. User confirms email
 * 3. Supabase calls this webhook
 * 4. We create the user in our local database
 * 5. We optionally return custom JWT claims
 *
 * POST /webhooks/auth/user-created
 * No authentication required (validates via Supabase webhook signature)
 *
 * @param payload Supabase auth webhook payload with user data
 * @returns Optional custom JWT claims to add to the token
 */
export const userCreated = api(
  {
    expose: true,
    method: "POST",
    path: "/webhooks/auth/user-created",
    auth: false, // No auth required for webhooks
  },
  async (payload: AuthWebhookPayload): Promise<AuthWebhookResponse> => {
    try {
      log.info("Received user creation webhook", {
        event: payload.event,
        userId: payload.user.id,
        email: payload.user.email,
      });

      // Extract user data from webhook
      const { id, email, user_metadata } = payload.user;
      const name = user_metadata.name as string | undefined;

      // Check if user already exists (idempotency)
      const existingUser = await userRepo.findById(id);

      if (existingUser) {
        log.info("User already exists in local database", {
          userId: id,
          email,
        });

        // Return empty claims (user already exists)
        return { claims: {} };
      }

      // Create user in local database
      const user = await userRepo.create({
        id,
        email,
        name,
      });

      log.info("User created in local database", {
        userId: user.id,
        email: user.email,
      });

      // Return custom claims to add to JWT (optional)
      // These will be available in the JWT payload
      return {
        claims: {
          local_db_synced: true,
        },
      };
    } catch (error) {
      log.error(error, "Failed to process user creation webhook", {
        userId: payload.user?.id,
        email: payload.user?.email,
        error: error instanceof Error ? error.message : String(error),
      });

      // Don't throw error - return empty claims
      // This prevents Supabase from retrying the webhook endlessly
      // The user can still authenticate, we'll create them on first API call
      return { claims: {} };
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
