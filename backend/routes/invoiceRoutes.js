const express = require("express");
const {
  createInvoiceRequest,
  getPendingInvoices,
  getAllInvoices,
  approveInvoice,
  rejectInvoice,
} = require("../controllers/invoiceController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.post("/", verifyToken, checkRole("admin"), createInvoiceRequest);
router.get(
  "/pending",
  verifyToken,
  checkRole("quan_ly", "admin"),
  getPendingInvoices,
);
router.get("/", verifyToken, checkRole("quan_ly", "admin"), getAllInvoices);
router.put(
  "/:id/approve",
  verifyToken,
  checkRole("quan_ly", "admin"),
  approveInvoice,
);
router.put(
  "/:id/reject",
  verifyToken,
  checkRole("quan_ly", "admin"),
  rejectInvoice,
);

module.exports = router;
