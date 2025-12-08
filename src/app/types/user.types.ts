import { Document, Types } from "mongoose";
type ObjectId = Types.ObjectId;

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "teacher" | "student" | string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  dob?: Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
