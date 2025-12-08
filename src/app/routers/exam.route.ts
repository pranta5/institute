import express from "express";
import { examController } from "../controllers/exam.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// public: list and get
router.get("/", (req, res) => examController.listExams(req, res));
router.get("/:id", (req, res) => examController.getExam(req, res));

// results
router.get("/results/student", authMiddleware(), (req, res) =>
  examController.resultsByStudent(req, res)
); // self
router.get(
  "/results/student/:studentId",
  authMiddleware("teacher", "admin"),
  (req, res) => examController.resultsByStudent(req, res)
); // admin/teacher
router.get(
  "/results/batch/:batchId",
  authMiddleware("teacher", "admin"),
  (req, res) => examController.resultsByBatch(req, res)
);

// protected: create/update/delete/assign marks
router.post("/", authMiddleware("teacher", "admin"), (req, res) =>
  examController.createExam(req, res)
);
router.patch("/:id", authMiddleware("teacher", "admin"), (req, res) =>
  examController.updateExam(req, res)
);
router.delete("/:id", authMiddleware("admin"), (req, res) =>
  examController.deleteExam(req, res)
);

// assign marks
router.post("/:id/marks", authMiddleware("teacher", "admin"), (req, res) =>
  examController.assignMarks(req, res)
);

module.exports = router;
