import { Types } from "mongoose";
import { ExamModel } from "../models/exam.model";

type ExamCreateDto = {
  batch: string | Types.ObjectId;
  name: string;
  description?: string;
  date: string | Date;
  durationInMinutes?: number;
  totalMarks?: number;
  createdBy?: string | Types.ObjectId;
  isPublished?: boolean;
};

class ExamRepositories {
  async createExam(data: ExamCreateDto) {
    if (!Types.ObjectId.isValid(String(data.batch)))
      throw new Error("Invalid batch id");

    const payload: any = {
      batch: new Types.ObjectId(String(data.batch)),
      name: String(data.name).trim(),
      description: data.description ? String(data.description) : "",
      date: data.date ? new Date(data.date) : new Date(),
      durationInMinutes: data.durationInMinutes ?? undefined,
      totalMarks: data.totalMarks ?? undefined,
      createdBy:
        data.createdBy && Types.ObjectId.isValid(String(data.createdBy))
          ? new Types.ObjectId(String(data.createdBy))
          : undefined,
      isPublished: !!data.isPublished,
    };

    const created = await ExamModel.create(payload);
    return created.toObject();
  }

  async updateExam(examId: string, update: Record<string, any>) {
    if (!Types.ObjectId.isValid(examId)) return null;
    const payload: any = {};
    const allowed = [
      "name",
      "description",
      "date",
      "durationInMinutes",
      "totalMarks",
      "isPublished",
    ];
    for (const k of allowed) {
      if (k in update && update[k] !== undefined) {
        payload[k] = k === "date" ? new Date(update[k]) : update[k];
      }
    }

    await ExamModel.updateOne(
      { _id: new Types.ObjectId(examId) },
      { $set: payload }
    ).exec();
    return ExamModel.findById(examId).lean().exec();
  }

  async deleteExam(examId: string) {
    if (!Types.ObjectId.isValid(examId)) return false;
    const res = await ExamModel.deleteOne({
      _id: new Types.ObjectId(examId),
    }).exec();
    return !!res.deletedCount;
  }

  //assign
  async assignMarks(
    examId: string,
    marks: any[],
    markerId?: string | Types.ObjectId
  ) {
    if (!Types.ObjectId.isValid(examId)) throw new Error("Invalid exam id");
    if (!Array.isArray(marks) || marks.length === 0)
      throw new Error("marks[] required");

    const exam = await ExamModel.findById(examId).exec();
    if (!exam) throw new Error("Exam not found");

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const m of marks) {
      // accept either `student` or `studentId`
      const sid = m.student ?? (m as any).studentId;
      if (!sid || !Types.ObjectId.isValid(String(sid))) {
        skipped++;
        continue;
      }

      const studentOid = new Types.ObjectId(String(sid));
      const markObj = {
        student: studentOid,
        marksObtained:
          m.marksObtained !== undefined ? Number(m.marksObtained) : undefined,
        outOf: m.outOf !== undefined ? Number(m.outOf) : undefined,
        grade: m.grade,
        remark: m.remark,
      };

      const idx = exam.marks.findIndex(
        (em: any) => String(em.student) === String(studentOid)
      );

      if (idx >= 0) {
        // update existing entry (shallow merge)
        const current = exam.marks[idx] as any;
        exam.marks[idx] = { ...(current.toObject?.() ?? current), ...markObj };
        updated++;
      } else {
        // push new
        exam.marks.push(markObj as any);
        added++;
      }
    }

    await exam.save();

    return {
      exam: exam.toObject(),
      summary: { added, updated, skipped },
    };
  }

  /**
   * Get exam details (with marks if published or caller is teacher/admin — this repo doesn't enforce role)
   */
  async getExam(examId: string) {
    if (!Types.ObjectId.isValid(examId)) return null;
    return ExamModel.findById(examId).lean().exec();
  }

  /**
   * List exams for a batch (or course via batch lookup) with optional pagination
   */
  async listExams({
    batchId,
    page = 1,
    limit = 20,
  }: {
    batchId?: string;
    page?: number;
    limit?: number;
  }) {
    const match: any = {};
    if (batchId) {
      if (!Types.ObjectId.isValid(batchId))
        return { exams: [], total: 0, page, limit };
      match.batch = new Types.ObjectId(batchId);
    }

    const skip = Math.max(0, (page - 1) * limit);
    const pipeline: any[] = [];
    if (Object.keys(match).length) pipeline.push({ $match: match });
    pipeline.push(
      {
        $project: {
          batch: 1,
          name: 1,
          description: 1,
          date: 1,
          durationInMinutes: 1,
          totalMarks: 1,
          isPublished: 1,
          createdAt: 1,
          updatedAt: 1,
          totalMarksAssigned: { $size: { $ifNull: ["$marks", []] } },
        },
      },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const exams = await ExamModel.aggregate(pipeline).exec();
    const total = await ExamModel.countDocuments(match);
    return { exams, total, page, limit };
  }

  /**
   * Get results for a student across exams (optionally filter by batch)
   * Returns array of { examId, examName, date, marksObtained, outOf, grade }
   */
  async getResultsByStudent(studentId: string, batchId?: string) {
    if (!Types.ObjectId.isValid(studentId)) return [];
    const sid = new Types.ObjectId(studentId);

    const match: any = {};
    if (batchId) {
      if (!Types.ObjectId.isValid(batchId)) return [];
      match.batch = new Types.ObjectId(batchId);
    }

    const pipeline: any[] = [
      { $match: match },
      { $unwind: "$marks" },
      { $match: { "marks.student": sid } },
      {
        $project: {
          examId: "$_id",
          name: 1,
          date: 1,
          marksObtained: "$marks.marksObtained",
          outOf: "$marks.outOf",
          grade: "$marks.grade",
          remark: "$marks.remark",
          totalMarks: 1,
          batch: 1,
        },
      },
      { $sort: { date: -1 } },
    ];

    const rows = await ExamModel.aggregate(pipeline).exec();
    return rows;
  }

  /**
   * Get results for a batch: returns per-exam list and per-student aggregated results if needed
   * Example return: list of exams with marks array or aggregated avg.
   */
  async getResultsByBatch(batchId: string) {
    if (!Types.ObjectId.isValid(batchId)) return [];
    const _bid = new Types.ObjectId(batchId);

    // Simple: return exams for batch with marks array
    const pipeline = [
      { $match: { batch: _bid } },
      {
        $project: {
          name: 1,
          date: 1,
          totalMarks: 1,
          marks: 1, // each mark has student, marksObtained, outOf, grade
        },
      },
      { $sort: { date: -1 } },
    ];

    const rows = await ExamModel.aggregate(pipeline as any[]).exec();
    return rows;
  }
}

export const examRepositories = new ExamRepositories();
