const RestrictedDate = require("../models/restrictedDate.model");

// 📌 Get all future restricted dates
exports.getRestrictedDates = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const dates = await RestrictedDate.find({ date: { $gte: today } })
            .sort({ date: 1 }); // Sort chronologically

        res.json({ success: true, dates });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};

// 📌 Add a new restricted date (Director Only)
exports.addRestrictedDate = async (req, res) => {
    try {
        if (req.token.role !== "director") {
            return res.status(403).json({ error: "Only Directors can restrict dates." });
        }

        const { date, reason } = req.body;
        if (!date || !reason) return res.status(400).json({ error: "Date and reason required." });

        const restrictedDate = new RestrictedDate({
            date: new Date(date),
            reason,
            addedBy: req.token.id
        });

        await restrictedDate.save();
        res.status(201).json({ success: true, restrictedDate });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 📌 Remove a restricted date (Director Only)
exports.removeRestrictedDate = async (req, res) => {
    try {
        if (req.token.role !== "director") {
            return res.status(403).json({ error: "Only Directors can remove restricted dates." });
        }
        await RestrictedDate.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Date unrestricted." });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};