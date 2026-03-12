const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    place: { type: String, required: true }, // NEW: Where they are going
    reason: { type: String, required: true },
    isEmergency: { type: Boolean, default: false }, // NEW: Student can flag as emergency

    // NEW: Who is responsible for approving this specific leave?
    requiresApprovalFrom: {
        type: String,
        enum: ["ad", "director"],
        required: true
    },

    status: {
        type: String,
        // Updated to handle both AD and Director approvals
        enum: ["pending", "approved_by_ad", "approved_by_director", "rejected"],
        default: "pending",
    },

    rejectionReason: { type: String },

    // Who actually took action
    actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    appliedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Leave", leaveSchema);