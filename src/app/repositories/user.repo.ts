import { UserModel } from "../models/users.model";
import { Types } from "mongoose";

class UserRepositories {
  async registerUser(userData: any) {
    console.log("userData", userData);

    const newUser = await UserModel.create(userData);
    return newUser.toObject();
  }

  async findByEmail(email: string) {
    return await UserModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async verifyEmailToken(token: string) {
    return await UserModel.findOneAndUpdate(
      { emailVerificationToken: token },
      {
        $set: { isEmailVerified: true },
        $unset: { emailVerificationToken: "" },
      },
      { new: true }
    ).lean();
  }

  async getUserWithRole(userId: string) {
    const _id = new Types.ObjectId(userId);

    const pipeline = [
      { $match: { _id } },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          address: 1,
          phone: 1,
          dob: 1,
          avatarUrl: 1,
        },
      },
    ];
    const [user] = await UserModel.aggregate(pipeline).exec();
    return user || null;
  }

  async updateUser(userId: string, update: Record<string, any>) {
    await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: update }
    );
    return this.getUserWithRole(userId);
  }

  async listUsers({
    roleName,
    page = 1,
    limit = 10,
  }: {
    roleName?: string;
    page?: number;
    limit?: number;
  }) {
    // 🔹 Build a simple filter — filter by role if provided
    const filter: Record<string, any> = {};
    if (roleName) {
      filter.role = roleName.toString().toLowerCase();
    }

    // 🔹 Calculate pagination
    const skip = (page - 1) * limit;

    // 🔹 Query directly
    const users = await UserModel.find(filter)
      .select("-passwordHash -emailVerificationToken -resetPasswordToken -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 🔹 Count total users (with same filter)
    const total = await UserModel.countDocuments(filter);

    return { users, total, page, limit };
  }
}

export const userRepositories = new UserRepositories();
