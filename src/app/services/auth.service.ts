import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

class AuthService {
  private jwtSecret: string;
  private jwtIssuer: string;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error(" Missing JWT_SECRET environment variable!");
    }
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtIssuer = process.env.JWT_ISSUER || "institute-system";
  }

  // 🔹 Hash a plain password
  async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // 🔹 Compare plain password with hashed password
  async compare(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
  }

  // 🔹 Sign JWT token
  async signJwt(
    payload: Record<string, any>,
    options: SignOptions = {}
  ): Promise<string> {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: options.expiresIn || "7d",
      issuer: this.jwtIssuer,
    });
  }

  // 🔹 Verify JWT token
  async verifyJwt<T = any>(token: string): Promise<T> {
    try {
      return jwt.verify(token, this.jwtSecret) as T;
    } catch (err) {
      throw new Error("Invalid or expired token");
    }
  }

  // 🔹 Decode JWT (no validation, for debug/log only)
  decodeJwt<T = any>(token: string): T | null {
    try {
      return jwt.decode(token) as T;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
