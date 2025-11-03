import { SafeUser } from "./domain.types";

// ============================================
// Authentication API Request/Response Types
// ============================================

/**
 * Request body for user signup
 */
export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

/**
 * Response for successful signup
 */
export interface SignupResponse {
  user: SafeUser;
  token: string;
}

/**
 * Request body for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response for successful login
 */
export interface LoginResponse {
  user: SafeUser;
  token: string;
}

/**
 * Response for get current user endpoint
 */
export interface MeResponse {
  user: SafeUser;
}

/**
 * Request body for updating user profile
 */
export interface UpdateProfileRequest {
  name?: string | null;
}

/**
 * Response for profile update
 */
export interface UpdateProfileResponse {
  user: SafeUser;
}

/**
 * Response for get all user IDs endpoint
 * Used for service-to-service calls (e.g., cron jobs generating per-user data)
 */
export interface GetUserIdsResponse {
  userIds: string[];
}
