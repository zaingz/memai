/**
 * Test Data Factory
 *
 * Provides functions to generate realistic test data for users, webhooks, and other entities.
 * Uses consistent, predictable data for test reproducibility.
 */

import { randomUUID } from "crypto";
import { User } from "../../users/types/domain.types";
import {
  AuthWebhookPayload,
  SupabaseAuthUser,
  CustomAccessTokenHookPayload,
} from "../../users/types/webhook.types";

/**
 * Generate a test user with optional overrides
 *
 * @param overrides - Partial user data to override defaults
 * @returns Complete User object
 */
export function createTestUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return {
    id: randomUUID(),
    email: `test-${randomUUID().slice(0, 8)}@example.com`,
    name: "Test User",
    migrated_to_supabase: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Generate multiple test users
 *
 * @param count - Number of users to create
 * @returns Array of User objects
 */
export function createTestUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({
      email: `test-user-${i}@example.com`,
      name: `Test User ${i}`,
    })
  );
}

/**
 * Create a Supabase Auth User object for webhook testing
 *
 * @param overrides - Partial user data to override defaults
 * @returns SupabaseAuthUser object
 */
export function createSupabaseAuthUser(
  overrides: Partial<SupabaseAuthUser> = {}
): SupabaseAuthUser {
  const now = new Date().toISOString();
  const id = randomUUID();

  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: `test-${id.slice(0, 8)}@example.com`,
    email_confirmed_at: now,
    phone: null,
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      name: "Test User",
    },
    identities: [
      {
        id: id,
        user_id: id,
        provider: "email",
        created_at: now,
        last_sign_in_at: now,
        updated_at: now,
      },
    ],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create a Supabase webhook payload for user creation events
 *
 * @param user - Optional SupabaseAuthUser (will be generated if not provided)
 * @returns Complete AuthWebhookPayload
 */
export function createUserCreatedWebhookPayload(
  user?: Partial<SupabaseAuthUser>
): AuthWebhookPayload {
  return {
    event: "user.created",
    user: createSupabaseAuthUser(user),
    claims: undefined,
  };
}

/**
 * Create a batch of webhook payloads
 *
 * @param count - Number of payloads to create
 * @returns Array of AuthWebhookPayload objects
 */
export function createUserCreatedWebhookPayloads(
  count: number
): AuthWebhookPayload[] {
  return Array.from({ length: count }, (_, i) =>
    createUserCreatedWebhookPayload({
      email: `webhook-user-${i}@example.com`,
      user_metadata: { name: `Webhook User ${i}` },
    })
  );
}

/**
 * Create a Custom Access Token Hook payload
 * This is the NEW format used by Supabase Custom Access Token hooks
 *
 * @param overrides - Optional overrides for user_id, email, name, etc.
 * @returns CustomAccessTokenHookPayload
 */
export function createCustomAccessTokenHookPayload(
  overrides: {
    id?: string;
    email?: string;
    user_metadata?: { name?: string };
    authentication_method?: string;
  } = {}
): CustomAccessTokenHookPayload {
  const userId = overrides.id || randomUUID();
  const email = overrides.email !== undefined ? overrides.email : `test-${userId.slice(0, 8)}@example.com`;

  // Handle user_metadata properly - if explicitly passed, use it as-is
  let userMetadata: { name?: string } | undefined;
  if (overrides.user_metadata !== undefined) {
    userMetadata = overrides.user_metadata;
  } else {
    userMetadata = { name: "Test User" };
  }

  return {
    user_id: userId,
    claims: {
      sub: userId,
      email: email,
      email_confirmed_at: new Date().toISOString(),
      phone: "",
      user_metadata: userMetadata,
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      role: "authenticated",
      aal: "aal1",
      session_id: randomUUID(),
      is_anonymous: false,
    },
    authentication_method: overrides.authentication_method || "password",
  };
}

/**
 * Create a test user with specific UUID
 * Useful for testing specific scenarios
 */
export function createTestUserWithId(id: string, email?: string): User {
  return createTestUser({
    id,
    email: email || `test-${id.slice(0, 8)}@example.com`,
  });
}

/**
 * Predefined test users for consistent testing
 */
export const TEST_USERS = {
  /**
   * Primary test user for most tests
   */
  primary: createTestUser({
    id: "00000000-0000-0000-0000-000000000001",
    email: "primary@test.com",
    name: "Primary Test User",
  }),

  /**
   * Secondary test user for multi-user scenarios
   */
  secondary: createTestUser({
    id: "00000000-0000-0000-0000-000000000002",
    email: "secondary@test.com",
    name: "Secondary Test User",
  }),

  /**
   * User without name (testing nullable fields)
   */
  noName: createTestUser({
    id: "00000000-0000-0000-0000-000000000003",
    email: "noname@test.com",
    name: null,
  }),
} as const;

/**
 * Generate random email address
 */
export function randomEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

/**
 * Generate random user name
 */
export function randomName(): string {
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}

/**
 * Convert User to UserRepository.create() format
 * Converts null to undefined for optional fields
 */
export function toUserCreateData(
  user: User
): { id: string; email: string; name?: string } {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
  };
}
