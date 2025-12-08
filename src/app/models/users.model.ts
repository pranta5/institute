import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/user.types";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true }, // store hashed password
    role: {
      type: String,
      required: true,
      enum: ["admin", "teacher", "student"],
      default: "student",
    },
    avatarUrl: { type: String },
    phone: { type: String },
    address: { type: String },
    dob: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);
export const UserModel = mongoose.model<IUser>("User", UserSchema);
