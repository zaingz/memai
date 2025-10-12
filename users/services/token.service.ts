import jwt from "jsonwebtoken";
import log from "encore.dev/log";
import { AUTH_CONFIG } from "../config/auth.config";
import { TokenPayload } from "../types";

/**
 * TokenService handles JWT token generation and validation
 */
export class TokenService {
  /**
   * Generate a JWT token for a user
   * @param userID User ID
   * @param email User email
   * @returns Signed JWT token
   */
  generateToken(userID: number, email: string): string {
    const payload: TokenPayload = {
      userID,
      email,
    };

    const token = jwt.sign(payload, AUTH_CONFIG.jwtSecret(), {
      expiresIn: AUTH_CONFIG.jwtExpiresIn,
    });

    log.info("JWT token generated", { userID, email });

    return token;
  }

  /**
   * Validate and decode a JWT token
   * @param token JWT token string
   * @returns Decoded token payload with userID and email
   * @throws Error if token is invalid or expired
   */
  validateToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret()) as TokenPayload;

      return {
        userID: decoded.userID,
        email: decoded.email,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        log.warn("JWT token expired", { error: error.message });
        throw new Error("Token has expired");
      } else if (error instanceof jwt.JsonWebTokenError) {
        log.warn("Invalid JWT token", { error: error.message });
        throw new Error("Invalid token");
      } else {
        log.error(error, "JWT token validation failed");
        throw new Error("Token validation failed");
      }
    }
  }

  /**
   * Extract token from Authorization header
   * Expects format: "Bearer <token>"
   * @param authHeader Authorization header value
   * @returns Extracted token
   * @throws Error if header format is invalid
   */
  extractTokenFromHeader(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Invalid Authorization header format. Expected: Bearer <token>");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      throw new Error("No token provided in Authorization header");
    }

    return token;
  }
}
