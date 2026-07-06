const express = require("express");
const {
  createExportRequest,
  getPendingExportRequests,
  getAllExportRequests,
  approveExportRequest,
  rejectExportRequest,
  getExportRequestById,
} = require("../controllers/exportRequestController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// Admin tạo đề nghị xuất kho
router.post("/", verifyToken, checkRole("admin"), createExportRequest);

// Quản lý xem danh sách
router.get(
  "/pending",
  verifyToken,
  checkRole("quan_ly"),
  getPendingExportRequests,
);
router.get("/", verifyToken, checkRole("quan_ly"), getAllExportRequests);
router.get("/:id", verifyToken, checkRole("quan_ly"), getExportRequestById);

// Quản lý duyệt/từ chối
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveExportRequest,
);
router.put(
  "/:id/reject",
  verifyToken,
  checkRole("quan_ly"),
  rejectExportRequest,
);

module.exports = router;
