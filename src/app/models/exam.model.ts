import mongoose, { Schema } from "mongoose";
import { IExam, IExamMark } from "../types/exam.types";

const ExamMarkSchema = new Schema<IExamMark>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    marksObtained: { type: Number, required: true },
    outOf: { type: Number },
    grade: { type: String },
    remark: { type: String },
  },
  { _id: false }
);

const ExamSchema = new Schema<IExam>(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    durationInMinutes: { type: Number },
    totalMarks: { type: Number },
    marks: { type: [ExamMarkSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ExamSchema.index({ batch: 1, name: 1 }, { unique: true });

export const ExamModel = mongoose.model<IExam>("Exam", ExamSchema);
