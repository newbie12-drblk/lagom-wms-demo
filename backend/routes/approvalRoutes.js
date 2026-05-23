const express = require("express");
const {
  createApprovalRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest,
  deleteRequest,
} = require("../controllers/approvalController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// Tạo yêu cầu - cho phép admin và nhập liệu
router.post(
  "/",
  verifyToken,
  checkRole("admin", "nhap_lieu"),
  createApprovalRequest,
);

// Lấy yêu cầu của tôi - bất kỳ user nào đã đăng nhập
router.get("/my", verifyToken, getMyRequests);

// Lấy tất cả yêu cầu - chỉ admin
router.get("/", verifyToken, checkRole("admin"), getAllRequests);

// Duyệt/từ chối yêu cầu - chỉ admin
router.put("/:id/approve", verifyToken, checkRole("admin"), approveRequest);
router.put("/:id/reject", verifyToken, checkRole("admin"), rejectRequest);

// Xóa yêu cầu - chỉ admin
router.delete("/:id", verifyToken, checkRole("admin"), deleteRequest);

module.exports = router;
