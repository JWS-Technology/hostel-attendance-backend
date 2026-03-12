const Attendance = require("../models/attendance.model");
const User = require("../models/user.model");
const Students = require("../models/student.model");
const Leave = require("../models/leave.model");

// const markAttendance = async (req, res) => {
//   const ad = req.token.id;
//   const type = "general";
//   const { records } = req.body;

//   if (!ad || !records || !type)
//     return res.status(400).json({ error: "Missing fields" });

//   try {
//     const attendance = new Attendance({ ad, type, records });
//     attendance.save();

//     res.json({ message: "Attendance saved successfully" });
//   } catch (err) {
//     console.log("Error in attendance.controller.js \n" + err);
//     res.status(500).json({ error: "Failed to save attendance" });
//   }
// };

const markAttendance = async (req, res) => {
  const ad = req.token.id;
  const { records, type } = req.body;

  if (!ad || !records || !type)
    return res.status(400).json({ error: "Missing fields" });


  if (!["general", "special"].includes(type)) {
    return res.status(400).json({ error: "Invalid attendance type" });
  }

  try {
    // ✅ Define start and end of today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ✅ Check if attendance already exists for today
    const existingAttendance = await Attendance.findOne({
      ad: ad,
      type: type,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (existingAttendance) {
      return res.status(400).json({
        error: "${type} Attendance for today has already been submitted",
      });
    }

    // ✅ Save new attendance
    const attendance = new Attendance({ ad, type, records, date: new Date() });
    await attendance.save();

    res.json({ message: "Attendance saved successfully" });
  } catch (err) {
    console.log("Error in attendance.controller.js \n" + err);
    res.status(500).json({ error: "Failed to save attendance" });
  }
};

const getChristianStudentsAccordingToAd = async (req, res) => {
  try {
    const adId = req.token.id;
    const user = await User.findById(adId);

    if (!user || !user.roomsIncharge || user.roomsIncharge.length === 0) {
      return res.status(404).json({ error: "No rooms assigned to this AD" });
    }

    const matchConditions = [];

    user.roomsIncharge.forEach((range) => {
      const halls = range.hall || [];
      const from = parseInt(range.from);
      const to = parseInt(range.to);

      // ✅ Hall rooms (same as normal fetch)
      if (Array.isArray(halls) && halls.length > 0) {
        matchConditions.push({
          $and: [
            { roomNo: { $in: halls } },
            { roomNo: { $not: { $regex: /\d/ } } },
            {
              religion: {
                $in: [/^christ/i, /^rc$/i]
              }
            }
          ],
        });
      }

      // ✅ Numeric room ranges
      if (!isNaN(from) && !isNaN(to)) {
        matchConditions.push({
          $and: [
            { block: range.block },
            { numericRoom: { $gte: from, $lte: to } },
            {
              religion: {
                $in: [/^christ/i, /^rc$/i]
              }
            }
          ],
        });
      }
    });

    const students = await Students.aggregate([
      {
        $addFields: {
          numericRoom: {
            $cond: {
              if: { $regexMatch: { input: "$roomNo", regex: /^[0-9]+$/ } },
              then: { $toInt: "$roomNo" },
              else: null,
            },
          },
        },
      },
      {
        $match: { $or: matchConditions },
      },
      // --- OPTIMIZATION: Only return necessary fields ---
      {
        $project: {
          name: 1,
          accNo: 1,
          dNo: 1,
          block: 1,
          roomNo: 1
        }
      }
    ]);
    // console.log(students);
    const groupedUsers = {};

    students.forEach((student) => {
      const roomKey = `${student.block}-${student.roomNo}`;
      if (!groupedUsers[roomKey]) groupedUsers[roomKey] = [];

      groupedUsers[roomKey].push({
        ...student,
        status: "present",
      });
    });

    res.json({ students: groupedUsers });

  } catch (error) {
    console.error("Error in getChristianStudentsAccordingToAd:\n", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getChristianStudentsByYear = async (req, res) => {
  try {
    const { yearPrefix } = req.query; // e.g., "25", "24", "23"

    if (!yearPrefix) {
      return res.status(400).json({ error: "Year prefix is required" });
    }

    // Fetch all Christian/RC students whose dNo starts with the yearPrefix
    const students = await Students.aggregate([
      {
        $match: {
          religion: { $in: [/^christ/i, /^rc$/i] },
          dNo: { $regex: new RegExp(`^${yearPrefix}`) } // Matches dNo starting with "25", etc.
        }
      },
      {
        $addFields: {
          numericRoom: {
            $cond: {
              if: { $regexMatch: { input: "$roomNo", regex: /^[0-9]+$/ } },
              then: { $toInt: "$roomNo" },
              else: null,
            },
          },
        }
      },
      // --- OPTIMIZATION: Only return necessary fields ---
      {
        $project: {
          name: 1,
          accNo: 1,
          dNo: 1,
          block: 1,
          roomNo: 1
        }
      }
    ]);

    // Group them by Block and RoomNo exactly like the other endpoints
    const groupedUsers = {};
    students.forEach((student) => {
      const roomKey = `${student.block}-${student.roomNo}`;
      if (!groupedUsers[roomKey]) groupedUsers[roomKey] = [];

      groupedUsers[roomKey].push({
        ...student,
        status: "present",
      });
    });
    res.json({ students: groupedUsers });

  } catch (error) {
    console.error("Error in getChristianStudentsByYear:\n", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getStudentsAccordingToAd = async (req, res) => {
  try {
    const adId = req.token.id;
    const user = await User.findById(adId);

    if (!user || !user.roomsIncharge || user.roomsIncharge.length === 0) {
      return res.status(404).json({ error: "No rooms assigned to this AD" });
    }

    const matchConditions = [];

    user.roomsIncharge.forEach((range) => {
      const halls = range.hall || [];
      const from = parseInt(range.from);
      const to = parseInt(range.to);

      if (Array.isArray(halls) && halls.length > 0) {
        matchConditions.push({
          $and: [
            { roomNo: { $in: halls } },
            { roomNo: { $not: { $regex: /\d/ } } },
          ],
        });
      }

      if (!isNaN(from) && !isNaN(to)) {
        matchConditions.push({
          $and: [
            { block: range.block }, // ✅ ensure block matches
            { numericRoom: { $gte: from, $lte: to } },
          ],
        });
      }
    });

    // Fetch all students under this AD
    const students = await Students.aggregate([
      {
        $addFields: {
          numericRoom: {
            $cond: {
              if: { $regexMatch: { input: "$roomNo", regex: /^[0-9]+$/ } },
              then: { $toInt: "$roomNo" },
              else: null,
            },
          },
        },
      },
      {
        $match: { $or: matchConditions },
      },
    ]);

    // ✅ Fetch approved leaves for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const approvedLeaves = await Leave.find({
      status: { $in: ["approved", "approved_by_director"] },
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    }).lean();

    const leaveStudentIds = new Set(approvedLeaves.map(l => l.student.toString()));

    // Group students by Block+Room
    const groupedUsers = {};
    students.forEach((student) => {
      const roomKey = `${student.block}-${student.roomNo}`;
      if (!groupedUsers[roomKey]) groupedUsers[roomKey] = [];

      groupedUsers[roomKey].push({
        ...student,
        leave: leaveStudentIds.has(student._id.toString()),
        status: leaveStudentIds.has(student._id.toString()) ? "leave" : "present",
      });
    });

    res.json({ students: groupedUsers });
  } catch (error) {
    console.error("Error in getStudentsAccordingToAd: \n", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



const getAttendanceRecords = async (req, res) => {
  try {
    const adId = req.token.id;
    const { from, to } = req.query; // Catch the query params

    let start, end;

    if (from && to) {
      // Use the requested date range (Weekly / Monthly)
      start = new Date(from);
      end = new Date(to);
    } else {
      // Fallback to default 8-day range
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 8);
      start.setHours(0, 0, 0, 0);
    }

    const match = {
      ad: adId,
      date: { $gte: start, $lte: end },
    };

    const attendance = await Attendance.find(match)
      .populate("ad", "username")
      .sort({ date: -1 })
      .exec();

    res.status(200).json({ "attendance-records": attendance });
  } catch (error) {
    console.error("Error fetching attendance: \n", error);
    res.status(500).send("Internal Server Error");
  }
};



const updateStudentRoom = async (req, res) => {
  try {
    const adId = req.token.id;
    const { studentId, newRoomNo, newBlock } = req.body;

    if (!studentId || !newRoomNo) {
      return res.status(400).json({ error: "Student ID and new room number are required" });
    }

    // ✅ Check AD permission
    const user = await User.findById(adId);
    if (!user || !user.roomsIncharge || user.roomsIncharge.length === 0) {
      return res.status(403).json({ error: "Not authorized to update student rooms" });
    }

    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // ✅ Check if student belongs to AD’s assigned range
    let authorized = false;
    for (const range of user.roomsIncharge) {
      const from = parseInt(range.from);
      const to = parseInt(range.to);

      if (
        range.block === student.block &&
        !isNaN(from) && !isNaN(to) &&
        student.roomNo.match(/^\d+$/) && // numeric room
        parseInt(student.roomNo) >= from &&
        parseInt(student.roomNo) <= to
      ) {
        authorized = true;
        break;
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: "You are not authorized to change this student’s room" });
    }

    // ✅ Update student room
    student.roomNo = newRoomNo;

    if (newBlock && newBlock.trim() !== "") {
      student.block = newBlock; // only if provided
    }

    if (/^\d+$/.test(newRoomNo)) {
      student.numericRoom = parseInt(newRoomNo);
    } else {
      student.numericRoom = null; // hall-based room
    }

    await student.save();

    res.json({ message: "Room updated successfully", student });
  } catch (error) {
    console.error("Error updating student room: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};







module.exports = {
  markAttendance,
  getStudentsAccordingToAd,
  getAttendanceRecords,
  updateStudentRoom,
  getChristianStudentsAccordingToAd,
  getChristianStudentsByYear
};
