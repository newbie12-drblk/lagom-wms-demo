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

// Tạo yêu cầu xóa - cho phép admin và nhập liệu
router.post(
  "/",
  verifyToken,
  checkRole("admin", "nhap_lieu"),
  createDeletionRequest,
);

// Lấy yêu cầu của tôi - bất kỳ user nào đã đăng nhập
router.get("/my", verifyToken, getMyDeletionRequests);

// Lấy tất cả yêu cầu - chỉ admin
router.get("/", verifyToken, checkRole("admin"), getAllDeletionRequests);

// Duyệt yêu cầu xóa - chỉ admin
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("admin"),
  approveDeletionRequest,
);

// Từ chối yêu cầu xóa - chỉ admin
router.put(
  "/:id/reject",
  verifyToken,
  checkRole("admin"),
  rejectDeletionRequest,
);

module.exports = router;
