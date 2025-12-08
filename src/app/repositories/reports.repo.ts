import { Types } from "mongoose";
import { CourseModel } from "../models/courses.model";
import { EnrollmentModel } from "../models/enrollments.model";
import { AttendanceModel } from "../models/attendance.model";
import { ExamModel } from "../models/exam.model";
import { UserModel } from "../models/users.model";

class ReportsRepositories {
  /**
   * 1) List courses with total enrollments (per course)
   */
  async listCoursesWithEnrollments({
    page = 1,
    limit = 100,
  }: {
    page?: number;
    limit?: number;
  }) {
    const skip = Math.max(0, (page - 1) * limit);
    const pipeline: any[] = [
      {
        $lookup: {
          from: EnrollmentModel.collection.name,
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          fees: 1,
          totalEnrollments: { $size: { $ifNull: ["$enrollments", []] } },
        },
      },
      { $sort: { title: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const courses = await CourseModel.aggregate(pipeline).exec();
    const total = await CourseModel.countDocuments();
    return { courses, total, page, limit };
  }

  /**
   * 2) Batch Performance Report:
   * - attendance percentage for each student in the batch
   * - average exam performance for the batch (per student and overall avg)
   */
  async batchPerformanceReport({
    batchId,
    dateFrom,
    dateTo,
  }: {
    batchId: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    if (!Types.ObjectId.isValid(batchId)) throw new Error("Invalid batch id");
    const _batch = new Types.ObjectId(batchId);

    // Attendance: unwind records and compute present counts and total sessions per student
    const attendancePipeline = [
      { $match: { batch: _batch } } as any,
      // optional date range
      ...(dateFrom || dateTo
        ? [
            {
              $match: {
                ...(dateFrom ? { date: { $gte: new Date(dateFrom) } } : {}),
                ...(dateTo ? { date: { $lte: new Date(dateTo) } } : {}),
              },
            },
          ]
        : []),
      { $unwind: "$records" } as any,
      {
        $group: {
          _id: "$records.student",
          totalSessions: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] },
          },
        },
      } as any,
      {
        $project: {
          student: "$_id",
          totalSessions: 1,
          presentCount: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$totalSessions", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$presentCount", "$totalSessions"] },
                  100,
                ],
              },
            ],
          },
        },
      } as any,
    ];

    const attendanceByStudent = await AttendanceModel.aggregate(
      attendancePipeline
    ).exec();

    // Exams: get each student's average percentage in exams for this batch
    const examsPipeline = [
      { $match: { batch: _batch } } as any,
      { $unwind: { path: "$marks", preserveNullAndEmptyArrays: true } } as any,
      {
        $group: {
          _id: "$marks.student",
          totalMarksObtained: { $sum: "$marks.marksObtained" },
          totalOutOf: { $sum: { $ifNull: ["$marks.outOf", "$totalMarks"] } },
          examsCount: {
            $sum: { $cond: [{ $ifNull: ["$marks", false] }, 1, 0] },
          },
        },
      } as any,
      {
        $project: {
          student: "$_id",
          examsCount: 1,
          totalMarksObtained: 1,
          totalOutOf: 1,
          avgPercent: {
            $cond: [
              { $eq: ["$totalOutOf", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$totalMarksObtained", "$totalOutOf"] },
                  100,
                ],
              },
            ],
          },
        },
      } as any,
    ];

    const examStatsByStudent = await ExamModel.aggregate(examsPipeline).exec();

    // Merge attendance and exam arrays by student id
    const map: Record<string, any> = {};
    for (const a of attendanceByStudent)
      map[String(a.student)] = { attendance: a };
    for (const e of examStatsByStudent)
      map[String(e.student)] = { ...(map[String(e.student)] || {}), exams: e };

    // Prepare final list with student details
    const studentIds = Object.keys(map).map((k) => new Types.ObjectId(k));
    let students: any[] = [];
    if (studentIds.length) {
      students = await UserModel.find({ _id: { $in: studentIds } })
        .select("name email")
        .lean()
        .exec();
    }

    const list = Object.entries(map).map(([studentId, data]) => {
      const stu = students.find((s) => String(s._id) === String(studentId));
      return {
        studentId,
        name: stu?.name ?? null,
        email: stu?.email ?? null,
        attendance: data.attendance ?? {
          totalSessions: 0,
          presentCount: 0,
          attendancePercentage: 0,
        },
        exams: data.exams ?? {
          examsCount: 0,
          totalMarksObtained: 0,
          totalOutOf: 0,
          avgPercent: 0,
        },
      };
    });

    // compute batch averages
    const overallAvgExamPercent =
      examStatsByStudent.length === 0
        ? 0
        : examStatsByStudent.reduce(
            (s: number, r: any) => s + (r.avgPercent || 0),
            0
          ) / examStatsByStudent.length;

    const overallAttendancePercent =
      attendanceByStudent.length === 0
        ? 0
        : attendanceByStudent.reduce(
            (s: number, r: any) => s + (r.attendancePercentage || 0),
            0
          ) / attendanceByStudent.length;

    return {
      batchId,
      students: list,
      overallAvgExamPercent,
      overallAttendancePercent,
    };
  }

  /**
   * 3) Student Performance Report:
   * - attendance percentage across all batches (or filter by batch)
   * - average marks across all exams (or filter by batch)
   */
  async studentPerformanceReport({
    studentId,
    batchId,
  }: {
    studentId: string;
    batchId?: string | undefined;
  }) {
    if (!Types.ObjectId.isValid(studentId))
      throw new Error("Invalid student id");
    const sid = new Types.ObjectId(studentId);

    // Attendance: find attendance docs where records.student == sid
    const match: any = { "records.student": sid };
    if (batchId && Types.ObjectId.isValid(batchId))
      match.batch = new Types.ObjectId(batchId);

    const attendancePipeline = [
      { $match: match },
      { $project: { date: 1, batch: 1, records: 1 } },
      { $unwind: "$records" },
      { $match: { "records.student": sid } },
      {
        $group: {
          _id: "$records.student",
          totalSessions: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          totalSessions: 1,
          presentCount: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$totalSessions", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$presentCount", "$totalSessions"] },
                  100,
                ],
              },
            ],
          },
        },
      },
    ];

    const attendanceArr = await AttendanceModel.aggregate(
      attendancePipeline
    ).exec();
    const attendance = attendanceArr[0] ?? {
      totalSessions: 0,
      presentCount: 0,
      attendancePercentage: 0,
    };

    // Exams: find marks for the student and compute average percent
    const examPipeline = [
      ...(batchId && Types.ObjectId.isValid(batchId)
        ? [{ $match: { batch: new Types.ObjectId(batchId) } }]
        : []),
      { $unwind: "$marks" },
      { $match: { "marks.student": sid } },
      {
        $project: {
          examId: "$_id",
          marksObtained: "$marks.marksObtained",
          outOf: { $ifNull: ["$marks.outOf", "$totalMarks"] },
        },
      },
      {
        $group: {
          _id: null,
          totalObtained: { $sum: "$marksObtained" },
          totalOutOf: { $sum: "$outOf" },
          examsCount: { $sum: 1 },
        },
      },
      {
        $project: {
          totalObtained: 1,
          totalOutOf: 1,
          examsCount: 1,
          avgPercent: {
            $cond: [
              { $eq: ["$totalOutOf", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$totalObtained", "$totalOutOf"] },
                  100,
                ],
              },
            ],
          },
        },
      },
    ];

    const examStats = await ExamModel.aggregate(examPipeline).exec();
    const examSummary = examStats[0] ?? {
      totalObtained: 0,
      totalOutOf: 0,
      examsCount: 0,
      avgPercent: 0,
    };

    // fetch student basic info
    const student = await UserModel.findById(sid)
      .select("name email")
      .lean()
      .exec();

    return {
      student: {
        _id: sid,
        name: student?.name ?? null,
        email: student?.email ?? null,
      },
      attendance,
      exams: examSummary,
    };
  }

  /**
   * 4) Generate student report HTML (simple table) given studentId and optionally batch
   * This returns the HTML string (controller will call mailService)
   */
  async generateStudentReportHtml({
    studentId,
    batchId,
  }: {
    studentId: string;
    batchId?: string | undefined;
  }) {
    const perf = await this.studentPerformanceReport({ studentId, batchId });
    // Minimal HTML table
    const html = `
      <h2>Student Performance Report</h2>
      <p><strong>${perf.student.name} (${perf.student.email})</strong></p>

      <h3>Attendance</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Total Sessions</th><th>Present</th><th>Attendance %</th></tr>
        <tr><td>${perf.attendance.totalSessions}</td><td>${
      perf.attendance.presentCount
    }</td><td>${perf.attendance.attendancePercentage.toFixed(2)}%</td></tr>
      </table>

      <h3>Exams</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Exams Count</th><th>Total Obtained</th><th>Total OutOf</th><th>Average %</th></tr>
        <tr><td>${perf.exams.examsCount}</td><td>${
      perf.exams.totalObtained
    }</td><td>${perf.exams.totalOutOf}</td><td>${perf.exams.avgPercent.toFixed(
      2
    )}%</td></tr>
      </table>
    `;
    return html;
  }
}

export const reportsRepositories = new ReportsRepositories();
