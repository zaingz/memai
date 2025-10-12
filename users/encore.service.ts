import { Service } from "encore.dev/service";

/**
 * Users service handles authentication and user management
 *
 * Provides:
 * - User signup and login
 * - JWT-based authentication
 * - Auth handler for protected endpoints
 * - User profile management
 */
export default new Service("users");
