import mongoose, { Schema } from "mongoose";
import { IEnrollment } from "../types/enrollments.types";

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    batch: { type: Schema.Types.ObjectId, ref: "Batch" }, // optional
  },
  { timestamps: true }
);
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true }); // prevent duplicate enrollments

export const EnrollmentModel = mongoose.model<IEnrollment>(
  "Enrollment",
  EnrollmentSchema
);
