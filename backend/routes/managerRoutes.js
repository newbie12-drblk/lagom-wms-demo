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

      // Đếm yêu cầu chỉnh sửa - DÙNG TRY CATCH
      let editCount = 0;
      try {
        const [editResult] = await db.execute(
          "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'",
        );
        editCount = editResult[0]?.count || 0;
      } catch (err) {
        console.log("⚠️ Bảng edit_requests chưa tồn tại");
      }

      // Đếm yêu cầu xóa - DÙNG TRY CATCH
      let deleteCount = 0;
      try {
        const [deleteResult] = await db.execute(
          "SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'",
        );
        deleteCount = deleteResult[0]?.count || 0;
      } catch (err) {
        console.log("⚠️ Bảng deletion_requests chưa tồn tại");
      }

      const data = {
        pendingProducts: parseInt(productResult[0]?.count || 0),
        pendingReceipts: parseInt(receiptResult[0]?.count || 0),
        pendingExports: parseInt(exportResult[0]?.count || 0),
        pendingEdits: editCount,
        pendingDeletions: deleteCount,
      };

      console.log("📊 Stats:", data);

      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      console.error("❌ Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = router;
