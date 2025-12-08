import express from "express";
import { enrollmentController } from "../controllers/enrollment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// enroll: authenticated students or admin can enroll a student (admin may pass studentId)
router.post("/", authMiddleware(), (req, res) =>
  enrollmentController.enroll(req, res)
);

// list enrollments for a student (self or admin)
router.get("/student/:studentId", authMiddleware(), (req, res) =>
  enrollmentController.listByStudent(req, res)
);
router.get("/student", authMiddleware(), (req, res) =>
  enrollmentController.listByStudent(req, res)
);

module.exports = router;
