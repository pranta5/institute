import { Request, Response } from "express";
import { enrollmentRepositories } from "../repositories/enrollment.repo";

/**
 * EnrollmentController
 */
class EnrollmentController {
  // Student enrolls themself or admin enrolls student
  async enroll(req: Request, res: Response) {
    try {
      const { studentId, courseId, batchId } = req.body;

      // studentId optional: if omitted, assume authenticated user
      const caller = (req as any).user?.sub;
      const sid = studentId ?? caller;
      if (!sid || !courseId)
        return res.status(400).json({
          success: false,
          message: "studentId or authenticated user and courseId required",
        });

      const result = await enrollmentRepositories.enrollStudent({
        studentId: sid,
        courseId,
        batchId,
      });

      return res.json({ success: true, result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  // List enrollments for a student (self or admin viewing other)
  async listByStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId ?? (req as any).user?.sub;
      if (!studentId)
        return res
          .status(400)
          .json({ success: false, message: "studentId required" });

      const courseId = req.query.courseId as string | undefined;
      const batchId = req.query.batchId as string | undefined;

      const rows = await enrollmentRepositories.getEnrollmentsByStudent({
        studentId,
        courseId,
        batchId,
      });
      return res.json({ success: true, enrollments: rows });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }
}

export const enrollmentController = new EnrollmentController();
