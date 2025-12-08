require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dbConnect = require("./app/configs/dbConnect");

const userRouter = require("../src/app/routers/user.route");
const courseRouter = require("../src/app/routers/course.route");
const batchRouter = require("../src/app/routers/batch.route");
const enrollRouter = require("../src/app/routers/enrollment.route");
const attendanceRouter = require("../src/app/routers/attendance.route");
const examRouter = require("../src/app/routers/exam.route");
const reportRouter = require("../src/app/routers/reports.route");

const app = express();
dbConnect();
app.use(cors());
// middlewares
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
//static
app.use(express.static("public"));

//route
app.use("/api/users", userRouter);
app.use("/api/courses", courseRouter);
app.use("/api/batches", batchRouter);
app.use("/api/enroll", enrollRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/exam", examRouter);
app.use("/api/report", reportRouter);

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`running on ${port}`);
});
