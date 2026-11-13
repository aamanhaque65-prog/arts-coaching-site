const { Router } = require("express");
const { login, loginLimiter, logout, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

module.exports = router;
