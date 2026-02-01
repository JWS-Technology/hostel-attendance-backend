const jwt = require("jsonwebtoken");

const isUserLoggedIn = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (token) {
      return res.status(200).json({ message: "already logged In" });
    }

    next();
  } catch (error) {
    console.log("Error in isUserLoggedIn middleware \n" + error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyAccessToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token expired" });
  }
};

module.exports = { verifyAccessToken, isUserLoggedIn };
