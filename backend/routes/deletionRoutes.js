const express = require("express");
const {
  createDeletionRequest,
  getAllDeletionRequests,
  getMyDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
} = require("../controllers/deletionController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ✅ Admin tạo yêu cầu xóa (gửi array productIds)
router.post("/", verifyToken, checkRole("admin"), createDeletionRequest);

// Admin lấy yêu cầu của mình
router.get("/my", verifyToken, checkRole("admin"), getMyDeletionRequests);

// Quản lý lấy tất cả yêu cầu
router.get("/", verifyToken, checkRole("quan_ly"), getAllDeletionRequests);

// Quản lý duyệt/từ chối
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveDeletionRequest,
);
router.put(
  "/:id/reject",
  verifyToken,
  checkRole("quan_ly"),
  rejectDeletionRequest,
);

module.exports = router;
