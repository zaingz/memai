import { Header, Gateway, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import log from "encore.dev/log";
import { TokenService } from "./services/token.service";

/**
 * AuthParams defines the authentication parameters
 * We extract the Authorization header containing the JWT token
 */
interface AuthParams {
  authorization: Header<"Authorization">;
}

/**
 * AuthData defines the authenticated user information returned by the auth handler
 * NOTE: userID must be a string per Encore.ts requirements
 */
interface AuthData {
  userID: string;
  email: string;
}

/**
 * Auth handler that validates JWT tokens
 * Called automatically by Encore for endpoints with auth: true
 */
export const auth = authHandler<AuthParams, AuthData>(
  async (params) => {
    const tokenService = new TokenService();

    try {
      // Extract token from "Bearer <token>" format
      const token = tokenService.extractTokenFromHeader(params.authorization);

      // Validate and decode JWT token
      const payload = tokenService.validateToken(token);

      const authData = {
        userID: String(payload.userID),
        email: payload.email,
      };

      log.info("User authenticated successfully", {
        userID: payload.userID,
        email: payload.email,
        returning: JSON.stringify(authData),
      });

      return authData;
    } catch (error) {
      log.warn("Authentication failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Throw unauthenticated error to reject the request
      throw APIError.unauthenticated(
        error instanceof Error ? error.message : "Authentication failed"
      );
    }
  }
);

/**
 * Gateway configuration with auth handler
 * This makes the auth handler available to all services in the application
 */
export const gateway = new Gateway({
  authHandler: auth,
});
