const mongoose = require("mongoose");

const restrictedDateSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    reason: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RestrictedDate", restrictedDateSchema);