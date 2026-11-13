const { Router } = require("express");
const { exportReport, getReport, searchStudents } = require("../controllers/reportController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

router.use(requireAuth);
router.get("/students", searchStudents);
router.get("/export", exportReport);
router.get("/", getReport);

module.exports = router;
