import { Service } from "encore.dev/service";

// Import endpoints to register them with Encore
import "./api";
import "./auth";
import "./webhooks";

/**
 * Users service handles authentication and user management
 *
 * Provides:
 * - User signup and login
 * - JWT-based authentication
 * - Auth handler for protected endpoints
 * - User profile management
 * - Supabase auth webhooks
 */
export default new Service("users");
