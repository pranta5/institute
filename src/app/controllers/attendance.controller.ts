import { Request, Response } from "express";
import { attendanceRepositories } from "../repositories/attendance.repo";

class AttendanceController {
  // Teacher marks attendance for a batch
  async markAttendance(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      const { date, session, records } = req.body; // records: [{ student, status, remark }]
      const markedBy = (req as any).user?.sub;
      if (!batchId || !Array.isArray(records) || !records.length) {
        return res
          .status(400)
          .json({ success: false, message: "batchId and records[] required" });
      }
      if (!markedBy)
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });

      const saved = await attendanceRepositories.markAttendance({
        batchId,
        date: date ?? new Date(),
        session,
        records,
        markedBy,
      });

      return res.json({ success: true, attendance: saved });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  // Student/Teacher: view attendance for a student
  async viewByStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId ?? (req as any).user?.sub;
      if (!studentId)
        return res
          .status(400)
          .json({ success: false, message: "studentId required" });

      const { batchId, dateFrom, dateTo } = req.query;
      const rows = await attendanceRepositories.getAttendanceByStudent({
        studentId,
        batchId: batchId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });

      return res.json({ success: true, attendance: rows });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // Batch attendance summary (percentage per student)
  async batchSummary(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "batchId required" });

      const { dateFrom, dateTo } = req.query;
      const summary = await attendanceRepositories.getBatchAttendanceSummary({
        batchId,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });

      return res.json({ success: true, summary });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // List attendance documents for a batch (paginated)
  async listByBatch(req: Request, res: Response) {
    try {
      const { batchId } = req.params;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 50);

      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "batchId required" });

      const data = await attendanceRepositories.getAttendanceByBatch({
        batchId,
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
}

export const attendanceController = new AttendanceController();
