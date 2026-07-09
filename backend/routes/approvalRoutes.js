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

// Admin tạo yêu cầu thêm sản phẩm
router.post("/", verifyToken, checkRole("admin"), createApprovalRequest);

// Lấy yêu cầu của tôi
router.get("/my", verifyToken, getMyRequests);

// Quản lý lấy tất cả yêu cầu
router.get("/", verifyToken, checkRole("quan_ly"), getAllRequests);

// Quản lý duyệt/từ chối
router.put("/:id/approve", verifyToken, checkRole("quan_ly"), approveRequest);
router.put("/:id/reject", verifyToken, checkRole("quan_ly"), rejectRequest);

// Admin xóa yêu cầu
router.delete("/:id", verifyToken, checkRole("admin"), deleteRequest);

module.exports = router;
