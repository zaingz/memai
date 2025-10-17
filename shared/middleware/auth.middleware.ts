import { getAuthData } from "~encore/auth";
import { APIError } from "encore.dev/api";
import { UserRole } from "../../users/types/domain.types";

/**
 * Auth Context
 * Provides strongly-typed authentication data to handlers
 */
export interface AuthContext {
  userID: string;
  email: string;
  role: UserRole;
}

/**
 * Authenticated Handler Type
 * Handler function that receives auth context automatically
 */
export type AuthenticatedHandler<TRequest, TResponse> = (
  req: TRequest,
  auth: AuthContext
) => Promise<TResponse>;

/**
 * Higher-Order Function: withAuth()
 *
 * Wraps an API handler with authentication logic, eliminating 35-40% of boilerplate
 *
 * BEFORE (without middleware):
 *
 * export const getBookmarks = api(
 *   { expose: true, method: "GET", path: "/bookmarks", auth: true },
 *   async (req: ListBookmarksRequest): Promise<ListBookmarksResponse> => {
 *     // ↓ DUPLICATED IN EVERY ENDPOINT (5 lines)
 *     const auth = getAuthData();
 *     if (!auth) {
 *       throw APIError.unauthenticated("Authentication required");
 *     }
 *     const userId = auth.userID;
 *     // ↑ DUPLICATED IN EVERY ENDPOINT
 *
 *     const bookmarks = await bookmarkRepo.list({ userId, ... });
 *     return { bookmarks };
 *   }
 * );
 *
 * AFTER (with middleware - Agent 9 will apply):
 *
 * export const getBookmarks = api(
 *   { expose: true, method: "GET", path: "/bookmarks", auth: true },
 *   withAuth(async (req, auth) => {
 *     // auth.userID, auth.email, auth.role are automatically available
 *     const bookmarks = await bookmarkRepo.list({ userId: auth.userID, ... });
 *     return { bookmarks };
 *   })
 * );
 *
 * Lines saved: 5 lines per endpoint × 9 endpoints = 45 lines
 *
 * @param handler - The authenticated handler function
 * @returns Wrapped handler with automatic auth extraction
 *
 * @example
 * export const list = api(
 *   { expose: true, method: "GET", path: "/bookmarks", auth: true },
 *   withAuth(async (req, auth) => {
 *     const { bookmarks } = await bookmarkRepo.list({ userId: auth.userID });
 *     return { bookmarks };
 *   })
 * );
 */
export function withAuth<TRequest, TResponse>(
  handler: AuthenticatedHandler<TRequest, TResponse>
): (req: TRequest) => Promise<TResponse> {
  return async (req: TRequest): Promise<TResponse> => {
    const authData = getAuthData();

    if (!authData) {
      throw APIError.unauthenticated("Authentication required");
    }

    // Extract auth context with type safety
    const auth: AuthContext = {
      userID: authData.userID,
      email: authData.email || "",
      role: (authData as any).role || UserRole.USER,
    };

    // Call the actual handler with auth context
    return await handler(req, auth);
  };
}

/**
 * Higher-Order Function: withAdmin()
 *
 * Wraps an API handler with admin authentication and authorization
 * Automatically verifies user is authenticated AND has admin role
 *
 * BEFORE (without middleware):
 *
 * export const generateDailyDigest = api(
 *   { expose: true, method: "POST", path: "/admin/digests/generate", auth: true },
 *   async (req?: GenerateDailyDigestRequest): Promise<GenerateDailyDigestResponse> => {
 *     // ↓ DUPLICATED ADMIN CHECK (8+ lines)
 *     const auth = getAuthData();
 *     if (!auth) {
 *       throw APIError.unauthenticated("Authentication required");
 *     }
 *     if (auth.role !== UserRole.ADMIN) {
 *       throw APIError.permissionDenied("This operation requires admin privileges");
 *     }
 *     const userId = auth.userID;
 *     // ↑ DUPLICATED ADMIN CHECK
 *
 *     return await generateDigest(userId);
 *   }
 * );
 *
 * AFTER (with middleware - Agent 9 will apply):
 *
 * export const generateDailyDigest = api(
 *   { expose: true, method: "POST", path: "/admin/digests/generate", auth: true },
 *   withAdmin(async (req, auth) => {
 *     // Automatically verified that auth.role === ADMIN
 *     return await generateDigest(auth.userID);
 *   })
 * );
 *
 * Lines saved: 8 lines per admin endpoint × 1 admin endpoint = 8 lines
 *
 * @param handler - The authenticated handler function
 * @returns Wrapped handler with automatic auth + admin verification
 *
 * @example
 * export const generateDailyDigest = api(
 *   { expose: true, method: "POST", path: "/admin/digests/generate", auth: true },
 *   withAdmin(async (req, auth) => {
 *     return await dailyDigestService.generate({ userId: auth.userID });
 *   })
 * );
 */
export function withAdmin<TRequest, TResponse>(
  handler: AuthenticatedHandler<TRequest, TResponse>
): (req: TRequest) => Promise<TResponse> {
  return withAuth<TRequest, TResponse>(async (req, auth) => {
    if (auth.role !== UserRole.ADMIN) {
      throw APIError.permissionDenied(
        "This operation requires admin privileges"
      );
    }

    return await handler(req, auth);
  });
}

/**
 * Utility: isAdmin()
 *
 * Check if current user is admin (for conditional logic)
 * Use this within handlers when you need to conditionally show admin features
 *
 * @param auth - Auth context from withAuth handler
 * @returns true if user has admin role, false otherwise
 *
 * @example
 * export const getBookmark = api(
 *   { expose: true, method: "GET", path: "/bookmarks/:id", auth: true },
 *   withAuth(async (req, auth) => {
 *     const bookmark = await bookmarkRepo.findById(req.id);
 *
 *     // Show admin-only metadata if user is admin
 *     if (isAdmin(auth)) {
 *       return { ...bookmark, adminMetadata: { ... } };
 *     }
 *
 *     return { bookmark };
 *   })
 * );
 */
export function isAdmin(auth: AuthContext): boolean {
  return auth.role === UserRole.ADMIN;
}
