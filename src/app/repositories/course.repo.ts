import { Types } from "mongoose";
import { CourseModel } from "../models/courses.model";
import { BatchModel } from "../models/batches.model";
import { EnrollmentModel } from "../models/enrollments.model";
import { ICourse } from "../types/courses.types";

type CreateCourseDto = {
  title: string;
  description?: string;
  duration?: string;
  fees?: number;
  createdBy?: string | Types.ObjectId | null;
  isActive?: boolean;
};

class CourseRepositories {
  async createCourse(data: CreateCourseDto) {
    const course = await CourseModel.create(data);
    return course.toObject();
  }

  async updateCourse(courseId: string, update: Record<string, any>) {
    if (!Types.ObjectId.isValid(courseId)) return null;
    await CourseModel.updateOne(
      { _id: new Types.ObjectId(courseId) },
      { $set: update }
    ).exec();
    return CourseModel.findById(courseId).lean().exec();
  }

  async deleteCourse(courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) return null;
    // Optionally, check/handle cascading deletes: batches & enrollments — here we delete course and return result
    const res = await CourseModel.deleteOne({
      _id: new Types.ObjectId(courseId),
    }).exec();
    return res.deletedCount && res.deletedCount > 0;
  }

  async listCourses({
    page = 1,
    limit = 20,
  }: {
    page?: number;
    limit?: number;
  }) {
    const skip = Math.max(0, (page - 1) * limit);

    const pipeline = [
      // for each course, lookup batches and enrollments counts
      {
        $lookup: {
          from: BatchModel.collection.name,
          localField: "_id",
          foreignField: "course",
          as: "batches",
        },
      },
      {
        $lookup: {
          from: EnrollmentModel.collection.name,
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      // project useful fields and computed counts
      {
        $project: {
          title: 1,
          description: 1,
          duration: 1,
          fees: 1,
          createdAt: 1,
          updatedAt: 1,
          totalBatches: { $size: { $ifNull: ["$batches", []] } },
          totalEnrollments: { $size: { $ifNull: ["$enrollments", []] } },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const courses = await CourseModel.aggregate(pipeline as any[]).exec();

    // count total courses for pagination
    const total = await CourseModel.countDocuments();

    return { courses, total, page, limit };
  }

  async getCourse(courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) return null;
    const _id = new Types.ObjectId(courseId);

    const pipeline = [
      { $match: { _id } },
      {
        $lookup: {
          from: BatchModel.collection.name,
          localField: "_id",
          foreignField: "course",
          as: "batches",
        },
      },
      {
        $lookup: {
          from: EnrollmentModel.collection.name,
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          duration: 1,
          fees: 1,
          createdAt: 1,
          updatedAt: 1,
          batches: 1, // you may later project only selected batch fields
          totalBatches: { $size: { $ifNull: ["$batches", []] } },
          totalEnrollments: { $size: { $ifNull: ["$enrollments", []] } },
        },
      },
    ];

    const [course] = await CourseModel.aggregate(pipeline).exec();
    return course || null;
  }
}

export const courseRepositories = new CourseRepositories();
