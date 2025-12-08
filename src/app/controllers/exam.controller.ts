import { Request, Response } from "express";
import { examRepositories } from "../repositories/exam.repo";

/**
 * ExamController
 */
class ExamController {
  async createExam(req: Request, res: Response) {
    try {
      const { batch, name, description, date, durationInMinutes, totalMarks } =
        req.body;
      if (!batch || !name || !date)
        return res.status(400).json({
          success: false,
          message: "batch, name and date are required",
        });

      const createdBy = (req as any).user?.sub ?? undefined;
      const created = await examRepositories.createExam({
        batch,
        name,
        description,
        date,
        durationInMinutes: durationInMinutes
          ? Number(durationInMinutes)
          : undefined,
        totalMarks: totalMarks ? Number(totalMarks) : undefined,
        createdBy,
        isPublished: false,
      });

      return res.status(201).json({ success: true, exam: created });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async updateExam(req: Request, res: Response) {
    try {
      const examId = req.params.id;
      if (!examId)
        return res
          .status(400)
          .json({ success: false, message: "Exam ID required" });

      const allowed = [
        "name",
        "description",
        "date",
        "durationInMinutes",
        "totalMarks",
        "isPublished",
      ];
      const update: Record<string, any> = {};
      for (const k of allowed) {
        if (k in req.body) update[k] = req.body[k];
      }

      const updated = await examRepositories.updateExam(examId, update);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });

      return res.json({ success: true, exam: updated });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async deleteExam(req: Request, res: Response) {
    try {
      const examId = req.params.id;
      if (!examId)
        return res
          .status(400)
          .json({ success: false, message: "Exam ID required" });

      const ok = await examRepositories.deleteExam(examId);
      if (!ok)
        return res.status(404).json({
          success: false,
          message: "Exam not found or already deleted",
        });

      return res.json({ success: true, message: "Exam deleted" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async assignMarks(req: Request, res: Response) {
    try {
      const examId = req.params.id;
      const marks = req.body.marks;
      if (!examId || !Array.isArray(marks))
        return res
          .status(400)
          .json({ success: false, message: "examId and marks[] required" });

      const marker = (req as any).user?.sub;
      const result = await examRepositories.assignMarks(examId, marks, marker);

      return res.json({ success: true, exam: result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async getExam(req: Request, res: Response) {
    try {
      const examId = req.params.id;
      if (!examId)
        return res
          .status(400)
          .json({ success: false, message: "Exam ID required" });

      const exam = await examRepositories.getExam(examId);
      if (!exam)
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });

      return res.json({ success: true, exam });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async listExams(req: Request, res: Response) {
    try {
      const batchId = req.query.batchId as string | undefined;
      const page = Number(req.query.page || 1);
      const limit = Math.min(200, Number(req.query.limit || 20));
      const data = await examRepositories.listExams({ batchId, page, limit });
      return res.json({ success: true, ...data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async resultsByStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId ?? (req as any).user?.sub;
      if (!studentId)
        return res
          .status(400)
          .json({ success: false, message: "studentId required" });

      const batchId = req.query.batchId as string | undefined;
      const rows = await examRepositories.getResultsByStudent(
        studentId,
        batchId
      );
      return res.json({ success: true, results: rows });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async resultsByBatch(req: Request, res: Response) {
    try {
      const batchId = req.params.batchId;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "batchId required" });

      const rows = await examRepositories.getResultsByBatch(batchId);
      return res.json({ success: true, results: rows });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }
}

export const examController = new ExamController();
