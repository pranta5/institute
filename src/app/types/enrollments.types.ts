import { Document, Types } from "mongoose";
import { IUser } from "./user.types";
import { ICourse } from "./courses.types";
import { IBatch } from "./batches.types";
type ObjectId = Types.ObjectId;
export type EnrollmentStatus =
  | "enrolled"
  | "pending"
  | "cancelled"
  | "completed"
  | "withdrawn";

export interface IEnrollment extends Document {
  student: ObjectId | IUser;
  course: ObjectId | ICourse;
  batch?: ObjectId | IBatch;
  createdAt: Date;
  updatedAt: Date;
}
