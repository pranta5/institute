import { Document, Types } from "mongoose";
import { IUser } from "./user.types";
import { IBatch } from "./batches.types";
type ObjectId = Types.ObjectId;

export interface IExamMark {
  student: ObjectId | IUser;
  marksObtained: number;
  outOf?: number;
  grade?: string;
  remark?: string;
}
export interface IExam extends Document {
  batch: ObjectId | IBatch;
  name: string;
  description?: string;
  date: Date;
  durationInMinutes?: number;
  totalMarks?: number;
  marks: IExamMark[];
  createdBy?: ObjectId | IUser; // teacher/admin
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
