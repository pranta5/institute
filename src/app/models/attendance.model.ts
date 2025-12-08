import mongoose, { Schema } from "mongoose";
import { IAttendance, IAttendanceRecord } from "../types/attendance.types";

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "leave", "late"],
      required: true,
      default: "present",
    },
    remark: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    session: { type: String },
    records: { type: [AttendanceRecordSchema], default: [] },
  },
  { timestamps: true }
);
AttendanceSchema.index({ batch: 1, date: 1, session: 1 }, { unique: true }); // one attendance per batch/date/session

export const AttendanceModel = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema
);
