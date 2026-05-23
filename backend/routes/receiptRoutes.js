const express = require("express");
const {
  getAllReceipts,
  getReceiptById,
  createReceipt,
  updateReceiptStatus,
  getPendingReceipts,
  deleteReceipt,
} = require("../controllers/receiptController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.get("/", verifyToken, getAllReceipts);
router.get(
  "/pending",
  verifyToken,
  checkRole("admin", "ke_toan", "quan_ly"),
  getPendingReceipts,
);
router.get("/:id", verifyToken, getReceiptById);
router.post(
  "/",
  verifyToken,
  checkRole("admin", "quan_ly_kho", "quan_ly"),
  createReceipt,
);
router.put(
  "/:id/status",
  verifyToken,
  checkRole("admin", "ke_toan", "quan_ly"),
  updateReceiptStatus,
);
router.delete("/:id", verifyToken, checkRole("admin"), deleteReceipt);

module.exports = router;
