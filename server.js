require("dotenv").config(); // Load environment variables
const connectDB = require("./utils/db");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// routers
const authRoutes = require("./routes/auth.route");
const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance.route");
const leaveRoutes = require("./routes/leave.route");
const announcementRoutes = require("./routes/announcement.routes");
const restrictedRoutes = require("./routes/restricted.routes");
const app = express();
connectDB();

const allowedOrigins = [
  "http://localhost:3000",
  "https://sh.jwstechnologies.com",
  "https://sh-frontend-dev.jwstechnologies.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/restricted", restrictedRoutes);

module.exports = app;
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log("Listening on PORT : " + PORT);
// });
