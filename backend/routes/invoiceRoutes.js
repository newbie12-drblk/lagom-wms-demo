const express = require("express");
const {
  getExportsWithoutInvoice,
  createInvoiceRequest,
  getPendingInvoices,
  getAllInvoiceRequests,
  getInvoiceRequestById,
  approveInvoice,
  approveMultipleInvoices,
  rejectInvoice,
  deleteInvoiceRequest,
} = require("../controllers/invoiceController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

// ========== ADMIN ROUTES ==========
router.get(
  "/exports-without-invoice",
  verifyToken,
  checkRole("admin"),
  getExportsWithoutInvoice,
);

router.post("/requests", verifyToken, checkRole("admin"), createInvoiceRequest);

router.delete(
  "/requests/:id",
  verifyToken,
  checkRole("admin"),
  deleteInvoiceRequest,
);

// ========== QUẢN LÝ ROUTES ==========
router.get(
  "/requests/pending",
  verifyToken,
  checkRole("quan_ly"),
  getPendingInvoices,
);

router.get(
  "/requests",
  verifyToken,
  checkRole("quan_ly"),
  getAllInvoiceRequests,
);

router.get(
  "/requests/:id",
  verifyToken,
  checkRole("quan_ly"),
  getInvoiceRequestById,
);

// Duyệt/từ chối từng cái
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

// ✅ Duyệt hàng loạt
router.put(
  "/requests/approve-multiple",
  verifyToken,
  checkRole("quan_ly"),
  approveMultipleInvoices,
);

module.exports = router;
