/**
 * JWT Generator Utility for Testing
 *
 * Generates valid Supabase-style JWT tokens for testing authenticated endpoints.
 * Uses the jose library to create RS256 JWTs that match Supabase's JWT structure.
 *
 * Note: For full JWKS testing, we would need to generate a key pair and mock
 * the JWKS endpoint. For now, these tokens can be used with a mocked auth handler.
 */

import { SignJWT, generateKeyPair, exportJWK, exportPKCS8 } from "jose";
import { SupabaseJWTPayload } from "../../users/types/supabase.types";
import { TEST_CONFIG } from "../setup";

/**
 * Test key pair for signing JWTs
 * Generated once and reused across tests
 */
let testKeyPair: Awaited<ReturnType<typeof generateKeyPair>> | null = null;

/**
 * Generate or get cached test key pair
 */
async function getTestKeyPair() {
  if (!testKeyPair) {
    testKeyPair = await generateKeyPair("RS256");
  }
  return testKeyPair;
}

/**
 * Generate a test JWT token with Supabase-like structure
 *
 * @param userId - User UUID (default: test user ID)
 * @param email - User email (default: test@example.com)
 * @param options - Additional options for token generation
 * @returns Signed JWT token string
 *
 * @example
 * ```typescript
 * const token = await generateTestJWT("user-uuid", "user@example.com");
 * const response = await fetch("/users/me", {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export async function generateTestJWT(
  userId: string = TEST_CONFIG.testUser.id,
  email: string = TEST_CONFIG.testUser.email,
  options: {
    expiresIn?: string; // e.g., "1h", "2d"
    metadata?: Record<string, any>;
    role?: string;
  } = {}
): Promise<string> {
  const { privateKey } = await getTestKeyPair();

  const {
    expiresIn = TEST_CONFIG.jwt.expiresIn,
    metadata = {},
    role = "authenticated",
  } = options;

  // Create JWT payload matching Supabase structure
  const payload: Partial<SupabaseJWTPayload> = {
    sub: userId, // User UUID
    email: email,
    aud: TEST_CONFIG.jwt.audience,
    role: role,
    iss: TEST_CONFIG.jwt.issuer,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseExpiresIn(expiresIn),
    user_metadata: metadata,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
  };

  // Sign the JWT
  const jwt = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(TEST_CONFIG.jwt.issuer)
    .setAudience(TEST_CONFIG.jwt.audience)
    .sign(privateKey);

  return jwt;
}

/**
 * Generate an expired JWT token for testing authentication failures
 */
export async function generateExpiredJWT(
  userId: string = TEST_CONFIG.testUser.id,
  email: string = TEST_CONFIG.testUser.email
): Promise<string> {
  return generateTestJWT(userId, email, { expiresIn: "-1h" });
}

/**
 * Get the public key in JWK format for JWKS endpoint mocking
 */
export async function getTestPublicKeyJWK() {
  const { publicKey } = await getTestKeyPair();
  return await exportJWK(publicKey);
}

/**
 * Get the private key in PKCS8 format (for debugging)
 */
export async function getTestPrivateKeyPKCS8() {
  const { privateKey } = await getTestKeyPair();
  return await exportPKCS8(privateKey);
}

/**
 * Helper to parse time strings like "1h", "2d" into seconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(-?\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid expiresIn format: ${expiresIn}. Use format like "1h", "30m", "2d"`
    );
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return num * multipliers[unit];
}

/**
 * Create a Bearer token string for Authorization header
 */
export function toBearerToken(jwt: string): string {
  return `Bearer ${jwt}`;
}

/**
 * Generate multiple test JWT tokens for different users
 * Useful for testing multi-user scenarios
 */
export async function generateTestJWTs(
  users: Array<{ id: string; email: string }>
): Promise<Map<string, string>> {
  const tokens = new Map<string, string>();

  for (const user of users) {
    const token = await generateTestJWT(user.id, user.email);
    tokens.set(user.id, token);
  }

  return tokens;
}
