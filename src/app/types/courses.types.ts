import { Document, Types } from "mongoose";
type ObjectId = Types.ObjectId;
export interface ICourse extends Document {
  title: string;
  description?: string;
  duration?: string;
  fees?: number;
  createdBy?: ObjectId; // admin who created
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
