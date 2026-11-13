const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const Admin = require("../models/Admin");
const { cookieOptions } = require("../middleware/authMiddleware");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

async function login(req, res, next) {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body
    : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 200) {
    return res.status(400).json({ error: "Enter a valid email address and password." });
  }

  try {
    const admin = await Admin.findByEmail(email);
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const token = jwt.sign(
      { sub: String(admin.id), email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h", issuer: "arts-coaching-fees", audience: "arts-coaching-admin" },
    );
    return res
      .cookie("admin_session", token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 })
      .json({ admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.json({ admin: { id: Number(req.user.sub), email: req.user.email } });
}

function logout(_req, res) {
  res.clearCookie("admin_session", cookieOptions());
  return res.status(204).end();
}

module.exports = { login, loginLimiter, me, logout };
