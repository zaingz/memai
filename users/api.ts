import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import log from "encore.dev/log";
import { db } from "./db";
import { UserRepository } from "./repositories/user.repository";
import { AuthService } from "./services/auth.service";
import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from "./types";

// Initialize repositories and services
const userRepo = new UserRepository(db);
const authService = new AuthService(userRepo);

/**
 * User Signup Endpoint
 * Creates a new user account and returns a JWT token
 *
 * POST /users/signup
 * Body: { email, password, name? }
 * Returns: { user: SafeUser, token: string }
 */
export const signup = api(
  { expose: true, method: "POST", path: "/users/signup" },
  async (req: SignupRequest): Promise<SignupResponse> => {
    // Validate required fields
    if (!req.email || !req.password) {
      throw APIError.invalidArgument("email and password are required");
    }

    try {
      const result = await authService.signup(
        req.email,
        req.password,
        req.name
      );

      log.info("User signup successful", {
        userId: result.user.id,
        email: result.user.email,
      });

      return result;
    } catch (error) {
      log.error(error, "User signup failed", {
        email: req.email,
      });

      // Check for specific error types
      const errorMessage =
        error instanceof Error ? error.message : "Signup failed";

      if (errorMessage.includes("already exists")) {
        throw APIError.alreadyExists(errorMessage);
      } else if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("must be")
      ) {
        throw APIError.invalidArgument(errorMessage);
      } else {
        throw APIError.internal(errorMessage);
      }
    }
  }
);

/**
 * User Login Endpoint
 * Authenticates a user and returns a JWT token
 *
 * POST /users/login
 * Body: { email, password }
 * Returns: { user: SafeUser, token: string }
 */
export const login = api(
  { expose: true, method: "POST", path: "/users/login" },
  async (req: LoginRequest): Promise<LoginResponse> => {
    // Validate required fields
    if (!req.email || !req.password) {
      throw APIError.invalidArgument("email and password are required");
    }

    try {
      const result = await authService.login(req.email, req.password);

      log.info("User login successful", {
        userId: result.user.id,
        email: result.user.email,
      });

      return result;
    } catch (error) {
      log.error(error, "User login failed", {
        email: req.email,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Login failed";

      // Don't reveal whether email exists or password is wrong
      // Always return the same generic error message
      throw APIError.unauthenticated("Invalid email or password");
    }
  }
);

/**
 * Get Current User Endpoint
 * Returns the currently authenticated user's information
 *
 * GET /users/me
 * Headers: Authorization: Bearer <token>
 * Returns: { user: SafeUser }
 */
export const me = api(
  { expose: true, method: "GET", path: "/users/me", auth: true },
  async (): Promise<MeResponse> => {
    // Get authenticated user data from auth handler
    const auth = getAuthData();

    if (!auth) {
      throw APIError.unauthenticated("Authentication required");
    }

    try {
      // Convert string userID back to number for database query
      const userId = parseInt(auth.userID, 10);
      const user = await authService.getUserById(userId);

      log.info("User fetched current user info", {
        userId: user.id,
      });

      return { user };
    } catch (error) {
      log.error(error, "Failed to fetch current user", {
        userId: auth.userID,
      });

      throw APIError.notFound("User not found");
    }
  }
);
