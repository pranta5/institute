import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { userRepositories } from "../repositories/user.repo";

export const authMiddleware =
  (...allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authentication token missing in cookies",
        });
      }
      const decoded = await authService.verifyJwt<{
        sub: string;
        role: string;
      }>(token);
      (req as any).user = decoded;

      //  If no roles specified → only authentication required
      if (allowedRoles.length === 0) {
        return next();
      }

      //  If roles specified → check user's actual role
      const user = await userRepositories.getUserWithRole(decoded.sub);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const userRole = user.role?.name || decoded.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: insufficient permissions",
        });
      }

      next();
    } catch (error) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }
  };
