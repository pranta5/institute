import { Types } from "mongoose";
import { AttendanceModel } from "../models/attendance.model";
import { EnrollmentModel } from "../models/enrollments.model";

/**
 * AttendanceRepositories
 */
class AttendanceRepositories {
  /**
   * Mark attendance for a batch on a specific date/session.
   * - records: Array<{ student: string, status: 'present'|'absent'|'leave'|'late', remark?: string }>
   * - Upserts the attendance document for batch+date+session
   */
  async markAttendance(params: {
    batchId: string | Types.ObjectId;
    date: string | Date; // date string or Date
    session?: string;
    records: Array<{
      student: string | Types.ObjectId;
      status: "present" | "absent" | "leave" | "late";
      remark?: string;
    }>;
    markedBy: string | Types.ObjectId;
  }) {
    if (!Types.ObjectId.isValid(String(params.batchId)))
      throw new Error("Invalid batch id");
    const batchOid = new Types.ObjectId(String(params.batchId));
    const session = params.session ?? "default";
    const dateOnly = new Date(params.date);
    dateOnly.setHours(0, 0, 0, 0); // normalize to date-only for uniqueness

    // Build records normalized
    const normalized = params.records
      .filter((r) => Types.ObjectId.isValid(String(r.student)))
      .map((r) => ({
        student: new Types.ObjectId(String(r.student)),
        status: r.status,
        remark: r.remark ?? "",
        markedBy: Types.ObjectId.isValid(String(params.markedBy))
          ? new Types.ObjectId(String(params.markedBy))
          : undefined,
      }));

    // Upsert: one attendance doc per batch + date + session
    const res = await AttendanceModel.findOneAndUpdate(
      { batch: batchOid, date: dateOnly, session },
      {
        $set: { records: normalized, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    )
      .lean()
      .exec();

    return res;
  }

  /**
   * Get attendance records for a student (optionally filter by course/batch/date range)
   * - returns list of attendance docs where student appears in records
   */
  async getAttendanceByStudent({
    studentId,
    batchId,
    dateFrom,
    dateTo,
  }: {
    studentId: string | Types.ObjectId;
    batchId?: string;
    dateFrom?: string | Date;
    dateTo?: string | Date;
  }) {
    const sid = new Types.ObjectId(String(studentId));
    const match: any = { "records.student": sid };
    if (batchId && Types.ObjectId.isValid(batchId))
      match.batch = new Types.ObjectId(batchId);
    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        match.date.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        match.date.$lte = d;
      }
    }

    const pipeline = [
      { $match: match },
      { $project: { batch: 1, date: 1, session: 1, records: 1 } },
      { $sort: { date: -1 } },
    ];
    const rows = await AttendanceModel.aggregate(pipeline as any[]).exec();
    return rows;
  }

  /**
   * Get attendance summary for a batch (percentage per student) within an optional date range.
   * Returns array: [{ student: ObjectId, totalSessions, presentCount, percentage }]
   */
  async getBatchAttendanceSummary({
    batchId,
    dateFrom,
    dateTo,
  }: {
    batchId: string | Types.ObjectId;
    dateFrom?: string | Date;
    dateTo?: string | Date;
  }) {
    if (!Types.ObjectId.isValid(String(batchId)))
      throw new Error("Invalid batch id");
    const match: any = { batch: new Types.ObjectId(String(batchId)) };

    if (dateFrom || dateTo) {
      match.date = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        match.date.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        match.date.$lte = d;
      }
    }

    // Unwind records and compute counts
    const pipeline = [
      { $match: match },
      { $unwind: "$records" },
      {
        $group: {
          _id: "$records.student",
          totalSessions: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          student: "$_id",
          totalSessions: 1,
          presentCount: 1,
          percentage: {
            $cond: [
              { $eq: ["$totalSessions", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$presentCount", "$totalSessions"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      { $sort: { percentage: -1 } },
    ];

    const summary = await AttendanceModel.aggregate(pipeline as any[]).exec();
    return summary;
  }

  /**
   * Get attendance documents for a batch (paginated)
   */
  async getAttendanceByBatch({
    batchId,
    page = 1,
    limit = 50,
  }: {
    batchId: string | Types.ObjectId;
    page?: number;
    limit?: number;
  }) {
    if (!Types.ObjectId.isValid(String(batchId)))
      return { rows: [], total: 0, page, limit };
    const _batch = new Types.ObjectId(String(batchId));
    const skip = Math.max(0, (page - 1) * limit);

    const pipeline = [
      { $match: { batch: _batch } },
      { $project: { batch: 1, date: 1, session: 1, records: 1, createdAt: 1 } },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const rows = await AttendanceModel.aggregate(pipeline as any[]).exec();
    const total = await AttendanceModel.countDocuments({ batch: _batch });

    return { rows, total, page, limit };
  }
}

export const attendanceRepositories = new AttendanceRepositories();
