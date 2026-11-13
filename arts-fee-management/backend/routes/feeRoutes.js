const { Router } = require("express");
const { collectFee, downloadReceipt, paymentHistory, searchStudents } = require("../controllers/feeController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

router.use(requireAuth);
router.get("/students", searchStudents);
router.get("/history", paymentHistory);
router.get("/:id/receipt", downloadReceipt);
router.post("/", collectFee);

module.exports = router;
