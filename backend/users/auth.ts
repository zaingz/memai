import { Header, Gateway, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";
import log from "encore.dev/log";
import { appMeta } from "encore.dev";
import { SUPABASE_CONFIG } from "./config/supabase.config";
import { SupabaseJWTPayload } from "./types";

/**
 * AuthParams defines the authentication parameters
 * We extract the Authorization header containing the JWT token
 */
interface AuthParams {
  authorization: Header<"Authorization">;
}

/**
 * AuthData defines the authenticated user information returned by the auth handler
 * NOTE: userID must be a string per Encore.ts requirements
 */
interface AuthData {
  userID: string; // Supabase user UUID
  email: string;
}

/**
 * JWKS (JSON Web Key Set) for verifying Supabase JWTs
 * This is cached by jose library and fetched from Supabase
 * Uses asymmetric key validation (RS256) for security
 */
const SUPABASE_JWKS = createRemoteJWKSet(
  new URL(SUPABASE_CONFIG.jwksEndpoint())
);

/**
 * Auth handler that validates Supabase JWT tokens
 * Called automatically by Encore for endpoints with auth: true
 *
 * Flow:
 * 1. Extract JWT from Authorization header
 * 2. Verify JWT using Supabase JWKS (asymmetric key validation) OR decode in test mode
 * 3. Extract user info from JWT claims
 * 4. Return auth data for use in protected endpoints
 *
 * Test Mode:
 * - In test environment (appMeta().environment.type === "test"), JWTs are decoded
 *   without signature verification to allow integration tests with test JWTs
 *
 * Note: Requires SupabaseURL, SupabaseAnonKey, and SupabaseServiceRoleKey secrets
 */
export const auth = authHandler<AuthParams, AuthData>(
  async (params) => {
    try {
      // Extract token from "Bearer <token>" format
      if (!params.authorization || !params.authorization.startsWith("Bearer ")) {
        throw new Error(
          "Invalid Authorization header format. Expected: Bearer <token>"
        );
      }

      const token = params.authorization.substring(7); // Remove "Bearer " prefix

      if (!token) {
        throw new Error("No token provided in Authorization header");
      }

      // Check if we're in test mode
      // Test mode can be enabled either by:
      // 1. Running in test environment (encore test)
      // 2. Setting ENABLE_TEST_AUTH=true environment variable (for dev server during tests)
      const env = appMeta().environment;
      const isTest = env.type === "test" || process.env.ENABLE_TEST_AUTH === "true";

      let supabasePayload: SupabaseJWTPayload;

      if (isTest) {
        // TEST MODE: Decode JWT without verification
        // This allows integration tests to use test-generated JWTs
        log.info("Test mode: decoding JWT without JWKS verification");

        const decoded = decodeJwt(token);
        supabasePayload = decoded as unknown as SupabaseJWTPayload;
      } else {
        // PRODUCTION MODE: Verify JWT using Supabase JWKS
        // This validates:
        // - Signature (using public key from JWKS)
        // - Expiration (exp claim)
        // - Issuer (iss claim must match Supabase)
        const { payload } = await jwtVerify(token, SUPABASE_JWKS, {
          issuer: SUPABASE_CONFIG.authEndpoint(), // Verify issuer matches Supabase
        });

        supabasePayload = payload as unknown as SupabaseJWTPayload;
      }

      // Extract user info from JWT
      const authData: AuthData = {
        userID: supabasePayload.sub, // Supabase user UUID
        email: supabasePayload.email || "",
      };

      log.info("User authenticated successfully", {
        userID: authData.userID,
        email: authData.email,
        testMode: isTest,
      });

      return authData;
    } catch (error) {
      log.warn("JWT validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Throw unauthenticated error to reject the request
      throw APIError.unauthenticated(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  }
);

/**
 * Gateway configuration with auth handler
 * This makes the auth handler available to all services in the application
 *
 * NOTE: CORS is configured in encore.app file, not here
 */
export const gateway = new Gateway({
  authHandler: auth,
});
