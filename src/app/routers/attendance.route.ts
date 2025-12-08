import express from "express";
import { attendanceController } from "../controllers/attendance.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// Mark attendance (teacher or admin)
router.post("/:batchId/mark", authMiddleware("teacher", "admin"), (req, res) =>
  attendanceController.markAttendance(req, res)
);

// Get batch attendance docs (paginated)
router.get("/:batchId", authMiddleware(), (req, res) =>
  attendanceController.listByBatch(req, res)
);

// Batch summary (attendance percentage)
router.get(
  "/:batchId/summary",
  authMiddleware("teacher", "admin"),
  (req, res) => attendanceController.batchSummary(req, res)
);

// Attendance by student (self or teacher/admin)
router.get("/student/:studentId", authMiddleware(), (req, res) =>
  attendanceController.viewByStudent(req, res)
);
router.get("/student", authMiddleware(), (req, res) =>
  attendanceController.viewByStudent(req, res)
);

module.exports = router;
