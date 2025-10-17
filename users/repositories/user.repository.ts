import { SQLDatabase } from "encore.dev/storage/sqldb";
import { User } from "../types";
import { BaseRepository } from "../../shared/repositories/base.repository";

/**
 * UserRepository handles all database operations for users
 * Uses UUID as primary key (Supabase user ID)
 * Extends BaseRepository with string ID type
 */
export class UserRepository extends BaseRepository<User, string> {
  constructor(db: SQLDatabase) {
    super(db);
  }

  /**
   * Implementation of abstract method: Find user by ID
   * Note: Users don't have ownership concept - userId parameter is the same as id
   */
  protected async findByIdQuery(
    id: string,
    userId: string
  ): Promise<User | null> {
    return (
      (await this.db.queryRow<User>`
      SELECT * FROM users WHERE id = ${id}
    `) || null
    );
  }

  /**
   * Implementation of abstract method: Delete user
   * Note: Users don't have ownership concept - userId parameter is the same as id
   */
  protected async deleteQuery(id: string, userId: string): Promise<void> {
    await this.db.exec`
      DELETE FROM users WHERE id = ${id}
    `;
  }

  /**
   * Implementation of abstract method: Update user status
   * Note: Users don't have status tracking, so this throws an error
   */
  protected async updateStatus(): Promise<void> {
    throw new Error("Users do not have status tracking");
  }

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
   * Convenience method that wraps inherited findById
   * @param id User UUID
   * @returns User if found, null otherwise
   */
  async findByIdSimple(id: string): Promise<User | null> {
    return this.findById(id, id); // For users, id and userId are the same
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
   * Alias for findByIdSimple for backward compatibility
   * Used during Supabase JWT authentication
   * @param supabaseUserId Supabase user UUID
   * @returns User if found, null otherwise
   */
  async findBySupabaseId(supabaseUserId: string): Promise<User | null> {
    return this.findByIdSimple(supabaseUserId);
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
   * Convenience method that wraps inherited delete
   * @param id User UUID
   * @throws Error if user not found
   */
  async deleteSimple(id: string): Promise<void> {
    await this.delete(id, id); // For users, id and userId are the same
  }

  /**
   * List all user IDs
   * Used by cron jobs and batch operations
   * @returns Array of user UUIDs
   */
  async listAllUserIds(): Promise<string[]> {
    const query = this.db.query<{ id: string }>`
      SELECT id FROM users ORDER BY created_at ASC
    `;

    const userIds: string[] = [];
    for await (const row of query) {
      userIds.push(row.id);
    }

    return userIds;
  }
}
