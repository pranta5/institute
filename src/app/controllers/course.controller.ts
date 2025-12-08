import { Request, Response } from "express";
import { courseRepositories } from "../repositories/course.repo";
import { ICourse } from "../types/courses.types";

/**
 * CourseController - handles request/response (validation + calls repo)
 */
class CourseController {
  async addCourse(req: Request, res: Response) {
    try {
      const { title, description, duration, fees } = req.body;

      if (!title)
        return res
          .status(400)
          .json({ success: false, message: "Course title is required" });

      const courseData = {
        title: String(title),
        description: description ?? "",
        duration: duration ? String(duration) : "",
        fees: fees ? Number(fees) : 0,
        createdBy: (req as any).user?.sub ?? "",
        isActive: true,
      };

      const created = await courseRepositories.createCourse(courseData);

      return res.status(201).json({ success: true, course: created });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async editCourse(req: Request, res: Response) {
    try {
      const courseId = req.params.id;
      if (!courseId)
        return res
          .status(400)
          .json({ success: false, message: "Course ID required" });

      const allowed = ["title", "description", "duration", "fees"];
      const update: Record<string, any> = {};
      for (const f of allowed) {
        if (f in req.body && req.body[f] !== undefined) update[f] = req.body[f];
      }

      if ("tags" in update && typeof update.tags === "string") {
        update.tags = update.tags.split(",").map((t: string) => t.trim());
      }

      const updated = await courseRepositories.updateCourse(courseId, update);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });

      return res.json({ success: true, course: updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async deleteCourse(req: Request, res: Response) {
    try {
      const courseId = req.params.id;
      if (!courseId)
        return res
          .status(400)
          .json({ success: false, message: "Course ID required" });

      const ok = await courseRepositories.deleteCourse(courseId);
      if (!ok)
        return res.status(404).json({
          success: false,
          message: "Course not found or already deleted",
        });

      return res.json({ success: true, message: "Course deleted" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async listCourses(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const limit = Math.min(100, Number(req.query.limit || 20));

      const data = await courseRepositories.listCourses({ page, limit });
      return res.json({ success: true, ...data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async getCourse(req: Request, res: Response) {
    try {
      const courseId = req.params.id;
      if (!courseId)
        return res
          .status(400)
          .json({ success: false, message: "Course ID required" });

      const course = await courseRepositories.getCourse(courseId);
      if (!course)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });

      return res.json({ success: true, course });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }
}

export const courseController = new CourseController();
// Bind all methods (so `this` is never undefined)
// courseController.addCourse = courseController.addCourse.bind(courseController);
// courseController.editCourse =
//   courseController.editCourse.bind(courseController);
// courseController.deleteCourse =
//   courseController.deleteCourse.bind(courseController);
// courseController.listCourses =
//   courseController.listCourses.bind(courseController);
// courseController.getCourse = courseController.getCourse.bind(courseController);
