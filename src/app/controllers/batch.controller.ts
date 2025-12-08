import { Request, Response } from "express";
import { batchRepositories } from "../repositories/batch.repo";

class BatchController {
  async addBatch(req: Request, res: Response) {
    try {
      const { course, name, startDate, endDate, teacher, schedule, capacity } =
        req.body;

      if (!course || !name || !startDate) {
        return res.status(400).json({
          success: false,
          message: "course, name and startDate are required",
        });
      }

      // created by from auth
      const createdBy = (req as any).user?.sub ?? null;

      const created = await batchRepositories.createBatch({
        course,
        name,
        startDate,
        endDate,
        teacher,
        schedule,
        capacity: capacity ? Number(capacity) : undefined,
        isActive: true,
      });

      return res.status(201).json({ success: true, batch: created });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async assignStudents(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      const { students } = req.body; // expect array of student ids

      if (!batchId || !Array.isArray(students)) {
        return res.status(400).json({
          success: false,
          message: "batchId and students array required",
        });
      }

      const result = await batchRepositories.assignStudentsToBatch(
        batchId,
        students
      );
      return res.json({ success: true, result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async listBatches(req: Request, res: Response) {
    try {
      const courseId = req.query.courseId as string | undefined;
      const page = Number(req.query.page || 1);
      const limit = Math.min(200, Number(req.query.limit || 20));

      const data = await batchRepositories.listBatches({
        courseId,
        page,
        limit,
      });
      return res.json({ success: true, ...data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async updateBatch(req: Request, res: Response) {
    try {
      const batchId = req.params.id;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "Batch ID required" });

      const allowed = [
        "name",
        "startDate",
        "endDate",
        "teacher",
        "schedule",
        "capacity",
        "isActive",
      ];
      const update: Record<string, any> = {};
      for (const k of allowed) {
        if (k in req.body) update[k] = req.body[k];
      }

      const updated = await batchRepositories.updateBatch(batchId, update);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Batch not found" });

      return res.json({ success: true, batch: updated });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async deleteBatch(req: Request, res: Response) {
    try {
      const batchId = req.params.id;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "Batch ID required" });

      const ok = await batchRepositories.deleteBatch(batchId);
      if (!ok)
        return res
          .status(404)
          .json({ success: false, message: "Batch not found" });

      return res.json({ success: true, message: "Batch deleted" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async getBatch(req: Request, res: Response) {
    try {
      const batchId = req.params.id;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "Batch ID required" });

      const batch = await batchRepositories.getBatch(batchId);
      if (!batch)
        return res
          .status(404)
          .json({ success: false, message: "Batch not found" });

      return res.json({ success: true, batch });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }
}

export const batchController = new BatchController();
