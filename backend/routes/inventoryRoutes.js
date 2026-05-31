const express = require("express");
const {
  getAllInventory,
  getProductByMaHang,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
} = require("../controllers/inventoryController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.get("/", verifyToken, getAllInventory);
router.get("/stats", verifyToken, getStats);
router.get("/categories", verifyToken, getCategories);
router.get("/product/:maHang", verifyToken, getProductByMaHang);

// Tạo sản phẩm - chỉ admin và nhập liệu (nhưng nhập liệu phải qua approval)
router.post("/", verifyToken, checkRole("admin", "nhap_lieu"), createProduct);

// CẬP NHẬT - cho phép admin, kế toán, quản lý kho, quản lý (NHẬP LIỆU KHÔNG ĐƯỢC)
router.put(
  "/:id",
  verifyToken,
  checkRole("admin", "ke_toan", "quan_ly_kho", "quan_ly"),
  updateProduct,
);

// Xóa - chỉ admin
router.delete("/:id", verifyToken, checkRole("admin"), deleteProduct);

module.exports = router;
