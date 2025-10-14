/**
 * API Client Utility for Testing
 *
 * Provides helper functions for making service-to-service calls to Encore endpoints
 * during tests. Uses Encore's generated test clients for type-safe, database-isolated testing.
 *
 * This approach:
 * - Uses Encore's test database (not dev database)
 * - No need to run `encore run` during tests
 * - Better test isolation
 * - Type-safe service calls
 */

import * as usersTestClient from "../../encore.gen/internal/clients/users/endpoints_testing";
import * as bookmarksTestClient from "../../encore.gen/internal/clients/bookmarks/endpoints_testing";
import { decodeJwt } from "jose";
import type { CallOpts } from "encore.dev/api";
import type { AuthData } from "../../encore.gen/internal/auth/auth";
import { APIError } from "encore.dev/api";

/**
 * Decode JWT token and extract AuthData
 * This extracts the user ID and email from the JWT payload without verification
 * since we're using service-to-service calls that bypass the HTTP auth handler
 *
 * @throws Error if token is invalid or empty
 */
function decodeAuthData(token: string): AuthData {
  // Validate token is not empty
  if (!token || token.trim() === "") {
    throw APIError.unauthenticated("No authentication token provided");
  }

  try {
    const payload = decodeJwt(token);
    return {
      userID: payload.sub || "",
      email: (payload.email as string) || "",
    };
  } catch (error) {
    throw APIError.unauthenticated("Invalid authentication token");
  }
}

/**
 * Create CallOpts with auth data from JWT token
 */
function createAuthOpts(token: string): CallOpts {
  return {
    authData: decodeAuthData(token),
  };
}

/**
 * User API endpoints using service-to-service calls
 */
