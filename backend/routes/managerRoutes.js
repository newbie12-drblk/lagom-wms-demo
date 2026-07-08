const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const db = require("../config/database");

const router = express.Router();

router.get(
  "/dashboard/stats",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      console.log("📊 Fetching dashboard stats...");

      // Đếm sản phẩm chờ duyệt
      const [productResult] = await db.execute(
        "SELECT COUNT(*) as count FROM inventory WHERE status = 'pending'",
      );

      // Đếm phiếu nhập chờ duyệt
      const [receiptResult] = await db.execute(
        "SELECT COUNT(*) as count FROM receipts WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // Đếm phiếu xuất chờ duyệt
      const [exportResult] = await db.execute(
        "SELECT COUNT(*) as count FROM exports WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // Đếm yêu cầu chỉnh sửa
      const [editResult] = await db.execute(
        "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'",
      );

      // Đếm yêu cầu xóa
      const [deleteResult] = await db.execute(
        "SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'",
      );

      const data = {
        pendingProducts: parseInt(productResult[0]?.count || 0),
        pendingReceipts: parseInt(receiptResult[0]?.count || 0),
        pendingExports: parseInt(exportResult[0]?.count || 0),
        pendingEdits: parseInt(editResult[0]?.count || 0),
        pendingDeletions: parseInt(deleteResult[0]?.count || 0),
      };

      console.log("📊 Stats result:", JSON.stringify(data, null, 2));

      res.status(200).json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error("❌ Dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server",
      });
    }
  },
);

module.exports = router;
