const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const restrictedController = require("../controllers/restricted.controller");

router.get("/all", verifyToken, restrictedController.getRestrictedDates);
router.post("/add", verifyToken, restrictedController.addRestrictedDate);
router.delete("/:id", verifyToken, restrictedController.removeRestrictedDate);

module.exports = router;