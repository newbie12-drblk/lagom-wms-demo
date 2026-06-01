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

// Tạo yêu cầu chỉnh sửa - cho phép admin và nhập liệu
router.post(
  "/",
  verifyToken,
  checkRole("admin", "nhap_lieu"),
  createEditRequest,
);

// Lấy yêu cầu của tôi
router.get("/my", verifyToken, getMyEditRequests);

// Lấy tất cả yêu cầu - chỉ admin
router.get("/", verifyToken, checkRole("admin"), getAllEditRequests);

// Duyệt yêu cầu - chỉ admin
router.put("/:id/approve", verifyToken, checkRole("admin"), approveEditRequest);

// Từ chối yêu cầu - chỉ admin
router.put("/:id/reject", verifyToken, checkRole("admin"), rejectEditRequest);

module.exports = router;
