// backend/routes/inventoryRoutes.js
const express = require("express");
const {
  getAllInventory,
  getProductByMaHang,
  getCategories,
  getPendingProducts,
  createProduct,
  approveProduct,
  rejectProduct,
  getStats,
} = require("../controllers/inventoryController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ========== LẤY DỮ LIỆU ==========
router.get("/", verifyToken, getAllInventory);
router.get("/stats", verifyToken, getStats);
router.get("/categories", verifyToken, getCategories);
router.get("/product/:maHang", verifyToken, getProductByMaHang);

// ========== QUẢN LÝ XEM CHỜ DUYỆT ==========
router.get("/pending", verifyToken, checkRole("quan_ly"), getPendingProducts);

// ========== ADMIN TẠO YÊU CẦU ==========
router.post("/", verifyToken, checkRole("admin"), createProduct);

// ========== QUẢN LÝ DUYỆT / TỪ CHỐI ==========
router.put("/:id/approve", verifyToken, checkRole("quan_ly"), approveProduct);
router.put("/:id/reject", verifyToken, checkRole("quan_ly"), rejectProduct);

module.exports = router;
