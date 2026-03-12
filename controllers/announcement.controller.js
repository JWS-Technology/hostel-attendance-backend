const Announcement = require("../models/announcement.model");

// Create a new announcement (Only ADs and Directors)
exports.createAnnouncement = async (req, res) => {
    try {
        console.log("req came");
        const { title, message, type } = req.body;
        const userId = req.token.id;
        const userRole = req.token.role;

        // Security check
        if (userRole !== "ad" && userRole !== "director") {
            return res.status(403).json({ error: "Only Directors and ADs can post announcements." });
        }

        if (!title || !message) {
            return res.status(400).json({ error: "Title and message are required." });
        }

        const announcement = new Announcement({
            title,
            message,
            type: type || "general",
            postedBy: userId
        });

        await announcement.save();

        // TODO: In Phase 2, we will trigger Firebase Push Notifications right here!

        res.status(201).json({ success: true, announcement, message: "Announcement published!" });
    } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Get all announcements (For everyone)
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate("postedBy", "name username role") // Get the name and role of who posted it
            .sort({ createdAt: -1 }); // Newest first
        // console.log(announcements)
        res.json({ success: true, announcements });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};