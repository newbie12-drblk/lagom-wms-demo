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
router.get("/pending", verifyToken, checkRole("quan_ly"), getPendingInvoices);
router.get("/", verifyToken, checkRole("quan_ly"), getAllInvoices);
router.put("/:id/approve", verifyToken, checkRole("quan_ly"), approveInvoice);
router.put("/:id/reject", verifyToken, checkRole("quan_ly"), rejectInvoice);

module.exports = router;
