import { SQLDatabase } from "encore.dev/storage/sqldb";
import { User } from "../types";

/**
 * UserRepository handles all database operations for users
 * Uses UUID as primary key (Supabase user ID)
 */
export class UserRepository {
  constructor(private readonly db: SQLDatabase) {}

  /**
   * Create a new user in the database
   * Called after Supabase user creation to store additional user data
   * @param data User data including Supabase UUID, email, and optional name
   * @returns The created user
   * @throws Error if user creation fails (e.g., duplicate id/email)
   */
  async create(data: {
    id: string; // UUID from Supabase
    email: string;
    name?: string | null;
  }): Promise<User> {
    const row = await this.db.queryRow<User>`
      INSERT INTO users (id, email, name, migrated_to_supabase)
      VALUES (${data.id}, ${data.email}, ${data.name || null}, TRUE)
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create user");
    }

    return row;
  }

  /**
   * Find a user by their ID (UUID from Supabase)
   * @param id User UUID
   * @returns User if found, null otherwise
   */
  async findById(id: string): Promise<User | null> {
    return (
      (await this.db.queryRow<User>`
      SELECT * FROM users WHERE id = ${id}
    `) || null
    );
  }

  /**
   * Find a user by their email address
   * @param email Email address
   * @returns User if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    return (
      (await this.db.queryRow<User>`
      SELECT * FROM users WHERE email = ${email}
    `) || null
    );
  }

  /**
   * Alias for findById for backward compatibility
   * Used during Supabase JWT authentication
   * @param supabaseUserId Supabase user UUID
   * @returns User if found, null otherwise
   */
  async findBySupabaseId(supabaseUserId: string): Promise<User | null> {
    return this.findById(supabaseUserId);
  }

  /**
   * Check if a user exists with the given email
   * @param email Email address
   * @returns true if user exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const row = await this.db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM users WHERE email = ${email}
    `;
    return row ? row.count > 0 : false;
  }

  /**
   * Check if a user exists with the given ID
   * @param id User UUID
   * @returns true if user exists, false otherwise
   */
  async existsById(id: string): Promise<boolean> {
    const row = await this.db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM users WHERE id = ${id}
    `;
    return row ? row.count > 0 : false;
  }

  /**
   * Update user information
   * @param id User UUID
   * @param data Partial user data to update
   * @returns Updated user
   * @throws Error if user not found
   */
  async update(
    id: string,
    data: {
      email?: string;
      name?: string | null;
    }
  ): Promise<User> {
    // Build dynamic update query
    const updates: string[] = [];

    if (data.email !== undefined) {
      updates.push('email');
    }
    if (data.name !== undefined) {
      updates.push('name');
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    // Create update query based on provided fields
    let query;
    if (data.email !== undefined && data.name !== undefined) {
      query = this.db.queryRow<User>`
        UPDATE users
        SET email = ${data.email}, name = ${data.name}
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (data.email !== undefined) {
      query = this.db.queryRow<User>`
        UPDATE users
        SET email = ${data.email}
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      query = this.db.queryRow<User>`
        UPDATE users
        SET name = ${data.name}
        WHERE id = ${id}
        RETURNING *
      `;
    }

    const row = await query;

    if (!row) {
      throw new Error(`User with id ${id} not found`);
    }

    return row;
  }

  /**
   * Delete a user by ID
   * @param id User UUID
   * @throws Error if user not found
   */
  async delete(id: string): Promise<void> {
    await this.db.exec`
      DELETE FROM users WHERE id = ${id}
    `;
  }
}
