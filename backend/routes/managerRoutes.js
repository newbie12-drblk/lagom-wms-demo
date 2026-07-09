const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const db = require("../config/database");

const router = express.Router();

// ============================================================
// DASHBOARD STATS
// ============================================================
router.get(
  "/dashboard/stats",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      console.log("📊 Fetching dashboard stats...");

      const [approvalResult] = await db.execute(
        "SELECT COUNT(*) as count FROM approval_requests WHERE status = 'pending'",
      );

      const [receiptResult] = await db.execute(
        "SELECT COUNT(*) as count FROM receipts WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      const [exportResult] = await db.execute(
        "SELECT COUNT(*) as count FROM exports WHERE status IN ('pending', 'awaiting_confirmation')",
      );

      const [editResult] = await db.execute(
        "SELECT COUNT(*) as count FROM edit_requests WHERE status = 'pending'",
      );

      const [deleteResult] = await db.execute(
        "SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'",
      );

      const data = {
        pendingProducts: parseInt(approvalResult[0]?.count || 0),
        pendingReceipts: parseInt(receiptResult[0]?.count || 0),
        pendingExports: parseInt(exportResult[0]?.count || 0),
        pendingEdits: parseInt(editResult[0]?.count || 0),
        pendingDeletions: parseInt(deleteResult[0]?.count || 0),
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

// ============================================================
// QUẢN LÝ USER - LẤY DANH SÁCH
// ============================================================
router.get("/users", verifyToken, checkRole("quan_ly"), async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.fullName, u.email, u.roleId, u.isActive, u.createdAt, u.lastLoginAt,
                p.canEditTenThuongMai, p.canEditMaHang, p.canEditDVT, p.canEditHangSX,
                p.canEditPhanLoai, p.canEditGiaNhap, p.canEditSoHopDongNhap, p.canEditSoHoaDonNhap,
                p.canEditSoHoaDonXuat, p.canEditNgayNhapHD, p.canEditNgayXuatHD, p.canEditGhiChu,
                p.canCreateReceipt, p.canCreateExport, p.canViewAll,
                p.canDeleteProduct, p.canEditProduct, p.canAddProduct
         FROM users u
         LEFT JOIN user_permissions p ON u.id = p.userId
         ORDER BY u.createdAt DESC`,
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
});

// ============================================================
// QUẢN LÝ USER - TẠO USER MỚI
// ============================================================
router.post("/users", verifyToken, checkRole("quan_ly"), async (req, res) => {
  try {
    const { username, password, fullName, email, roleId, permissions } =
      req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập đã tồn tại",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO users (username, password, fullName, email, roleId, isActive)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [username, password, fullName, email || null, roleId || "nhan_vien", 1],
    );

    const userId = result.insertId;

    if (permissions) {
      await db.execute(
        `INSERT INTO user_permissions (
            userId, canEditTenThuongMai, canEditMaHang, canEditDVT, canEditHangSX,
            canEditPhanLoai, canEditGiaNhap, canEditSoHopDongNhap, canEditSoHoaDonNhap,
            canEditSoHoaDonXuat, canEditNgayNhapHD, canEditNgayXuatHD, canEditGhiChu,
            canCreateReceipt, canCreateExport, canViewAll,
            canDeleteProduct, canEditProduct, canAddProduct
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          permissions.canEditTenThuongMai ? 1 : 0,
          permissions.canEditMaHang ? 1 : 0,
          permissions.canEditDVT ? 1 : 0,
          permissions.canEditHangSX ? 1 : 0,
          permissions.canEditPhanLoai ? 1 : 0,
          permissions.canEditGiaNhap ? 1 : 0,
          permissions.canEditSoHopDongNhap ? 1 : 0,
          permissions.canEditSoHoaDonNhap ? 1 : 0,
          permissions.canEditSoHoaDonXuat ? 1 : 0,
          permissions.canEditNgayNhapHD ? 1 : 0,
          permissions.canEditNgayXuatHD ? 1 : 0,
          permissions.canEditGhiChu ? 1 : 0,
          permissions.canCreateReceipt ? 1 : 0,
          permissions.canCreateExport ? 1 : 0,
          permissions.canViewAll ? 1 : 0,
          permissions.canDeleteProduct ? 1 : 0,
          permissions.canEditProduct ? 1 : 0,
          permissions.canAddProduct ? 1 : 0,
        ],
      );
    }

    res.status(200).json({
      success: true,
      message: "Tạo user thành công",
      data: { id: userId },
    });
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
});

