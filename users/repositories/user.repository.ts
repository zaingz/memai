import { SQLDatabase } from "encore.dev/storage/sqldb";
import { User } from "../types";

/**
 * UserRepository handles all database operations for users
 * Follows the Repository pattern for clean separation of concerns
 */
export class UserRepository {
  constructor(private readonly db: SQLDatabase) {}

  /**
   * Create a new user in the database
   * @param data User data including email, password_hash, and optional name
   * @returns The created user with id and timestamps
   * @throws Error if user creation fails (e.g., duplicate email)
   */
  async create(data: {
    email: string;
    password_hash: string;
    name?: string;
  }): Promise<User> {
    const row = await this.db.queryRow<User>`
      INSERT INTO users (email, password_hash, name)
      VALUES (${data.email}, ${data.password_hash}, ${data.name || null})
      RETURNING *
    `;

    if (!row) {
      throw new Error("Failed to create user");
    }

    return row;
  }

  /**
   * Find a user by their ID
   * @param id User ID
   * @returns User if found, null otherwise
   */
  async findById(id: number): Promise<User | null> {
    return (
      (await this.db.queryRow<User>`
      SELECT * FROM users WHERE id = ${id}
    `) || null
    );
  }

  /**
   * Find a user by their email address
   * Used during login to authenticate users
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
   * Check if a user exists with the given email
   * Used during signup to prevent duplicate accounts
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
   * Update user information
   * @param id User ID
   * @param data Partial user data to update
   * @returns Updated user
   * @throws Error if user not found
   */
  async update(
    id: number,
    data: {
      email?: string;
      password_hash?: string;
      name?: string;
    }
  ): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push(`email = $${values.length + 1}`);
      values.push(data.email);
    }
    if (data.password_hash !== undefined) {
      updates.push(`password_hash = $${values.length + 1}`);
      values.push(data.password_hash);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    const row = await this.db.queryRow<User>`
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!row) {
      throw new Error(`User with id ${id} not found`);
    }

    return row;
  }

  /**
   * Delete a user by ID
   * @param id User ID
   * @throws Error if user not found
   */
  async delete(id: number): Promise<void> {
    await this.db.exec`
      DELETE FROM users WHERE id = ${id}
    `;
  }
}
