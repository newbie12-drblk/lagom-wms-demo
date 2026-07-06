const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const Inventory = require("../models/Inventory");
const ReceiptRequest = require("../models/ReceiptRequest");
const ExportRequest = require("../models/ExportRequest");
const EditRequest = require("../models/EditRequest");
const DeletionRequest = require("../models/DeletionRequest");

const router = express.Router();

// Dashboard stats cho Quản lý
router.get(
  "/dashboard/stats",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      const [
        pendingProducts,
        pendingReceipts,
        pendingExports,
        pendingEdits,
        pendingDeletions,
      ] = await Promise.all([
        Inventory.getPending(),
        ReceiptRequest.getPending(),
        ExportRequest.getPending(),
        EditRequest.getAllRequests("pending"),
        DeletionRequest.getAllRequests("pending"),
      ]);

      res.json({
        success: true,
        data: {
          pendingProducts: pendingProducts.length,
          pendingReceipts: pendingReceipts.length,
          pendingExports: pendingExports.length,
          pendingEdits: pendingEdits.length,
          pendingDeletions: pendingDeletions.length,
        },
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },
);

module.exports = router;
