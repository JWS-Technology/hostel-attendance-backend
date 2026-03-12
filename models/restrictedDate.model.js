const mongoose = require("mongoose");

const restrictedDateSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    reason: { type: String, required: true } // e.g., "Hostel Day", "Exams"
});

module.exports = mongoose.model("RestrictedDate", restrictedDateSchema);