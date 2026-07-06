const express = require("express");
const {
  getAllInventory,
  getProductByMaHang,
  getPendingProducts,
  createProduct,
  approveProduct,
  rejectProduct,
  getStats,
} = require("../controllers/inventoryController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// Tất cả user đã đăng nhập đều xem được
router.get("/", verifyToken, getAllInventory);
router.get("/stats", verifyToken, getStats);
router.get("/product/:maHang", verifyToken, getProductByMaHang);

// Quản lý xem danh sách chờ duyệt
router.get("/pending", verifyToken, checkRole("quan_ly"), getPendingProducts);

// Admin tạo yêu cầu nhập sản phẩm (chờ duyệt)
router.post("/", verifyToken, checkRole("admin"), createProduct);

// Quản lý duyệt/từ chối
router.put("/:id/approve", verifyToken, checkRole("quan_ly"), approveProduct);
router.put("/:id/reject", verifyToken, checkRole("quan_ly"), rejectProduct);

module.exports = router;