// ============================================================
// QUẢN LÝ USER - CẬP NHẬT USER
// ============================================================
router.put(
  "/users/:id",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, email, roleId, isActive, password, permissions } =
        req.body;

      const updates = [];
      const values = [];

      if (fullName !== undefined) {
        updates.push("fullName = ?");
        values.push(fullName);
      }
      if (email !== undefined) {
        updates.push("email = ?");
        values.push(email);
      }
      if (roleId !== undefined) {
        updates.push("roleId = ?");
        values.push(roleId);
      }
      if (isActive !== undefined) {
        updates.push("isActive = ?");
        values.push(isActive ? 1 : 0);
      }
      if (password && password.trim() !== "") {
        updates.push("password = ?");
        values.push(password);
      }

      if (updates.length > 0) {
        values.push(id);
        await db.execute(
          `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
          values,
        );
      }

      if (permissions) {
        const [existing] = await db.execute(
          "SELECT id FROM user_permissions WHERE userId = ?",
          [id],
        );

        const permValues = [
          permissions.canEditTenThuongMai ? 1 : 0,
          permissions.canEditMaHang ? 1 : 0,
          permissions.canEditDVT ? 1 : 0,
          permissions.canEditHangSX ? 1 : 0,
          permissions.canEditPhanLoai ? 1 : 0,
          permissions.canEditGiaNhap ? 1 : 0,
          permissions.canEditSoHopDongNhap ? 1 : 0,
          permissions.canEditSoHoaDonNhap ? 1 : 0,
          permissions.canEditSoHoaDonXuat ? 1 : 0,
          permissions.canEditNgayNhapHD ? 1 : 0,
          permissions.canEditNgayXuatHD ? 1 : 0,
          permissions.canEditGhiChu ? 1 : 0,
          permissions.canCreateReceipt ? 1 : 0,
          permissions.canCreateExport ? 1 : 0,
          permissions.canViewAll ? 1 : 0,
          permissions.canDeleteProduct ? 1 : 0,
          permissions.canEditProduct ? 1 : 0,
          permissions.canAddProduct ? 1 : 0,
        ];

        if (existing.length > 0) {
          await db.execute(
            `UPDATE user_permissions SET
              canEditTenThuongMai = ?, canEditMaHang = ?, canEditDVT = ?, canEditHangSX = ?,
              canEditPhanLoai = ?, canEditGiaNhap = ?, canEditSoHopDongNhap = ?,
              canEditSoHoaDonNhap = ?, canEditSoHoaDonXuat = ?, canEditNgayNhapHD = ?,
              canEditNgayXuatHD = ?, canEditGhiChu = ?,
              canCreateReceipt = ?, canCreateExport = ?, canViewAll = ?,
              canDeleteProduct = ?, canEditProduct = ?, canAddProduct = ?
            WHERE userId = ?`,
            [...permValues, id],
          );
        } else {
          await db.execute(
            `INSERT INTO user_permissions (
              userId, canEditTenThuongMai, canEditMaHang, canEditDVT, canEditHangSX,
              canEditPhanLoai, canEditGiaNhap, canEditSoHopDongNhap, canEditSoHoaDonNhap,
              canEditSoHoaDonXuat, canEditNgayNhapHD, canEditNgayXuatHD, canEditGhiChu,
              canCreateReceipt, canCreateExport, canViewAll,
              canDeleteProduct, canEditProduct, canAddProduct
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, ...permValues],
          );
        }
      }

      res.status(200).json({
        success: true,
        message: "Cập nhật user thành công",
      });
    } catch (error) {
      console.error("❌ Update user error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server",
      });
    }
  },
);

// ============================================================
// QUẢN LÝ USER - XÓA USER
// ============================================================
router.delete(
  "/users/:id",
  verifyToken,
  checkRole("quan_ly"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (parseInt(id) === req.user.userId) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa tài khoản của chính mình",
        });
      }

      await db.execute("DELETE FROM user_permissions WHERE userId = ?", [id]);
      await db.execute("DELETE FROM users WHERE id = ?", [id]);

      res.status(200).json({
        success: true,
        message: "Xóa user thành công",
      });
    } catch (error) {
      console.error("❌ Delete user error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server",
      });
    }
  },
);

module.exports = router;
