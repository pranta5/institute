import { Document, Types } from "mongoose";
import { IUser } from "./user.types";
import { IBatch } from "./batches.types";

type ObjectId = Types.ObjectId;

export interface IAttendanceRecord {
  student: ObjectId | IUser;
  status: "present" | "absent" | "leave" | "late";
  remark?: string;
  markedBy?: ObjectId | IUser; // teacher who marked
}
export interface IAttendance extends Document {
  batch: ObjectId | IBatch;
  date: Date;
  session?: string; // e.g. "session-1" or "morning"
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}
