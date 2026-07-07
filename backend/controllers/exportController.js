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

// Tạo phiếu xuất mới - TỰ ĐỘNG KIỂM TRA
const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    console.log("📤 Tạo phiếu xuất bởi user:", createdBy);
    console.log("📦 Dữ liệu:", JSON.stringify(exportData, null, 2));

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
    const exportItem = await Export.findById(exportId);

    if (!exportItem) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu vừa tạo" });
    }

    console.log("✅ Phiếu xuất tạo thành công:", exportItem.exportNo);

    // TỰ ĐỘNG KIỂM TRA
    let allMatched = true;
    let mismatchDetails = [];

    for (const item of exportItem.items || []) {
      const product = await Inventory.findByMaHang(item.maHang);

      if (!product) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Sản phẩm "${item.tenThuongMai}" (${item.maHang}) chưa có trong kho`,
        );
        continue;
      }

      if (product.tenThuongMai !== item.tenThuongMai) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Tên sản phẩm "${item.maHang}" không khớp (kho: ${product.tenThuongMai}, phiếu: ${item.tenThuongMai})`,
        );
      }
      if (product.quyCach !== item.quyCach) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Quy cách của "${item.maHang}" không khớp (kho: ${product.quyCach}, phiếu: ${item.quyCach})`,
        );
      }
    }

    if (allMatched) {
      // TỰ ĐỘNG DUYỆT
      await Export.updateStatus(exportId, "approved", createdBy, null);

      for (const item of exportItem.items || []) {
        await Inventory.updateStock(item.maHang, item.soLuong, "export");
      }

      await EditHistory.log(
        createdBy,
        "exports",
        exportId,
        "AUTO_APPROVED",
        null,
        null,
        JSON.stringify(exportData),
      );

      await Notification.create(
        createdBy,
        `✅ Phiếu xuất ${exportItem.exportNo} đã được tự động xác nhận`,
        "Tất cả sản phẩm trong phiếu đều khớp với kho, hệ thống tự động duyệt thành công.",
        "success",
        exportId,
      );

      res.json({
        success: true,
        data: { id: exportId, status: "approved" },
        message:
          "✅ Tạo phiếu xuất thành công! Phiếu đã được tự động xác nhận.",
      });
    } else {
      // CHUYỂN SANG "awaiting_confirmation"
      await Export.updateStatus(
        exportId,
        "awaiting_confirmation",
        createdBy,
        null,
      );

      await EditHistory.log(
        createdBy,
        "exports",
        exportId,
        "CREATE",
        null,
        null,
        JSON.stringify(exportData),
      );

      // 🔥 Gửi thông báo cho Admin
      await Notification.create(
        createdBy,
        `⚠️ Phiếu xuất ${exportItem.exportNo} đang chờ xác nhận`,
        `Có ${mismatchDetails.length} sản phẩm không khớp với kho.\n\nChi tiết:\n${mismatchDetails.join("\n")}`,
        "warning",
        exportId,
      );

      // 🔥 Gửi thông báo cho Quản lý
      await Notification.createForManagers(
        `📤 Phiếu xuất ${exportItem.exportNo} chờ xác nhận`,
        `Admin vừa tạo phiếu xuất có ${mismatchDetails.length} sản phẩm không khớp với kho.\nVui lòng kiểm tra và xác nhận.`,
        "approval",
        exportId,
        "export",
      );

      res.json({
        success: true,
        data: { id: exportId, status: "awaiting_confirmation" },
        message:
          "⚠️ Tạo phiếu xuất thành công! Phiếu đang chờ xác nhận từ Quản lý.",
        details: mismatchDetails,
      });
    }
  } catch (error) {
    console.error("❌ Create export error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
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
          : `Phiếu xuất của bạn đã được Quản lý duyệt`,
        status === "approved" ? "success" : "warning",
        id,
      );
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
    console.log("📋 Phiếu xuất chờ duyệt:", exports.length);
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("Get pending exports error:", error);
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
