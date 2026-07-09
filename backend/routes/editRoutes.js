const express = require("express");
const {
  createEditRequest,
  getAllEditRequests,
  getMyEditRequests,
  approveEditRequest,
  rejectEditRequest,
} = require("../controllers/editController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ✅ Admin tạo yêu cầu chỉnh sửa
router.post("/", verifyToken, checkRole("admin"), createEditRequest);

// Admin lấy yêu cầu của mình
router.get("/my", verifyToken, checkRole("admin"), getMyEditRequests);

// Quản lý lấy tất cả yêu cầu
router.get("/", verifyToken, checkRole("quan_ly"), getAllEditRequests);

// Quản lý duyệt/từ chối
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveEditRequest,
);
router.put("/:id/reject", verifyToken, checkRole("quan_ly"), rejectEditRequest);

module.exports = router;
