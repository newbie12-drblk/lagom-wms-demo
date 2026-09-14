// backend/routes/invoiceRoutes.js
const express = require("express");
const {
  searchProduct,
  createInvoiceRequest,
  getAllInvoiceRequests,
  getMyInvoiceRequests,
  getPendingInvoices,
  getInvoiceRequestById,
  approveInvoice,
  approveMultipleInvoices,
  rejectInvoice,
  deleteInvoiceRequest,
} = require("../controllers/invoiceController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ========== ADMIN ==========
// Tìm sản phẩm (theo mã hàng HOẶC số hợp đồng)
router.get("/search-product", verifyToken, checkRole("admin"), searchProduct);

// Admin xem danh sách HĐ của mình
router.get(
  "/requests/my",
  verifyToken,
  checkRole("admin"),
  getMyInvoiceRequests,
);

// Admin tạo yêu cầu hóa đơn
router.post("/requests", verifyToken, checkRole("admin"), createInvoiceRequest);

// Admin xóa yêu cầu (chỉ khi pending)
router.delete(
  "/requests/:id",
  verifyToken,
  checkRole("admin"),
  deleteInvoiceRequest,
);

// ========== QUẢN LÝ ==========
// Lấy danh sách hóa đơn chờ duyệt
router.get(
  "/requests/pending",
  verifyToken,
  checkRole("quan_ly"),
  getPendingInvoices,
);

// Lấy tất cả
router.get(
  "/requests",
  verifyToken,
  checkRole("quan_ly"),
  getAllInvoiceRequests,
);

// Duyệt hàng loạt — PHẢI đặt TRƯỚC /:id/approve
router.put(
  "/requests/approve-multiple",
  verifyToken,
  checkRole("quan_ly"),
  approveMultipleInvoices,
);

// Chi tiết 1 yêu cầu
router.get(
  "/requests/:id",
  verifyToken,
  checkRole("quan_ly"),
  getInvoiceRequestById,
);

// Duyệt 1
router.put(
  "/requests/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveInvoice,
);

// Từ chối
router.put(
  "/requests/:id/reject",
  verifyToken,
  checkRole("quan_ly"),
  rejectInvoice,
);

module.exports = router;
