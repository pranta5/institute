import { userRepositories } from "../repositories/user.repo";
import { Request, Response } from "express";
import { authService } from "../services/auth.service"; // handles hash, compare, jwt
import { sendEmailVerification } from "../services/mail.service";
import { v2 as cloudinary } from "cloudinary";

class UserController {
  // 🟢 Register new user (with email verification)
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, address, dob } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "name, email and password required",
        });
      }

      const existing = await userRepositories.findByEmail(email);
      if (existing) {
        return res
          .status(409)
          .json({ success: false, message: "Email already exists" });
      }
      //image
      const file = req.file as Express.Multer.File | undefined;
      const avatarPath = file?.path ?? "";
      if (!avatarPath) {
        return res.status(400).json({ message: "Image upload failed" });
      }
      const passwordHash = await authService.hash(password);
      const emailVerificationToken = await authService.signJwt(
        { email },
        { expiresIn: "1h" }
      );
      const userData = {
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone,
        address,
        dob,
        avatarUrl: avatarPath,
        emailVerificationToken,
      };
      const user = await userRepositories.registerUser(userData);

      const link = `${process.env.BACKEND_URL}/verify-token?token=${emailVerificationToken}`;
      await sendEmailVerification(email, link, name);

      return res.status(201).json({
        success: true,
        message: "User registered successfully. Please verify your email.",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerificationToken: user.emailVerificationToken,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // 🟢 Verify email
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid token" });
      }

      const user = await userRepositories.verifyEmailToken(token);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "Invalid or expired token" });

      return res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // 🟢 Login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "email and password required" });
      }

      const user = await userRepositories.findByEmail(email);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });

      const match = await authService.compare(password, user.passwordHash);
      if (!match)
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });

      if (!user.isEmailVerified) {
        return res
          .status(403)
          .json({ success: false, message: "Email not verified" });
      }
      const profile = await userRepositories.getUserWithRole(String(user._id));

      const token = await authService.signJwt(
        { sub: user._id, role: user.role },
        { expiresIn: "7d" }
      );
      res.cookie("token", token, {
        httpOnly: true, //  prevents JS access (important)
        secure: process.env.NODE_ENV === "production", // only https in prod
        sameSite: "strict", // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: profile,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // 🟢 Get Profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub || req.params.id;
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "User ID required" });

      const user = await userRepositories.getUserWithRole(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      return res.json({ success: true, user });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // 🟢 Edit Profile
  async editProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub || req.params.id;
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "User ID required" });
      // Fetch the current user (to know old avatar URL)
      const currentUser = await userRepositories.getUserWithRole(userId);
      if (!currentUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      let publicId;
      if (currentUser.avatarUrl) {
        const oldUrl = currentUser.avatarUrl as string;
        const matches = oldUrl.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        publicId = matches ? matches[1] : null;
      }
      const allowed = ["name", "phone", "address", "dob"];
      const update: Record<string, any> = {};
      for (const field of allowed) {
        if (req.body[field]) update[field] = req.body[field];
      }
      const file = req.file as Express.Multer.File | undefined;
      if (file) {
        const avatarPath = file?.path ?? "";
        if (!avatarPath) {
          return res.status(400).json({ message: "Image upload failed" });
        }
        update.avatarUrl = avatarPath;
      }

      const updated = await userRepositories.updateUser(userId, update);
      if (!updated)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(" Old image deleted:", publicId);
        } catch (err) {
          console.warn(" Failed to delete old Cloudinary image:", err);
        }
      }

      return res.json({ success: true, user: updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  // 🟢 List Users (Admin only)
  async listUsers(req: Request, res: Response) {
    try {
      const { role, page = "1", limit = "10" } = req.query;
      const users = await userRepositories.listUsers({
        roleName: role as string,
        page: Number(page),
        limit: Number(limit),
      });

      return res.json({ success: true, ...users });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  }
}

export const userController = new UserController();
