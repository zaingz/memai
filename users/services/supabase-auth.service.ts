import { createClient, SupabaseClient } from "@supabase/supabase-js";
import log from "encore.dev/log";
import { SUPABASE_CONFIG } from "../config/supabase.config";
import {
  SupabaseUser,
  SupabaseCreateUserOptions,
  SupabaseCreateUserResponse,
} from "../types";

/**
 * Supabase Auth Service
 * Wrapper around Supabase client for authentication operations
 *
 * This service provides:
 * 1. Server-side JWT validation using getUser()
 * 2. Admin operations for user migration
 * 3. Centralized Supabase client management
 */
export class SupabaseAuthService {
  private adminClient: SupabaseClient;
  private anonClient: SupabaseClient;
  private readonly VERIFY_TIMEOUT_MS = 10000; // 10 seconds

  constructor() {
    // Admin client with service role key
    // Used for: User migration, admin operations
    // WARNING: Never expose this client to frontend!
    this.adminClient = createClient(
      SUPABASE_CONFIG.url(),
      SUPABASE_CONFIG.serviceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Anonymous client with public key
    // Used for: JWT validation, standard auth operations
    // Safe to use server-side for token verification
    this.anonClient = createClient(
      SUPABASE_CONFIG.url(),
      SUPABASE_CONFIG.anonKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    log.info("Supabase Auth Service initialized", {
      url: SUPABASE_CONFIG.url(),
    });
  }

  /**
   * Validate JWT token and get user information
   * IMPORTANT: Use this for server-side auth validation
   * This method makes a request to Supabase to verify the token
   *
   * @param token - JWT access token from Supabase
   * @returns Supabase user object if valid
   * @throws Error if token is invalid or expired
   */
  async getUserFromToken(token: string): Promise<SupabaseUser> {
    try {
      // Use getUser() not getSession() for server-side validation
      // getUser() always validates with Supabase Auth server
      const verifyPromise = this.anonClient.auth.getUser(token);

      // Race between verification and timeout
      const result = await Promise.race([
        verifyPromise,
        this.createTimeout(this.VERIFY_TIMEOUT_MS),
      ]);

      // Check if timeout occurred
      if (result === "TIMEOUT") {
        throw new Error(
          `Token verification timed out after ${this.VERIFY_TIMEOUT_MS}ms`
        );
      }

      const { data: { user }, error } = result;

      if (error) {
        log.warn("Token validation failed", {
          error: error.message,
        });
        throw new Error(`Invalid token: ${error.message}`);
      }

      if (!user) {
        throw new Error("No user found for token");
      }

      log.info("Token validated successfully", {
        userId: user.id,
        email: user.email,
      });

      return user as SupabaseUser;
    } catch (error) {
      log.error(error, "Failed to validate Supabase token");
      throw error instanceof Error
        ? error
        : new Error("Token validation failed");
    }
  }

  /**
   * Helper method to create a timeout promise
   * Used to enforce time limits on external API calls
   */
  private createTimeout(ms: number): Promise<"TIMEOUT"> {
    return new Promise((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    });
  }

  /**
   * Create a new user using admin privileges
   * Used for migrating existing users to Supabase
   *
   * @param options - User creation options including email, password_hash, etc.
   * @returns Created user object
   * @throws Error if user creation fails
   */
  async createUser(
    options: SupabaseCreateUserOptions
  ): Promise<SupabaseUser> {
    try {
      const { data, error } = await this.adminClient.auth.admin.createUser(
        options
      );

      if (error) {
        log.error(error, "Failed to create user in Supabase", {
          email: options.email,
        });
        throw new Error(`Failed to create user: ${error.message}`);
      }

      if (!data.user) {
        throw new Error("User creation returned no user data");
      }

      log.info("User created in Supabase", {
        supabaseUserId: data.user.id,
        email: data.user.email,
      });

      return data.user as SupabaseUser;
    } catch (error) {
      log.error(error, "Error in createUser", {
        email: options.email,
      });
      throw error instanceof Error ? error : new Error("User creation failed");
    }
  }

  /**
   * Get user by Supabase user ID (admin)
   * Used for administrative operations
   *
   * @param userId - Supabase user UUID
   * @returns User object if found
   * @throws Error if user not found
   */
  async getUserById(userId: string): Promise<SupabaseUser> {
    try {
      const { data, error } =
        await this.adminClient.auth.admin.getUserById(userId);

      if (error) {
        throw new Error(`Failed to get user: ${error.message}`);
      }

      if (!data.user) {
        throw new Error(`User ${userId} not found`);
      }

      return data.user as SupabaseUser;
    } catch (error) {
      log.error(error, "Error in getUserById", { userId });
      throw error instanceof Error ? error : new Error("Get user failed");
    }
  }

  /**
   * Check if email exists in Supabase
   * Used during migration to avoid duplicates
   *
   * @param email - Email address to check
   * @returns true if email exists, false otherwise
   * @throws Error if the query fails
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      // List users with email filter (admin operation)
      const { data, error } = await this.adminClient.auth.admin.listUsers();

      if (error) {
        log.error(error, "Failed to check email existence", {
          error: error.message,
          email
        });
        throw new Error(`Failed to check email existence: ${error.message}`);
      }

      const exists = data.users.some((user) => user.email === email);

      log.info("Email existence check completed", { email, exists });

      return exists;
    } catch (error) {
      log.error(error, "Error checking email existence", { email });
      throw error instanceof Error
        ? error
        : new Error("Email existence check failed");
    }
  }

  /**
   * Delete a user by ID (admin)
   * Used for cleanup or testing
   *
   * @param userId - Supabase user UUID
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await this.adminClient.auth.admin.deleteUser(userId);

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }

      log.info("User deleted from Supabase", { userId });
    } catch (error) {
      log.error(error, "Error in deleteUser", { userId });
      throw error instanceof Error ? error : new Error("Delete user failed");
    }
  }
}
