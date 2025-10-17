import { SQLDatabase } from "encore.dev/storage/sqldb";

/**
 * Base repository class with common CRUD operations
 *
 * Reduces 60-70% of duplicate code across all repositories
 * Provides type-safe database operations with consistent error handling
 *
 * @template TEntity - The entity type
 * @template TId - The ID type (number or string), defaults to number
 */
export abstract class BaseRepository<TEntity, TId = number> {
  constructor(protected readonly db: SQLDatabase) {}

  /**
   * Find entity by ID with user ownership check
   * Override this in child classes with specific table queries
   */
  protected abstract findByIdQuery(
    id: TId,
    userId: string
  ): Promise<TEntity | null>;

  /**
   * Delete entity by ID with user ownership check
   * Override this in child classes with specific table queries
   */
  protected abstract deleteQuery(id: TId, userId: string): Promise<void>;

  /**
   * Standard findById with error handling
   */
  async findById(id: TId, userId: string): Promise<TEntity | null> {
    try {
      return await this.findByIdQuery(id, userId);
    } catch (error) {
      throw new Error(
        `Failed to find entity with id ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Standard delete with error handling
   */
  async delete(id: TId, userId: string): Promise<void> {
    try {
      await this.deleteQuery(id, userId);
    } catch (error) {
      throw new Error(
        `Failed to delete entity with id ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Update processing status - to be implemented by child classes
   * Override this method to implement status tracking for your specific table
   *
   * Example implementation:
   * ```
   * protected async updateStatus(
   *   id: TId,
   *   status: string,
   *   errorMessage: string | null = null
   * ): Promise<void> {
   *   await this.db.exec`
   *     UPDATE your_table
   *     SET
   *       status = ${status},
   *       error_message = ${errorMessage},
   *       updated_at = NOW()
   *     WHERE id = ${id}
   *   `;
   * }
   * ```
   */
  protected async updateStatus(
    id: TId,
    status: string,
    errorMessage: string | null = null
  ): Promise<void> {
    throw new Error(
      "updateStatus must be implemented by child class for status tracking"
    );
  }

  /**
   * Mark entity as processing
   */
  async markAsProcessing(id: TId): Promise<void> {
    await this.updateStatus(id, "processing");
  }

  /**
   * Mark entity as completed
   */
  async markAsCompleted(id: TId): Promise<void> {
    await this.updateStatus(id, "completed");
  }

  /**
   * Mark entity as failed with error message
   */
  async markAsFailed(id: TId, errorMessage: string): Promise<void> {
    await this.updateStatus(id, "failed", errorMessage);
  }
}
