const Export = require("../models/Export");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Lấy tất cả phiếu xuất
const getAllExports = async (req, res) => {
  try {
    const exports = await Export.getAll();
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("Get exports error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy phiếu xuất theo ID
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
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Tạo phiếu xuất mới
const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    // Kiểm tra tồn kho trước khi tạo
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

    await EditHistory.log(
      createdBy,
      "exports",
      exportId,
      "CREATE",
      null,
      null,
      JSON.stringify(exportData),
    );

    res.json({
      success: true,
      data: { id: exportId },
      message: "Tạo phiếu xuất thành công",
    });
  } catch (error) {
    console.error("Create export error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Cập nhật trạng thái duyệt phiếu xuất
const updateExportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    await Export.updateStatus(id, status, approvedBy, rejectedReason);

    const exportItem = await Export.findById(id);
    if (exportItem) {
      const statusText =
        status === "approved" ? "đã được duyệt" : "đã bị từ chối";
      await Notification.create(
        exportItem.createdBy,
        `Phiếu xuất ${exportItem.exportNo} ${statusText}`,
        status === "rejected"
          ? `Lý do: ${rejectedReason}`
          : `Phiếu xuất của bạn đã được duyệt`,
        status === "approved" ? "success" : "warning",
        id,
      );

      // Nếu được duyệt, cập nhật tồn kho
      if (status === "approved" && exportItem.items) {
        for (const item of exportItem.items) {
          await Inventory.updateStock(item.maHang, item.soLuong, "export");
        }
      }
    }

    await EditHistory.log(
      approvedBy,
      "exports",
      id,
      "UPDATE",
      "status",
      null,
      status,
    );

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu`,
    });
  } catch (error) {
    console.error("Update export status error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy danh sách phiếu chờ duyệt
const getPendingExports = async (req, res) => {
  try {
    const exports = await Export.getPendingApprovals();
    res.json({ success: true, data: exports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Xóa phiếu xuất
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
    await EditHistory.log(
      userId,
      "exports",
      id,
      "DELETE",
      null,
      null,
      JSON.stringify(exportItem),
    );

    res.json({ success: true, message: "Xóa phiếu thành công" });
  } catch (error) {
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
