import { secret } from "encore.dev/config";

/**
 * JWT Secret from Encore secrets
 * Must be set via: encore secret set --type local JWTSecret
 */
const jwtSecret = secret("JWTSecret");

/**
 * Authentication configuration
 * Centralized config for JWT and password hashing settings
 */
export const AUTH_CONFIG = {
  /**
   * JWT secret key for signing and verifying tokens
   * Retrieved from Encore secrets for security
   */
  jwtSecret: () => jwtSecret(),

  /**
   * JWT token expiration time
   * 7 days = 604800 seconds
   */
  jwtExpiresIn: "7d",

  /**
   * Bcrypt salt rounds for password hashing
   * Higher = more secure but slower
   * 10 is a good balance for production
   */
  bcryptRounds: 10,

  /**
   * Password validation requirements
   */
  passwordMinLength: 8,
} as const;
