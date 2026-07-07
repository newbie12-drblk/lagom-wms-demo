const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const Inventory = require("../models/Inventory");
const Receipt = require("../models/Receipt");
const Export = require("../models/Export");
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
        Receipt.getPendingApprovals(),
        Export.getPendingApprovals(),
        EditRequest.getAllRequests("pending"),
        DeletionRequest.getAllRequests("pending"),
      ]);

      console.log("📊 Dashboard stats:");
      console.log("  - Pending Products:", pendingProducts.length);
      console.log("  - Pending Receipts:", pendingReceipts.length);
      console.log("  - Pending Exports:", pendingExports.length);
      console.log("  - Pending Edits:", pendingEdits.length);
      console.log("  - Pending Deletions:", pendingDeletions.length);

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
