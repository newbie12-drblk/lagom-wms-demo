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

      // 1. Sản phẩm chờ duyệt - Lấy từ bảng approval_requests (yêu cầu thêm sản phẩm)
      const [approvalResult] = await db.execute(
        "SELECT COUNT(*) as count FROM approval_requests WHERE status = 'pending'",
      );

      // 2. Nhập hàng chờ duyệt - Lấy từ bảng receipts
      const [receiptResult] = await db.execute(
        "SELECT COUNT(*) as count FROM receipts WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // 3. Xuất kho chờ duyệt - Lấy từ bảng exports
      const [exportResult] = await db.execute(
        "SELECT COUNT(*) as count FROM exports WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      // 4. Chỉnh sửa chờ duyệt - Lấy từ bảng edit_requests
      const [editResult] = await db.execute(
        "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'",
      );

      // 5. Xóa chờ duyệt - Lấy từ bảng deletion_requests
      const [deleteResult] = await db.execute(
        "SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'",
      );

      // 6. Yêu cầu thêm sản phẩm (cũ) - Lấy từ bảng inventory
      const [productResult] = await db.execute(
        "SELECT COUNT(*) as count FROM inventory WHERE status = 'pending'",
      );

      const data = {
        pendingProducts: parseInt(approvalResult[0]?.count || 0), // Sản phẩm chờ duyệt = approval_requests
        pendingReceipts: parseInt(receiptResult[0]?.count || 0),
        pendingExports: parseInt(exportResult[0]?.count || 0),
        pendingEdits: parseInt(editResult[0]?.count || 0),
        pendingDeletions: parseInt(deleteResult[0]?.count || 0),
        pendingInventoryProducts: parseInt(productResult[0]?.count || 0), // Dùng cho inventory cũ
      };

      console.log("📊 Stats:", JSON.stringify(data, null, 2));

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
