/**
 * Base interface for entities with timestamps
 */
export interface BaseTimestamps {
  created_at: Date;
  updated_at: Date;
}

/**
 * Base interface for entities with numeric IDs
 */
export interface BaseEntityWithId extends BaseTimestamps {
  id: number;
}

/**
 * Base interface for entities with string IDs (like users)
 */
export interface BaseEntityWithStringId extends BaseTimestamps {
  id: string;
}
