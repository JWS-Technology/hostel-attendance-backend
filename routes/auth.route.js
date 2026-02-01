const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// middleware
const {
  verifyToken,
  isUserLoggedIn,
} = require("../middleware/auth.middleware");

// controllers
const { userLogin, logout, getMe } = require("../controllers/auth.controller");

router.post("/login", isUserLoggedIn, userLogin); // POST /api/auth/login
router.get("/logout", logout); // GET /api/auth/logout
router.get("/me", verifyToken, getMe); // ✅ Protected by token

module.exports = router;
