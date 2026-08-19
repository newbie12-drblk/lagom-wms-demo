const db = require("../config/database");
const Export = require("../models/Export");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// ============================================================
// LẤY TẤT CẢ PHIẾU XUẤT
// ============================================================
const getAllExports = async (req, res) => {
  try {
    const exports = await Export.getAll();
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("Get exports error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ============================================================
// LẤY PHIẾU XUẤT THEO ID
// ============================================================
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

// ============================================================
// TẠO PHIẾU XUẤT MỚI (ADMIN)
// ============================================================
const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    // Kiểm tra tồn kho
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

    // Gửi thông báo cho Quản lý
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
// CẬP NHẬT TRẠNG THÁI PHIẾU XUẤT - CHỈ CẬP NHẬT STATUS
// KHÔNG TỰ ĐỘNG TRỪ TỒN KHO
// ============================================================
const updateExportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    console.log(`📋 Cập nhật phiếu xuất ID: ${id}, Status: ${status}`);

    const exportItem = await Export.findById(id);
    if (!exportItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu",
      });
    }

    console.log(
      `📦 Phiếu ${exportItem.exportNo} có ${exportItem.items?.length || 0} sản phẩm`,
    );

    // ✅ CHỈ CẬP NHẬT STATUS - KHÔNG TRỪ TỒN KHO
    // Đây là chức năng "Xuất kho chờ duyệt", chỉ cần đổi trạng thái
    await Export.updateStatus(id, status, approvedBy, rejectedReason);

    // Gửi thông báo cho người tạo phiếu
    if (status === "approved") {
      await Notification.create(
        exportItem.createdBy,
        `✅ Phiếu xuất ${exportItem.exportNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu xuất của bạn.`,
        "success",
        id,
        "export",
      );
    } else if (status === "rejected") {
      await Notification.create(
        exportItem.createdBy,
        `❌ Phiếu xuất ${exportItem.exportNo} bị từ chối`,
        `Lý do: ${rejectedReason || "Không được chấp thuận"}`,
        "warning",
        id,
        "export",
      );
    }

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu xuất thành công`,
    });
  } catch (error) {
    console.error("❌ Update export status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ============================================================
// LẤY DANH SÁCH PHIẾU XUẤT CHỜ DUYỆT (QUẢN LÝ)
// ============================================================
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

// ============================================================
// XÓA PHIẾU XUẤT (ADMIN)
// ============================================================
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

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  getAllExports,
  getExportById,
  createExport,
  updateExportStatus,
  getPendingExports,
  deleteExport,
};
