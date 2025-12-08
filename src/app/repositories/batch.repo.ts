import { Types } from "mongoose";
import { BatchModel } from "../models/batches.model";
import { EnrollmentModel } from "../models/enrollments.model";
import { UserModel } from "../models/users.model";

/**
 * BatchRepositories - Handles DB interactions for batches
 * - No populate() used — uses aggregations where necessary
 */
class BatchRepositories {
  /**
   * Create a batch
   */
  async createBatch(data: {
    course: string | Types.ObjectId;
    name: string;
    startDate: Date | string;
    endDate?: Date | string;
    teacher?: string | Types.ObjectId;
    schedule?: string;
    capacity?: number;
    isActive?: boolean;
  }) {
    const payload: any = {
      course: Types.ObjectId.isValid(String(data.course))
        ? new Types.ObjectId(String(data.course))
        : undefined,
      name: String(data.name).trim(),
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      schedule: data.schedule,
      capacity: typeof data.capacity === "number" ? data.capacity : undefined,
      teacher:
        data.teacher && Types.ObjectId.isValid(String(data.teacher))
          ? new Types.ObjectId(String(data.teacher))
          : undefined,
      isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    };

    const batch = await BatchModel.create(payload);
    return batch.toObject();
  }

  /**
   * Update batch by id
   */
  async updateBatch(batchId: string, update: Record<string, any>) {
    if (!Types.ObjectId.isValid(batchId)) return null;
    const payload: any = {};
    const allowed = [
      "name",
      "startDate",
      "endDate",
      "teacher",
      "schedule",
      "capacity",
      "isActive",
    ];
    for (const k of allowed) {
      if (k in update && update[k] !== undefined) {
        if (
          k === "teacher" &&
          update[k] &&
          Types.ObjectId.isValid(String(update[k]))
        ) {
          payload[k] = new Types.ObjectId(String(update[k]));
        } else if ((k === "startDate" || k === "endDate") && update[k]) {
          payload[k] = new Date(update[k]);
        } else payload[k] = update[k];
      }
    }

    await BatchModel.updateOne(
      { _id: new Types.ObjectId(batchId) },
      { $set: payload }
    ).exec();
    return BatchModel.findById(batchId).lean().exec();
  }

  /**
   * Delete batch (hard delete)
   */
  async deleteBatch(batchId: string) {
    if (!Types.ObjectId.isValid(batchId)) return false;
    const res = await BatchModel.deleteOne({
      _id: new Types.ObjectId(batchId),
    }).exec();
    return !!res.deletedCount;
  }

  /**
   * Assign students (array of studentIds) to batch.
   * This will create Enrollment docs for each student for the batch/course if they don't already exist.
   * Returns number of enrollments created and a list of duplicates/skipped.
   */
  async assignStudentsToBatch(batchId: string, studentIds: string[]) {
    if (!Types.ObjectId.isValid(batchId)) throw new Error("Invalid batch id");
    const _batchId = new Types.ObjectId(batchId);

    // fetch batch to get course id
    const batch = await BatchModel.findById(_batchId).lean().exec();
    if (!batch) throw new Error("Batch not found");

    const courseId = batch.course as Types.ObjectId;
    const created: string[] = [];
    const skipped: string[] = [];

    for (const sId of studentIds) {
      if (!Types.ObjectId.isValid(sId)) {
        skipped.push(sId);
        continue;
      }
      const studentOid = new Types.ObjectId(sId);

      // check existing enrollment for same student+course
      const exist = await EnrollmentModel.findOne({
        student: studentOid,
        course: courseId,
      })
        .lean()
        .exec();
      if (exist) {
        // if exists but no batch assigned, optionally update batch — here we skip duplicates
        skipped.push(sId);
        continue;
      }

      await EnrollmentModel.create({
        student: studentOid,
        course: courseId,
        batch: _batchId,
        status: "enrolled",
        enrolledAt: new Date(),
      });

      created.push(sId);
    }

    return { created, skipped };
  }

  /**
   * List batches for a course (or all) with counts: totalStudents (enrolled), assignedTeacher (basic info via lookup)
   * Uses aggregation to join enrollments and optionally teacher info (without populate).
   */
  async listBatches({
    courseId,
    page = 1,
    limit = 20,
  }: {
    courseId?: string;
    page?: number;
    limit?: number;
  }) {
    const skip = Math.max(0, (page - 1) * limit);
    const match: any = {};
    if (courseId) {
      if (!Types.ObjectId.isValid(courseId))
        return { batches: [], total: 0, page, limit };
      match.course = new Types.ObjectId(courseId);
    }

    const pipeline: any[] = [];
    if (Object.keys(match).length) pipeline.push({ $match: match });

    pipeline.push(
      // lookup enrollments to count students
      {
        $lookup: {
          from: EnrollmentModel.collection.name,
          localField: "_id",
          foreignField: "batch",
          as: "enrollments",
        },
      },
      // optionally lookup teacher (basic)
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: "teacher",
          foreignField: "_id",
          as: "teacherData",
        },
      },
      { $unwind: { path: "$teacherData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          course: 1,
          startDate: 1,
          endDate: 1,
          schedule: 1,
          capacity: 1,
          isActive: 1,
          totalStudents: { $size: { $ifNull: ["$enrollments", []] } },
          teacher: {
            _id: "$teacherData._id",
            name: "$teacherData.name",
            email: "$teacherData.email",
          },
        },
      },
      { $sort: { startDate: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const batches = await BatchModel.aggregate(pipeline).exec();
    const total = await BatchModel.countDocuments(match);

    return { batches, total, page, limit };
  }

  /**
   * Get single batch with enrolled student count and minimal enrolled list if needed
   */
  async getBatch(batchId: string) {
    if (!Types.ObjectId.isValid(batchId)) return null;
    const _id = new Types.ObjectId(batchId);

    const pipeline = [
      { $match: { _id } },
      {
        $lookup: {
          from: EnrollmentModel.collection.name,
          localField: "_id",
          foreignField: "batch",
          as: "enrollments",
        },
      },
      {
        $lookup: {
          from: UserModel.collection.name,
          localField: "teacher",
          foreignField: "_id",
          as: "teacherData",
        },
      },
      { $unwind: { path: "$teacherData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          course: 1,
          startDate: 1,
          endDate: 1,
          schedule: 1,
          capacity: 1,
          isActive: 1,
          totalStudents: { $size: { $ifNull: ["$enrollments", []] } },
          teacher: {
            _id: "$teacherData._id",
            name: "$teacherData.name",
            email: "$teacherData.email",
          },
        },
      },
    ];

    const [batch] = await BatchModel.aggregate(pipeline).exec();
    return batch || null;
  }
}

export const batchRepositories = new BatchRepositories();
