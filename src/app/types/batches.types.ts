import { Document, Types } from "mongoose";
import { ICourse } from "./courses.types";
import { IUser } from "./user.types";
type ObjectId = Types.ObjectId;
export interface IBatch extends Document {
  course: ObjectId | ICourse;
  name: string;
  code?: string;
  startDate: Date;
  endDate?: Date;
  schedule?: string; // e.g. "Mon-Wed-Fri 6-8pm" or structured object if needed
  teacher?: ObjectId | IUser; // assigned teacher
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
