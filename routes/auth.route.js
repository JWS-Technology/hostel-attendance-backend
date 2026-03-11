const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// middleware
const {
  verifyToken,
  isUserLoggedIn,
} = require("../middleware/auth.middleware");

// controllers
const { userLogin, logout, getMe, getProfile, changePassword } = require("../controllers/auth.controller");

// login user
router.get("/authenticate", (req, res) => {
  const token = req.cookies.token;

  if (token) {
    const data = jwt.verify(token, process.env.JWT_SECRET)
    return res
      .status(200)
      .json({ isLoggedIn: true, role: data.role, message: "User is already login" });
  }
  res.status(200).json({ isLoggedIn: false, message: "User is not logged in" });

});

router.post("/login", isUserLoggedIn, userLogin); // POST /api/auth/login
router.get("/logout", logout); // GET /api/auth/logout
router.get("/me", verifyToken, getMe); // ✅ Protected by token
router.get("/profile", verifyToken, getProfile);
router.post("/change-password", verifyToken, changePassword);

module.exports = router;