export const userApi = {
  /**
   * Get current user profile
   * Calls: GET /users/me
   */
  async getMe(token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await usersTestClient.me(undefined, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      // Map Encore APIError codes to HTTP status codes
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Update current user profile
   * Calls: PATCH /users/me
   */
  async updateMe(data: { name?: string }, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await usersTestClient.updateProfile(data, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },
};

/**
 * Webhook API endpoints using service-to-service calls
 */
export const webhookApi = {
  /**
   * Trigger user created webhook
   * Calls: POST /webhooks/auth/user-created
   */
  async userCreated(payload: any) {
    try {
      const result = await usersTestClient.userCreated(payload);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },
};

/**
 * Bookmark API endpoints using service-to-service calls
 */
export const bookmarkApi = {
  /**
   * Create a new bookmark
   * Calls: POST /bookmarks
   */
  async create(data: any, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.create(data, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Get a bookmark by ID
   * Calls: GET /bookmarks/:id
   */
  async get(id: number, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.get({ id }, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * List bookmarks with pagination and filtering
   * Calls: GET /bookmarks
   */
  async list(params: any, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.list(params, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Update a bookmark
   * Calls: PUT /bookmarks/:id
   */
  async update(id: number, data: any, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.update(
        { id, ...data },
        callOpts
      );
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Delete a bookmark
   * Calls: DELETE /bookmarks/:id
   */
  async delete(id: number, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.remove({ id }, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Get bookmark details with transcription
   * Calls: GET /bookmarks/:id/details
   */
  async getDetails(id: number, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.getDetails({ id }, callOpts);
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },
};

/**
 * Daily Digest API endpoints using service-to-service calls
 */
export const dailyDigestApi = {
  /**
   * Generate daily digest
   * Calls: POST /digests/generate
   */
  async generate(params: any, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.generateDailyDigest(
        params,
        callOpts
      );
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * Get daily digest for a specific date
   * Calls: GET /digests/:date
   */
  async get(date: string, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.getDailyDigest(
        { date },
        callOpts
      );
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },

  /**
   * List daily digests with pagination
   * Calls: GET /digests
   */
  async list(params: any, token: string) {
    try {
      const callOpts =
        token && token.trim() !== "" ? createAuthOpts(token) : undefined;
      const result = await bookmarksTestClient.listDailyDigests(
        params,
        callOpts
      );
      return {
        status: 200,
        data: result,
      };
    } catch (error: any) {
      const status = mapErrorToStatus(error);
      return {
        status,
        error: {
          code: error.code || "unknown",
          message: error.message || String(error),
        },
      };
    }
  },
};

/**
 * Map Encore APIError codes to HTTP status codes
 * This maintains compatibility with existing tests that expect HTTP status codes
 */
function mapErrorToStatus(error: any): number {
  if (!error || typeof error !== "object") {
    return 500;
  }

  // Handle Encore APIError
  if (error instanceof APIError || error.code) {
    const code = error.code;
    switch (code) {
      case "unauthenticated":
        return 401;
      case "permission_denied":
        return 403;
      case "not_found":
        return 404;
      case "invalid_argument":
        return 400;
      case "already_exists":
        return 409;
      case "resource_exhausted":
        return 429;
      case "failed_precondition":
        return 412;
      case "aborted":
        return 409;
      case "out_of_range":
        return 400;
      case "unimplemented":
        return 501;
      case "unavailable":
        return 503;
      case "deadline_exceeded":
        return 504;
      default:
        return 500;
    }
  }

  return 500;
}

/**
 * Assert that API response is successful (2xx status)
 */
export function assertSuccess(response: { status: number; error?: any }) {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Expected successful response but got ${response.status}: ${JSON.stringify(response.error)}`
    );
  }
}

/**
 * Assert that API response failed with expected status
 */
export function assertError(
  response: { status: number },
  expectedStatus: number
) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}`
    );
  }
}

// Backward compatibility exports for generic API functions
// These are less commonly used in tests, but kept for compatibility

/**
 * Generic API request (not recommended - use userApi or webhookApi instead)
 * @deprecated Use userApi.getMe() or userApi.updateMe() instead
 */
export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
  } = {}
): Promise<{
  status: number;
  data?: T;
  error?: any;
  headers?: any;
}> {
  // For service-to-service calls, we route based on path
  // This is a simplified implementation for backward compatibility
  const { method = "GET", body, token } = options;

  try {
    if (path === "/users/me") {
      if (method === "GET") {
        return (await userApi.getMe(token || "")) as any;
      } else if (method === "PATCH") {
        return (await userApi.updateMe(body, token || "")) as any;
      }
    } else if (path === "/webhooks/auth/user-created") {
      if (method === "POST") {
        return (await webhookApi.userCreated(body)) as any;
      }
    }

    // Unknown endpoint
    return {
      status: 404,
      error: "Endpoint not found in service-to-service client",
    };
  } catch (error: any) {
    return {
      status: mapErrorToStatus(error),
      error: error.message || error,
    };
  }
}

/**
 * @deprecated Use userApi.getMe() instead
 */
export async function apiGet<T = any>(
  path: string,
  token?: string
): Promise<{ status: number; data?: T; error?: any }> {
  return apiRequest<T>(path, { method: "GET", token });
}

/**
 * @deprecated Use webhookApi.userCreated() or userApi methods instead
 */
export async function apiPost<T = any>(
  path: string,
  body: any,
  token?: string
): Promise<{ status: number; data?: T; error?: any }> {
  return apiRequest<T>(path, { method: "POST", body, token });
}

/**
 * @deprecated Use userApi.updateMe() instead
 */
export async function apiPatch<T = any>(
  path: string,
  body: any,
  token?: string
): Promise<{ status: number; data?: T; error?: any }> {
  return apiRequest<T>(path, { method: "PATCH", body, token });
}

/**
 * @deprecated Not implemented for service-to-service calls
 */
export async function apiDelete<T = any>(
  path: string,
  token?: string
): Promise<{ status: number; data?: T; error?: any }> {
  return {
    status: 501,
    error: "DELETE not implemented in service-to-service client",
  };
}

/**
 * @deprecated Not needed for service-to-service calls (no server required)
 */
export async function waitForApiReady(
  maxAttempts = 10,
  delayMs = 500
): Promise<boolean> {
  // For service-to-service calls, we don't need to wait for a server
  // Return true immediately
  return true;
}
