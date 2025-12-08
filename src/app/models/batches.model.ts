import mongoose, { Schema } from "mongoose";
import { IBatch } from "../types/batches.types";

const BatchSchema = new Schema<IBatch>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    code: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    schedule: { type: String },
    teacher: { type: Schema.Types.ObjectId, ref: "User" },
    capacity: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
BatchSchema.index({ course: 1, name: 1 }, { unique: true }); // optional unique per course

export const BatchModel = mongoose.model<IBatch>("Batch", BatchSchema);
