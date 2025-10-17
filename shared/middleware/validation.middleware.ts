import { APIError } from "encore.dev/api";

/**
 * Validation middleware
 *
 * Provides request validation with clear error messages
 */

export type ValidationRule<T> = (value: T) => string | null;

/**
 * Validates required fields
 *
 * @example
 * export const create = api(
 *   { expose: true, method: "POST", path: "/bookmarks", auth: true },
 *   withAuth(async (req, auth) => {
 *     validateRequired(req, ["url", "client_time"], "bookmark creation");
 *     return await bookmarkRepo.create(req);
 *   })
 * );
 */
export function validateRequired<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  operation: string
): void {
  const missing = fields.filter((field) => {
    const value = obj[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw APIError.invalidArgument(
      `${operation} requires: ${missing.join(", ")}`
    );
  }
}

/**
 * Validates at least one field is provided
 */
export function validateAtLeastOne<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  operation: string
): void {
  const provided = fields.some((field) => {
    const value = obj[field];
    return value !== undefined && value !== null;
  });

  if (!provided) {
    throw APIError.invalidArgument(
      `${operation} requires at least one of: ${fields.join(", ")}`
    );
  }
}

/**
 * Validates a field matches a pattern
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  exampleFormat: string
): void {
  if (!pattern.test(value)) {
    throw APIError.invalidArgument(
      `Invalid ${fieldName} format. Expected: ${exampleFormat}`
    );
  }
}

/**
 * Validates a field is within a range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw APIError.invalidArgument(
      `${fieldName} must be between ${min} and ${max}`
    );
  }
}

/**
 * Validates pagination parameters
 */
export function validatePagination(params: {
  limit?: number;
  offset?: number;
}): { limit: number; offset: number } {
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  if (limit < 1 || limit > 100) {
    throw APIError.invalidArgument("limit must be between 1 and 100");
  }

  if (offset < 0) {
    throw APIError.invalidArgument("offset must be >= 0");
  }

  return { limit, offset };
}
