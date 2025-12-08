import { Request, Response } from "express";
import { reportsRepositories } from "../repositories/reports.repo";
import { sendEmail } from "../services/sendMail.service"; // assumed
import { UserModel } from "../models/users.model";

class ReportsController {
  async listCourses(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const limit = Math.min(500, Number(req.query.limit || 100));
      const data = await reportsRepositories.listCoursesWithEnrollments({
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

  async batchPerformance(req: Request, res: Response) {
    try {
      const batchId = req.params.batchId;
      const { dateFrom, dateTo } = req.query;
      if (!batchId)
        return res
          .status(400)
          .json({ success: false, message: "batchId required" });

      const data = await reportsRepositories.batchPerformanceReport({
        batchId,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      return res.json({ success: true, ...data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async studentPerformance(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId ?? (req as any).user?.sub;
      const batchId = req.query.batchId as string | undefined;
      if (!studentId)
        return res
          .status(400)
          .json({ success: false, message: "studentId required" });

      const data = await reportsRepositories.studentPerformanceReport({
        studentId,
        batchId,
      });
      return res.json({ success: true, ...data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }

  async sendStudentReport(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId ?? (req as any).user?.sub;
      const batchId = req.query.batchId as string | undefined;
      if (!studentId)
        return res
          .status(400)
          .json({ success: false, message: "studentId required" });

      const html = await reportsRepositories.generateStudentReportHtml({
        studentId,
        batchId,
      });
      // find student email
      const studentInfo = await UserModel.findById(studentId)
        .select("email name")
        .lean()
        .exec();
      if (!studentInfo || !studentInfo.email)
        return res
          .status(404)
          .json({ success: false, message: "Student or email not found" });

      await sendEmail(studentInfo.email, "Your Performance Report", html);

      return res.json({ success: true, message: "Report emailed" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      return res.status(400).json({ success: false, message });
    }
  }
}

export const reportsController = new ReportsController();
