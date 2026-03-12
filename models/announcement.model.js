const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["general", "alert", "event", "fee"],
        default: "general"
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Points to the AD or Director who posted it
        required: true
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Announcement", announcementSchema);