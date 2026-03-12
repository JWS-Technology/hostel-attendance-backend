const LeaveRequest = require("../models/leave.model"); // Stick to LeaveRequest
const User = require("../models/user.model");
const RestrictedDate = require("../models/restrictedDate.model");

// --- NEW SMART WEEKEND LOGIC ---
const isNormalWeekendLeave = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Prevent students from booking Friday to the *next* Monday (which is over a week)
    const durationDays = (end - start) / (1000 * 60 * 60 * 24);
    if (durationDays > 4) return false;

    const startDay = start.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const endDay = end.getDay();
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();

    // 2. Validate Departure Time (Must be Fri after 18:30, or Sat/Sun)
    let validStart = false;
    if (startDay === 5) { // Friday
        if (startHour > 18 || (startHour === 18 && startMin >= 30)) {
            validStart = true;
        }
    } else if (startDay === 6 || startDay === 0) { // Saturday or Sunday
        validStart = true;
    }

    // 3. Validate Return Time (Must be Sat/Sun, or Monday before 20:30 / 8:30 PM)
    // Note: If you meant 8:30 AM, change `20` to `8` below!
    let validEnd = false;
    if (endDay === 6 || endDay === 0) { // Saturday or Sunday
        validEnd = true;
    } else if (endDay === 1) { // Monday
        if (endHour < 20 || (endHour === 20 && endMin <= 30)) {
            validEnd = true;
        }
    }

    // If both start and end fit inside the window, it is a normal weekend leave.
    return validStart && validEnd;
};

// 📌 1. Student applies for leave
exports.applyLeave = async (req, res) => {
    try {
        const { fromDate, toDate, place, reason, isEmergency } = req.body;
        const studentId = req.token.id;

        if (!fromDate || !toDate || !place || !reason) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);

        // --- UPDATED ROUTING LOGIC ---
        let routeTo = "director"; // Default to Director

        // If it perfectly matches the Friday 6:30 PM -> Monday 8:30 PM window, route to AD
        if (isNormalWeekendLeave(start, end)) {
            routeTo = "ad";
        }

        // --- THE TIMEZONE FIX ---
        // A restricted date represents midnight of that day. 
        // We expand the search window by exactly 24 hours before the student's departure time 
        // to catch the midnight timestamp of the day they are leaving!
        const startWindow = new Date(start.getTime() - (24 * 60 * 60 * 1000));

        const restrictedDates = await RestrictedDate.find({
            date: { $gt: startWindow, $lte: end }
        });

        if (restrictedDates.length > 0) {
            if (!isEmergency) {
                return res.status(403).json({
                    error: "Leave spans across restricted dates. Only emergency leaves are permitted and require Director's approval.",
                    restrictedReason: restrictedDates[0].reason
                });
            }
            // If they checked emergency, force it to the Director
            routeTo = "director";
        }

        // Save the leave
        const leave = new LeaveRequest({
            student: studentId,
            fromDate: start,
            toDate: end,
            place,
            reason,
            isEmergency,
            requiresApprovalFrom: routeTo
        });

        await leave.save();
        res.status(201).json({
            success: true,
            message: `Leave request submitted. Routed to ${routeTo.toUpperCase()} for approval.`,
            leave
        });

    } catch (error) {
        console.error("Error applying leave:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 📌 2. Director Approves/Rejects (Weekday or Emergency)
exports.directorAction = async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { action, rejectionReason, assignedAD } = req.body;

        const leave = await LeaveRequest.findById(leaveId);
        if (!leave) return res.status(404).json({ error: "Leave not found" });

        // Ensure this leave was actually meant for the director
        if (leave.requiresApprovalFrom !== "director") {
            return res.status(400).json({ error: "This leave does not require Director approval." });
        }

        if (action === "approve") {
            leave.status = "approved_by_director";
            leave.director = req.token.id;
            leave.assignedAD = assignedAD; // Optionally assign it to an AD for checking
        } else if (action === "reject") {
            leave.status = "rejected";
            leave.rejectionReason = rejectionReason;
            leave.director = req.token.id;
        } else {
            return res.status(400).json({ error: "Invalid action" });
        }

        await leave.save();
        res.json({ success: true, message: `Leave ${action}d successfully`, leave });
    } catch (error) {
        console.error("Error in director action:", error);
        res.status(500).json({ error: "Error in director action" });
    }
};

// 📌 3. AD Action (Approve weekend leave OR Check director leave)
exports.adAction = async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { action, rejectionReason } = req.body; // action = "approve", "reject", or "check"

        const leave = await LeaveRequest.findById(leaveId);
        if (!leave) return res.status(404).json({ error: "Leave not found" });

        // SCENARIO A: This is a normal weekend leave that the AD needs to approve/reject
        if (leave.requiresApprovalFrom === "ad" && leave.status === "pending") {
            if (action === "approve") {
                leave.status = "approved_by_ad";
                leave.assignedAD = req.token.id;
            } else if (action === "reject") {
                leave.status = "rejected";
                leave.rejectionReason = rejectionReason;
                leave.assignedAD = req.token.id;
            } else {
                return res.status(400).json({ error: "Invalid action for pending AD leave" });
            }
        }
        // SCENARIO B: The Director already approved this, the AD is just acknowledging ("checking") it
        else if (leave.status === "approved_by_director") {
            if (action === "check") {
                leave.checkedByAD = true;
            } else {
                return res.status(400).json({ error: "Director already approved this. You can only 'check' it." });
            }
        }
        else {
            return res.status(400).json({ error: "No action available for this leave at its current stage." });
        }

        await leave.save();
        res.json({ success: true, message: `Leave ${action} processed`, leave });
    } catch (error) {
        console.error("Error in AD action:", error);
        res.status(500).json({ error: "Error in AD action" });
    }
};

// 📌 4. Fetch all leaves
exports.getLeaves = async (req, res) => {
    try {
        const leaves = await LeaveRequest.find()
            // 1. Send all the required student data to Flutter to build the UI cards
            .populate({
                path: "student",
                select: "name accNo roomNo dNo block",
                strictPopulate: false
            })
            // 2. Safely populate the approver fields without crashing Mongoose
            .populate({ path: "actionBy", select: "name", strictPopulate: false })
            .populate({ path: "director", select: "name", strictPopulate: false })
            .populate({ path: "assignedAD", select: "name", strictPopulate: false })
            .sort({ appliedAt: -1 }); // Newest first

        res.json({ success: true, leaves });
    } catch (error) {
        console.error("Error fetching all leaves:\n", error);
        res.status(500).json({ error: "Error fetching leaves", details: error.message });
    }
};