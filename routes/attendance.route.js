const express = require("express");
const router = express.Router();

// middlewares
const { verifyToken } = require("../middleware/auth.middleware");

//controllers
const {
  markAttendance,
  getStudentsAccordingToAd,
  getAttendanceRecords,
  getChristianStudentsAccordingToAd,
} = require("../controllers/attendance.controller");
// const { getStudents } = require("../controllers/student.controller");



router.get("/", verifyToken, getStudentsAccordingToAd); // POST /api/attendance/
router.get("/christian", verifyToken, getChristianStudentsAccordingToAd);
router.post("/mark", verifyToken, markAttendance); // POST /api/attendance/mark
router.get("/get-attendance-records", verifyToken, getAttendanceRecords);
// GET /api/attendance/get-attendance-records
// router.get("/students", getStudents); // GET: Fetch all students based on adId

module.exports = router;
