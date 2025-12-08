import express from "express";
import { batchController } from "../controllers/batch.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

// public listing and single fetch
router.get("/", (req, res) => batchController.listBatches(req, res));
router.get("/:id", (req, res) => batchController.getBatch(req, res));

// protected: add/edit by teacher or admin
router.post("/", authMiddleware("admin", "teacher"), batchController.addBatch);
router.patch(
  "/:id",
  authMiddleware("admin", "teacher"),
  batchController.updateBatch
);

// assign students and delete - admin only
router.post(
  "/:batchId/assign",
  authMiddleware("admin"),
  batchController.assignStudents
);
router.delete("/:id", authMiddleware("admin"), batchController.deleteBatch);

module.exports = router;
