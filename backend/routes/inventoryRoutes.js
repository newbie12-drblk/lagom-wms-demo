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
router.post("/", verifyToken, checkRole("admin", "nhap_lieu"), createProduct);
router.put("/:id", verifyToken, checkRole("admin", "nhap_lieu"), updateProduct);
router.delete("/:id", verifyToken, checkRole("admin"), deleteProduct);

module.exports = router;
