const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const Leave = require("../models/leave.model"); // Keeping this only for the inline GET routes

// IMPORT YOUR SMART CONTROLLER
const leaveController = require("../controllers/leave.controller");

// 📌 1. Student applies for leave (Uses the smart weekday/restricted logic)
router.post("/apply", verifyToken, leaveController.applyLeave);

// 📌 2. Director Action (Approve/Reject)
router.post("/:leaveId/director-action", verifyToken, leaveController.directorAction);

// 📌 3. AD Action (Approve weekend leave / Check director leave)
router.post("/:leaveId/ad-action", verifyToken, leaveController.adAction);

// 📌 4. Get all leaves (For Director Dashboard)
router.get("/all", verifyToken, leaveController.getLeaves);

// 📌 5. Get My Requests (For Student Dashboard)
// Kept inline because it's a simple fetch
router.get("/my-requests", verifyToken, async (req, res) => {
    try {
        const leaves = await Leave.find({ student: req.token.id })
            // Setting strictPopulate to false prevents crashes if the field is missing!
            .populate({ path: 'director', select: 'name', strictPopulate: false })
            .populate({ path: 'assignedAD', select: 'name', strictPopulate: false })
            .populate({ path: 'actionBy', select: 'name username', strictPopulate: false })
            .sort({ appliedAt: -1 });

        res.json({
            success: true,
            leaves,
            message: leaves.length === 0 ? "No leave requests found" : "Leave requests retrieved successfully"
        });

    } catch (err) {
        console.error("Error fetching my leaves:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

// 📌 6. Get Leaves for specific AD
router.get("/ad/leaves", verifyToken, async (req, res) => {
    try {
        if (req.token.role !== "ad") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const User = require("../models/user.model");
        const ad = await User.findById(req.token.id);

        const matchConditions = [];

        // Check if roomsIncharge exists and has ranges
        if (ad.roomsIncharge && ad.roomsIncharge.length > 0) {
            ad.roomsIncharge.forEach((range) => {
                const halls = range.hall || [];
                const from = parseInt(range.from);
                const to = parseInt(range.to);

                if (Array.isArray(halls) && halls.length > 0) {
                    matchConditions.push({ "student.roomNo": { $in: halls } });
                }
                if (!isNaN(from) && !isNaN(to)) {
                    matchConditions.push({ "numericRoom": { $gte: from, $lte: to } });
                }
            });
        }

        // --- NEW SAFETY CHECK: IF NO ROOMS ASSIGNED, RETURN EMPTY ARRAY ---
        if (matchConditions.length === 0) {
            return res.json({ success: true, leaves: [] });
        }

        // Build the pipeline dynamically
        const pipeline = [
            // {
            // Match leaves that either the AD needs to approve, OR Director approved and AD needs to check
            //     $match: {
            //         $or: [
            //             { status: "pending", requiresApprovalFrom: "ad" },
            //             { status: "approved_by_director" }
            //         ]
            //     }
            // },
            {
                $lookup: {
                    from: "students",
                    localField: "student",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },
            {
                $addFields: {
                    numericRoom: {
                        $cond: {
                            if: { $regexMatch: { input: "$student.roomNo", regex: /^[0-9]+$/ } },
                            then: { $toInt: "$student.roomNo" },
                            else: null
                        }
                    }
                }
            },
            // Safely apply the match conditions
            {
                $match: { $or: matchConditions }
            },
            {
                $project: {
                    student: { name: 1, accNo: 1, roomNo: 1, dNo: 1 },
                    reason: 1,
                    place: 1,
                    appliedAt: 1,
                    status: 1,
                    fromDate: 1,
                    toDate: 1,
                    requiresApprovalFrom: 1,
                    isEmergency: 1,
                    checkedByAD: 1 // Crucial for the Flutter app filtering logic
                }
            },
            { $sort: { appliedAt: -1 } }
        ];

        const leaves = await Leave.aggregate(pipeline);

        res.json({ success: true, leaves });
    } catch (err) {
        console.error("Error fetching AD leaves:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

module.exports = router;