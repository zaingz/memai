import log from "encore.dev/log";
import { APIError } from "encore.dev/api";

/**
 * Error handling middleware
 *
 * Wraps handlers with consistent error logging and transformation
 */

export type ErrorHandler<TRequest, TResponse> = (
  req: TRequest
) => Promise<TResponse>;

/**
 * Wraps a handler with error handling
 * Logs errors with context and converts unknown errors to APIError
 *
 * @example
 * export const create = api(
 *   { expose: true, method: "POST", path: "/bookmarks", auth: true },
 *   withErrorHandling(async (req) => {
 *     // Any errors thrown here are logged and converted to APIError
 *     return await bookmarkRepo.create(req);
 *   }, "create-bookmark")
 * );
 */
export function withErrorHandling<TRequest, TResponse>(
  handler: ErrorHandler<TRequest, TResponse>,
  operationName: string
): ErrorHandler<TRequest, TResponse> {
  return async (req: TRequest): Promise<TResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      // If it's already an APIError, rethrow
      if (error instanceof APIError) {
        log.error(error, `${operationName} failed`, { request: req });
        throw error;
      }

      // Convert unknown errors to APIError.internal
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.error(error, `${operationName} failed with unexpected error`, {
        request: req,
        errorMessage,
      });

      throw APIError.internal(`${operationName} failed: ${errorMessage}`);
    }
  };
}

/**
 * Utility to create common API errors with logging
 */
export const createAPIError = {
  notFound: (resource: string, id: number | string): never => {
    throw APIError.notFound(`${resource} with id ${id} not found`);
  },

  invalidArgument: (message: string): never => {
    throw APIError.invalidArgument(message);
  },

  unauthenticated: (message: string = "Authentication required"): never => {
    throw APIError.unauthenticated(message);
  },

  permissionDenied: (message: string = "Permission denied"): never => {
    throw APIError.permissionDenied(message);
  },

  internal: (message: string): never => {
    throw APIError.internal(message);
  },
};

/**
 * MIDDLEWARE COMPOSITION EXAMPLES
 *
 * Example 1: Auth + Error Handling
 * export const create = api(
 *   { expose: true, method: "POST", path: "/bookmarks", auth: true },
 *   withAuth(
 *     withErrorHandling(async (req, auth) => {
 *       return await bookmarkRepo.create({ ...req, userId: auth.userID });
 *     }, "create-bookmark")
 *   )
 * );
 *
 * Example 2: Auth + Validation + Error Handling
 * export const create = api(
 *   { expose: true, method: "POST", path: "/bookmarks", auth: true },
 *   withAuth(
 *     withErrorHandling(async (req, auth) => {
 *       validateRequired(req, ["url", "client_time"], "bookmark creation");
 *       return await bookmarkRepo.create({ ...req, userId: auth.userID });
 *     }, "create-bookmark")
 *   )
 * );
 *
 * Example 3: Admin + Validation
 * export const generateDigest = api(
 *   { expose: true, method: "POST", path: "/admin/digests", auth: true },
 *   withAdmin(async (req, auth) => {
 *     if (req.date) {
 *       validatePattern(req.date, /^\d{4}-\d{2}-\d{2}$/, "date", "YYYY-MM-DD");
 *     }
 *     return await digestService.generate(auth.userID, req.date);
 *   })
 * );
 */
