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
// ✅ DUYỆT PHIẾU XUẤT — INSERT TÁCH RIÊNG DÒNG (âm tồn)
// ============================================================
const updateExportStatus = async (req, res) => {
  const conn = await db.getConnection();
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

    if (
      exportItem.status !== "pending" &&
      exportItem.status !== "awaiting_confirmation"
    ) {
      return res.status(400).json({
        success: false,
        message: "Phiếu này đã được xử lý",
      });
    }

    console.log(
      `📦 Phiếu ${exportItem.exportNo} có ${exportItem.items?.length || 0} sản phẩm`,
    );

    await conn.beginTransaction();

    // Cập nhật status phiếu
    await conn.execute(
      `UPDATE exports 
       SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectedReason || null, id],
    );

    // ✅ NẾU DUYỆT → INSERT MỖI ITEM 1 DÒNG RIÊNG VÀO INVENTORY (ÂM TỒN)
    if (status === "approved") {
      if (!exportItem.items || exportItem.items.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu xuất không có sản phẩm nào",
        });
      }

      // Lấy stt lớn nhất
      const [maxSttResult] = await conn.execute(
        "SELECT MAX(stt) as maxStt FROM inventory",
      );
      let currentStt = maxSttResult[0]?.maxStt || 0;

      // ✅ Ngày xuất chung cho cả phiếu (nếu item không có ngày riêng)
      const exportDate =
        exportItem.exportDate || new Date().toISOString().split("T")[0];

      for (const item of exportItem.items) {
        currentStt++;

        // ✅ MỖI LẦN XUẤT LÀ 1 DÒNG RIÊNG — KHÔNG CỘNG DỒN
        // Dùng ngày xuất (ngayXuatHD) để phân biệt
        const itemNgayXuat = item.ngayXuatHD || exportDate;

        await conn.execute(
          `INSERT INTO inventory (
            stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
            giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
            soLot, ngayHetHan,
            soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
            ngayNhapHD, ngayXuatHD, ghiChu,
            status, createdBy, approvedBy, approvedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
          [
            currentStt,
            item.tenThuongMai || "",
            item.maHang || "",
            item.quyCach || "",
            item.hangSX || "",
            item.dvt || "",
            item.phanLoai || "",
            0, // giaNhap = 0 (vì đây là dòng xuất)
            item.donGia || 0, // giaXuat
            0, // soLuongNhap = 0
            item.soLuong || 0, // soLuongXuat
            -(item.soLuong || 0), // ✅ tonKho ÂM = đã xuất
            item.soLot || "",
            item.ngayHetHan || null,
            "", // soHopDongNhap
            "", // soHoaDonNhap (sẽ cập nhật khi duyệt hóa đơn)
            "", // soHoaDonXuat (sẽ cập nhật khi duyệt hóa đơn)
            null, // ngayNhapHD
            itemNgayXuat, // ✅ ngayXuatHD để phân biệt
            item.ghiChu || "",
            exportItem.createdBy,
            approvedBy,
          ],
        );

        console.log(
          `  ✅ Inserted inventory (export): ${item.maHang} - SL: ${item.soLuong} - Ngày xuất: ${itemNgayXuat}`,
        );
      }

      console.log(
        `✅ Đã lưu ${exportItem.items.length} dòng xuất kho từ phiếu ${exportItem.exportNo}`,
      );
    }

    await conn.commit();

    if (status === "approved") {
      await Notification.create(
        exportItem.createdBy,
        `✅ Phiếu xuất ${exportItem.exportNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu xuất. ${exportItem.items.length} sản phẩm đã được ghi nhận xuất kho.`,
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
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu xuất thành công${
        status === "approved"
          ? ` — Đã ghi nhận ${exportItem.items.length} sản phẩm xuất kho`
          : ""
      }`,
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Update export status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  } finally {
    conn.release();
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
