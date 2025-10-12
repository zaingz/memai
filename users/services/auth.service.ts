import bcrypt from "bcrypt";
import log from "encore.dev/log";
import { AUTH_CONFIG } from "../config/auth.config";
import { TokenService } from "./token.service";
import { UserRepository } from "../repositories/user.repository";
import { User, toSafeUser, SafeUser } from "../types";

/**
 * AuthService handles authentication logic including:
 * - Password hashing and validation
 * - User signup and login
 * - Token generation
 */
export class AuthService {
  private tokenService: TokenService;

  constructor(private readonly userRepo: UserRepository) {
    this.tokenService = new TokenService();
  }

  /**
   * Hash a plain text password using bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password Plain text password
   * @param hash Hashed password from database
   * @returns true if password matches, false otherwise
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param password Plain text password
   * @throws Error if password is invalid
   */
  validatePassword(password: string): void {
    if (!password || password.length < AUTH_CONFIG.passwordMinLength) {
      throw new Error(
        `Password must be at least ${AUTH_CONFIG.passwordMinLength} characters long`
      );
    }
  }

  /**
   * Validate email format
   * @param email Email address
   * @throws Error if email is invalid
   */
  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }
  }

  /**
   * Register a new user
   * @param email User email
   * @param password Plain text password
   * @param name Optional user name
   * @returns Object with safe user data and JWT token
   * @throws Error if email already exists or validation fails
   */
  async signup(
    email: string,
    password: string,
    name?: string
  ): Promise<{ user: SafeUser; token: string }> {
    // Validate inputs
    this.validateEmail(email);
    this.validatePassword(password);

    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const password_hash = await this.hashPassword(password);

    // Create user
    const user = await this.userRepo.create({
      email,
      password_hash,
      name,
    });

    log.info("User created successfully", {
      userId: user.id,
      email: user.email,
    });

    // Generate JWT token
    const token = this.tokenService.generateToken(user.id, user.email);

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Authenticate a user with email and password
   * @param email User email
   * @param password Plain text password
   * @returns Object with safe user data and JWT token
   * @throws Error if credentials are invalid
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: SafeUser; token: string }> {
    // Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      log.warn("Login attempt with non-existent email", { email });
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(
      password,
      user.password_hash
    );
    if (!isPasswordValid) {
      log.warn("Login attempt with invalid password", {
        userId: user.id,
        email,
      });
      throw new Error("Invalid email or password");
    }

    log.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });

    // Generate JWT token
    const token = this.tokenService.generateToken(user.id, user.email);

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns Safe user data
   * @throws Error if user not found
   */
  async getUserById(userId: number): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return toSafeUser(user);
  }
}
