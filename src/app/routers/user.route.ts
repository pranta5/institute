import { userController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import ImageUpload from "../utils/ImageUpload";

import express from "express";
const router = express.Router();

router.post(
  "/register",
  ImageUpload.single("avatarUrl"),
  userController.register
);
router.get("/verify-email", userController.verifyEmail);
router.post("/login", userController.login);
router.get("/profile", authMiddleware(), userController.getProfile);
router.patch(
  "/profile",
  authMiddleware(),
  ImageUpload.single("avatarUrl"),
  userController.editProfile
);
router.get("/all-users", authMiddleware("admin"), userController.listUsers);

module.exports = router;
