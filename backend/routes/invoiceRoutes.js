const express = require("express");
const {
  getExportsWithoutInvoice,
  createInvoiceRequest,
  getPendingInvoices,
  getAllInvoiceRequests,
  getInvoiceRequestById,
  approveInvoice,
  rejectInvoice,
  deleteInvoiceRequest,
} = require("../controllers/invoiceController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ========== ADMIN ROUTES ==========
// Lấy danh sách phiếu xuất chưa có hóa đơn
router.get(
  "/exports-without-invoice",
  verifyToken,
  checkRole("admin"),
  getExportsWithoutInvoice,
);

// Admin tạo yêu cầu nhập hóa đơn
router.post("/requests", verifyToken, checkRole("admin"), createInvoiceRequest);

// Admin xóa yêu cầu
router.delete(
  "/requests/:id",
  verifyToken,
  checkRole("admin"),
  deleteInvoiceRequest,
);

// ========== QUẢN LÝ ROUTES ==========
// Lấy danh sách hóa đơn chờ duyệt
router.get(
  "/requests/pending",
  verifyToken,
  checkRole("quan_ly"),
  getPendingInvoices,
);

// Lấy tất cả yêu cầu
router.get(
  "/requests",
  verifyToken,
  checkRole("quan_ly"),
  getAllInvoiceRequests,
);

// Lấy chi tiết yêu cầu
router.get(
  "/requests/:id",
  verifyToken,
  checkRole("quan_ly"),
  getInvoiceRequestById,
);

// Quản lý duyệt/từ chối
router.put(
  "/requests/:id/approve",
  verifyToken,
  checkRole("quan_ly"),
  approveInvoice,
);
router.put(
  "/requests/:id/reject",
  verifyToken,
  checkRole("quan_ly"),
  rejectInvoice,
);

module.exports = router;
