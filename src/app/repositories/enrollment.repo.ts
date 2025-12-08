import { Types } from "mongoose";
import { EnrollmentModel } from "../models/enrollments.model";
import { CourseModel } from "../models/courses.model";
import { BatchModel } from "../models/batches.model";

/**
 * EnrollmentRepositories
 */
class EnrollmentRepositories {
  /**
   * Enroll a student into a course (optionally into a batch)
   * - prevents duplicate enrollments for same course+student
   */
  async enrollStudent(payload: {
    studentId: string | Types.ObjectId;
    courseId: string | Types.ObjectId;
    batchId?: string | Types.ObjectId | null;
  }) {
    const studentOid = new Types.ObjectId(String(payload.studentId));
    const courseOid = new Types.ObjectId(String(payload.courseId));
    const batchOid = payload.batchId
      ? new Types.ObjectId(String(payload.batchId))
      : undefined;

    // Ensure course exists
    const courseExists = await CourseModel.exists({ _id: courseOid });
    if (!courseExists) throw new Error("Course not found");

    // If batch provided, ensure batch exists and matches course
    if (batchOid) {
      const batch = await BatchModel.findById(batchOid).lean().exec();
      if (!batch) throw new Error("Batch not found");
      if (String(batch.course) !== String(courseOid))
        throw new Error("Batch does not belong to the given course");
    }

    // Prevent duplicate enrollment (same student + course)
    const existing = await EnrollmentModel.findOne({
      student: studentOid,
      course: courseOid,
    })
      .lean()
      .exec();
    if (existing) {
      // If existing but batch not set and batchOid provided, optionally update batch
      if (!existing.batch && batchOid) {
        await EnrollmentModel.updateOne(
          { _id: existing._id },
          { $set: { batch: batchOid } }
        ).exec();
        return { updated: true, enrollmentId: String(existing._id) };
      }
      return {
        skipped: true,
        message: "Student already enrolled in this course",
      };
    }

    const created = await EnrollmentModel.create({
      student: studentOid,
      course: courseOid,
      batch: batchOid,
      status: "enrolled",
      enrolledAt: new Date(),
    });

    return { created: true, enrollmentId: String(created._id) };
  }

  /**
   * Get enrollments by student (optionally filter by course or batch)
   */
  async getEnrollmentsByStudent({
    studentId,
    courseId,
    batchId,
  }: {
    studentId: string | Types.ObjectId;
    courseId?: string;
    batchId?: string;
  }) {
    const match: any = { student: new Types.ObjectId(String(studentId)) };
    if (courseId && Types.ObjectId.isValid(courseId))
      match.course = new Types.ObjectId(String(courseId));
    if (batchId && Types.ObjectId.isValid(batchId))
      match.batch = new Types.ObjectId(String(batchId));

    // Use aggregation to return course/batch ids (no populate)
    const pipeline = [
      { $match: match },
      { $sort: { enrolledAt: -1 } },
      {
        $project: {
          student: 1,
          course: 1,
          batch: 1,
          status: 1,
          enrolledAt: 1,
          feesPaid: 1,
        },
      },
    ];
    const rows = await EnrollmentModel.aggregate(pipeline as any[]).exec();
    return rows;
  }

  /**
   * Count students enrolled in a batch
   */
  async countEnrolledInBatch(batchId: string) {
    if (!Types.ObjectId.isValid(batchId)) return 0;
    const count = await EnrollmentModel.countDocuments({
      batch: new Types.ObjectId(batchId),
      status: "enrolled",
    });
    return count;
  }
}

export const enrollmentRepositories = new EnrollmentRepositories();
