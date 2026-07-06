const express = require("express");
const {
  createReceiptRequest,
  getPendingReceiptRequests,
  getAllReceiptRequests,
  approveReceiptRequest,
  rejectReceiptRequest,
  getReceiptRequestById,
} = require("../controllers/receiptRequestController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// Admin tạo đề nghị nhập hàng
router.post("/", verifyToken, checkRole("admin"), createReceiptRequest);

// Quản lý xem danh sách
router.get(
  "/pending",
  verifyToken,
  checkRole("quan_ly"),
  getPendingReceiptRequests,
);
router.get("/", verifyToken, checkRole("quan_ly"), getAllReceiptRequests);
router.get("/:id", verifyToken, checkRole("quan_ly"), getReceiptRequestById);

// Quản lý duyệt/từ chối
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveReceiptRequest,
);
router.put(
  "/:id/reject",
  verifyToken,
  checkRole("quan_ly"),
  rejectReceiptRequest,
);

module.exports = router;
