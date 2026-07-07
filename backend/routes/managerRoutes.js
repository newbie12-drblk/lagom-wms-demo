const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const db = require("../config/database");

const router = express.Router();

// Dashboard stats cho Quản lý
router.get(
  "/dashboard/stats",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      console.log("📊 Fetching dashboard stats...");

      // Lấy số lượng sản phẩm chờ duyệt
      const [pendingProducts] = await db.execute(
        "SELECT COUNT(*) as count FROM inventory WHERE status = 'pending'",
      );

      // Lấy số lượng phiếu nhập chờ duyệt
      const [pendingReceipts] = await db.execute(
        "SELECT COUNT(*) as count FROM receipts WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // Lấy số lượng phiếu xuất chờ duyệt
      const [pendingExports] = await db.execute(
        "SELECT COUNT(*) as count FROM exports WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // Lấy số lượng yêu cầu chỉnh sửa chờ duyệt
      const [pendingEdits] = await db.execute(
        "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'",
      );

      // Lấy số lượng yêu cầu xóa chờ duyệt
      const [pendingDeletions] = await db.execute(
        "SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'",
      );

      const data = {
        pendingProducts: pendingProducts[0]?.count || 0,
        pendingReceipts: pendingReceipts[0]?.count || 0,
        pendingExports: pendingExports[0]?.count || 0,
        pendingEdits: pendingEdits[0]?.count || 0,
        pendingDeletions: pendingDeletions[0]?.count || 0,
      };

      console.log("📊 Stats result:", data);

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error("❌ Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server: " + error.message,
      });
    }
  },
);

module.exports = router;
