import express from "express";
import { courseController } from "../controllers/course.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

/**
 * Public
 */
router.get("/", courseController.listCourses);
router.get("/:id", courseController.getCourse);

/**
 * Protected - admin only
 */
router.post("/", authMiddleware("admin"), courseController.addCourse);
router.patch("/:id", authMiddleware("admin"), courseController.editCourse);
router.delete("/:id", authMiddleware("admin"), courseController.deleteCourse);

module.exports = router;
