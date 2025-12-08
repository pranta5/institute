import express from "express";
import { reportsController } from "../controllers/reports.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// 1. List courses with enrollments (admin/teacher or public per your choice)
router.get("/courses", authMiddleware("admin", "teacher"), (req, res) =>
  reportsController.listCourses(req, res)
);

// 2. Batch performance (admin/teacher)
router.get("/batch/:batchId", authMiddleware("admin", "teacher"), (req, res) =>
  reportsController.batchPerformance(req, res)
);

// 3. Student performance (self or admin/teacher)
router.get("/student/:studentId", authMiddleware(), (req, res) =>
  reportsController.studentPerformance(req, res)
);
router.get("/student", authMiddleware(), (req, res) =>
  reportsController.studentPerformance(req, res)
);

// 4. Send student report to email (self or admin)
router.post("/student/:studentId/send", authMiddleware(), (req, res) =>
  reportsController.sendStudentReport(req, res)
);
router.post("/student/send", authMiddleware(), (req, res) =>
  reportsController.sendStudentReport(req, res)
);

module.exports = router;
