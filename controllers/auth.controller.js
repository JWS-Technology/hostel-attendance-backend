const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = require("../models/user.model");
const Student = require("../models/student.model");
const RefreshToken = require("../models/refreshToken.model");

const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
};

exports.login = async (req, res) => {
  try {
    const { username, password, device } = req.body;

    if (!username || !password || !device) {
      return res.status(400).json({ error: "Missing fields" });
    }

    let account = await User.findOne({ username });
    let role = null;
    let userType = "User";

    if (account) {
      const ok = await bcrypt.compare(password, account.password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      role = account.role;
    } else {
      account = await Student.findOne({ dNo: username });
      if (!account || account.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      role = "student";
      userType = "Student";
    }

    const accessToken = generateAccessToken({
      id: account._id,
      role
    });

    const refreshToken = crypto.randomBytes(40).toString("hex");

    await RefreshToken.create({
      user: account._id,
      userType,
      token: refreshToken,
      device,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: account._id,
        name: account.username || account.name,
        role
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const logout = (req, res) => {

  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: 0,
  });
  res.status(200).json({ message: "Logout successful" });
};

const getMe = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await User.findById(decoded.id).select("-password");

    if (!user) {
      user = await Student.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);


  } catch (error) {
    console.error("❌ Error in getMe controller:\n", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { userLogin, logout, getMe };
