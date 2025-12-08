import mongoose, { Schema } from "mongoose";

import { ICourse } from "../types/courses.types";
const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, index: true },
    description: { type: String },
    duration: { type: String },
    fees: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CourseModel = mongoose.model<ICourse>("Course", CourseSchema);
