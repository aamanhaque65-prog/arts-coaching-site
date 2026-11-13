const { Router } = require("express");
const {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} = require("../controllers/studentController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

router.use(requireAuth);
router.get("/", listStudents);
router.get("/:id", getStudent);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

module.exports = router;
