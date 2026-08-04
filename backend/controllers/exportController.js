const db = require("../config/database");
const Export = require("../models/Export");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

const getAllExports = async (req, res) => {
  try {
    const exports = await Export.getAll();
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("Get exports error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getExportById = async (req, res) => {
  try {
    const { id } = req.params;
    const exportItem = await Export.findById(id);
    if (!exportItem) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }
    res.json({ success: true, data: exportItem });
  } catch (error) {
    console.error("Get export by id error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    for (const item of exportData.items || []) {
      const product = await Inventory.findByMaHang(item.maHang);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.maHang} không tồn tại trong kho`,
        });
      }
      if ((product.tonKho || 0) < (item.soLuong || 0)) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.tenThuongMai} tồn kho không đủ (còn ${product.tonKho})`,
        });
      }
    }

    const exportId = await Export.create(exportData, createdBy);
    const exportItem = await Export.findById(exportId);

    if (!exportItem) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu vừa tạo" });
    }

    await Export.updateStatus(exportId, "awaiting_confirmation", null, null);

    await Notification.createForManagers(
      `📤 Phiếu xuất ${exportItem.exportNo} chờ duyệt`,
      `Admin vừa tạo phiếu xuất mới. Vui lòng kiểm tra và duyệt.`,
      "approval",
      exportId,
      "export",
    );

    res.json({
      success: true,
      data: {
        id: exportId,
        status: "awaiting_confirmation",
        items: exportItem.items || [],
      },
      message: "✅ Tạo phiếu xuất thành công! Phiếu đang chờ Quản lý duyệt.",
    });
  } catch (error) {
    console.error("❌ Create export error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// ============================================================
// CẬP NHẬT TRẠNG THÁI PHIẾU XUẤT - FIX SL XUẤT VÀ SỐ HĐ XUẤT
// ============================================================
const updateExportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    const exportItem = await Export.findById(id);
    if (!exportItem) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }

    // Nếu duyệt -> trừ tồn kho và cập nhật số lượng xuất, số HĐ xuất
    if (status === "approved") {
      const items = exportItem.items || [];

      for (const item of items) {
        // ✅ TRỪ TỒN KHO
        await Inventory.updateStock(item.maHang, item.soLuong, "export");

        // ✅ CẬP NHẬT SỐ LƯỢNG XUẤT VÀ SỐ HĐ XUẤT TRONG INVENTORY
        const product = await Inventory.findByMaHang(item.maHang);
        if (product) {
          const currentSoLuongXuat = product.soLuongXuat || 0;
          const newSoLuongXuat = currentSoLuongXuat + (item.soLuong || 0);

          await db.execute(
            `UPDATE inventory SET 
              soLuongXuat = ?,
              giaXuat = ?,
              soHopDongXuat = ?,
              soHoaDonXuat = ?,
              ngayXuatHD = ?,
              updatedAt = NOW()
            WHERE maHang = ?`,
            [
              newSoLuongXuat,
              item.donGia || product.giaXuat || 0,
              item.soHopDongXuat || product.soHopDongXuat || "",
              item.soHoaDonXuat || product.soHoaDonXuat || "",
              item.ngayXuatHD || exportItem.exportDate || null,
              item.maHang,
            ],
          );
          console.log(
            `✅ Cập nhật SL xuất cho ${item.maHang}: ${newSoLuongXuat}`,
          );
        }
      }

      await Notification.create(
        exportItem.createdBy,
        `✅ Phiếu xuất ${exportItem.exportNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu xuất. Đã xuất ${items.length} sản phẩm.`,
        "success",
        id,
      );
    }

    await Export.updateStatus(id, status, approvedBy, rejectedReason);

    const statusText =
      status === "approved" ? "đã được duyệt" : "đã bị từ chối";

    if (status === "rejected") {
      await Notification.create(
        exportItem.createdBy,
        `Phiếu xuất ${exportItem.exportNo} ${statusText}`,
        `Lý do: ${rejectedReason}`,
        "warning",
        id,
      );
    }

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu`,
    });
  } catch (error) {
    console.error("Update export status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const getPendingExports = async (req, res) => {
  try {
    const exports = await Export.getPendingApprovals();
    console.log(`📋 ${exports.length} phiếu xuất chờ duyệt`);
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("Get pending exports error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const deleteExport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const exportItem = await Export.findById(id);
    if (!exportItem) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }

    await Export.delete(id);
    res.json({ success: true, message: "Xóa phiếu thành công" });
  } catch (error) {
    console.error("Delete export error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getAllExports,
  getExportById,
  createExport,
  updateExportStatus,
  getPendingExports,
  deleteExport,
};
