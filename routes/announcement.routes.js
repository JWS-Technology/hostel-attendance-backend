const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const announcementController = require("../controllers/announcement.controller");

router.post("/create", verifyToken, announcementController.createAnnouncement);
router.get("/all", verifyToken, announcementController.getAnnouncements);

module.exports = router;