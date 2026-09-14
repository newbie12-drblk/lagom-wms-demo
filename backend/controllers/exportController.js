// backend/controllers/exportController.js
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

// ============================================================
// TẠO PHIẾU XUẤT
// ✅ BẮT BUỘC: Mỗi item phải có soLot + ngayHetHan
// ============================================================
const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    if (!exportData.items || exportData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Phiếu xuất phải có ít nhất 1 sản phẩm",
      });
    }

    // ✅ VALIDATE: Bắt buộc nhập Số lot + HSD cho từng item
    const invalidItems = [];
    exportData.items.forEach((item, idx) => {
      const missing = [];
      if (!item.maHang) missing.push("Mã hàng");
      if (!item.tenThuongMai) missing.push("Tên thương mại");
      if (!item.soLuong || item.soLuong <= 0) missing.push("Số lượng");
      if (!item.soLot) missing.push("Số lot");
      if (!item.ngayHetHan) missing.push("HSD");

      if (missing.length > 0) {
        invalidItems.push(`Dòng ${idx + 1}: thiếu ${missing.join(", ")}`);
      }
    });

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ thông tin bắt buộc:\n" +
          invalidItems.join("\n"),
      });
    }

    const willBeOutOfStock = [];

    // Kiểm tra tồn kho theo MÃ HÀNG + SỐ LOT
    for (const item of exportData.items) {
      const invItem = await Inventory.findByMaHangAndLot(
        item.maHang,
        item.soLot,
        item.ngayNhapHD || null,
      );

      if (!invItem) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy lô "${item.soLot}" của sản phẩm ${item.maHang} trong kho`,
        });
      }

      if ((invItem.tonKho || 0) < (item.soLuong || 0)) {
        return res.status(400).json({
          success: false,
          message: `Lô "${item.soLot}" của "${item.tenThuongMai}" không đủ tồn (cần ${item.soLuong}, còn ${invItem.tonKho})`,
        });
      }

      const tonKhoSau = (invItem.tonKho || 0) - (item.soLuong || 0);
      if (tonKhoSau <= 0) {
        willBeOutOfStock.push({
          tenThuongMai: item.tenThuongMai,
          maHang: item.maHang,
          soLot: item.soLot,
          tonKhoHienTai: invItem.tonKho || 0,
          soLuongXuat: item.soLuong || 0,
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

    let managerMessage = `Admin vừa tạo phiếu xuất mới. Vui lòng kiểm tra và duyệt.`;

    if (willBeOutOfStock.length > 0) {
      const danhSachSapHet = willBeOutOfStock
        .map(
          (i) =>
            `- ${i.tenThuongMai} (${i.maHang}) - Lô ${i.soLot}: tồn ${i.tonKhoHienTai}, xuất ${i.soLuongXuat} → HẾT`,
        )
        .join("\n");

      managerMessage += `\n\n⚠️ CẢNH BÁO: ${willBeOutOfStock.length} sản phẩm sẽ HẾT HÀNG sau khi duyệt:\n${danhSachSapHet}`;
    }

    await Notification.createForManagers(
      `📤 Phiếu xuất ${exportItem.exportNo} chờ duyệt${
        willBeOutOfStock.length > 0 ? " (CÓ SP SẮP HẾT)" : ""
      }`,
      managerMessage,
      willBeOutOfStock.length > 0 ? "warning" : "approval",
      exportId,
      "export",
    );

    if (willBeOutOfStock.length > 0) {
      const danhSachSapHet = willBeOutOfStock
        .map(
          (i) =>
            `- ${i.tenThuongMai} (${i.maHang}) - Lô ${i.soLot}: tồn ${i.tonKhoHienTai}, xuất ${i.soLuongXuat} → HẾT`,
        )
        .join("\n");

      await Notification.create(
        createdBy,
        `⚠️ CẢNH BÁO: Phiếu xuất ${exportItem.exportNo} có SP sắp hết`,
        `${willBeOutOfStock.length} sản phẩm sẽ hết hàng sau khi Quản lý duyệt:\n${danhSachSapHet}`,
        "warning",
        exportId,
        "export",
      );
    }

    res.json({
      success: true,
      data: {
        id: exportId,
        status: "awaiting_confirmation",
        items: exportItem.items || [],
        willBeOutOfStock: willBeOutOfStock.length,
      },
      message:
        "✅ Tạo phiếu xuất thành công! Phiếu đang chờ Quản lý duyệt." +
        (willBeOutOfStock.length > 0
          ? ` ⚠️ Có ${willBeOutOfStock.length} SP sẽ hết hàng.`
          : ""),
    });
  } catch (error) {
    console.error("❌ Create export error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// ============================================================
// ✅ HELPER: TÌM DÒNG INVENTORY ĐỂ XUẤT
// Ưu tiên:
//   1. Match maHang + soLot + ngayXuatHD (nếu item có ngày xuất cụ thể)
//   2. Match maHang + soLot (chọn dòng có ngayNhapHD cũ nhất - FIFO)
//   3. Match maHang (chọn dòng có ngayNhapHD cũ nhất - FIFO)
// ============================================================
async function findInventoryForExport(conn, item, exportDate) {
  const itemNgayXuat = item.ngayXuatHD || exportDate;
  const itemSoLot = item.soLot || "";
  const maHang = item.maHang;

  // ✅ ƯU TIÊN 1: Match maHang + soLot + ngayXuatHD
  if (itemSoLot && itemNgayXuat) {
    const [rows] = await conn.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND soLot = ? AND ngayXuatHD = ?
         AND status = 'approved' AND tonKho > 0
       ORDER BY id DESC LIMIT 1`,
      [maHang, itemSoLot, itemNgayXuat],
    );
    if (rows.length > 0) {
      console.log(
        `  ✅ Match KEY 1 (maHang + soLot + ngayXuatHD): ${maHang} / ${itemSoLot} / ${itemNgayXuat}`,
      );
      return rows[0];
    }
  }

  // ✅ ƯU TIÊN 2: Match maHang + soLot (FIFO theo ngayNhapHD)
  if (itemSoLot) {
    const [rows] = await conn.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND soLot = ?
         AND status = 'approved' AND tonKho > 0
       ORDER BY ngayNhapHD ASC, id ASC LIMIT 1`,
      [maHang, itemSoLot],
    );
    if (rows.length > 0) {
      console.log(
        `  ✅ Match KEY 2 (maHang + soLot): ${maHang} / ${itemSoLot}`,
      );
      return rows[0];
    }
  }

  // ✅ ƯU TIÊN 3: Match maHang (FIFO theo ngayNhapHD)
  const [rows] = await conn.execute(
    `SELECT * FROM inventory 
     WHERE maHang = ?
       AND status = 'approved' AND tonKho > 0
     ORDER BY ngayNhapHD ASC, id ASC LIMIT 1`,
    [maHang],
  );
  if (rows.length > 0) {
    console.log(`  ✅ Match KEY 3 (maHang only): ${maHang}`);
    return rows[0];
  }

  return null;
}

// ============================================================
// ✅ DUYỆT PHIẾU XUẤT — TRỪ TỒN KHO, XÓA NẾU HẾT HÀNG
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

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE exports 
       SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectedReason || null, id],
    );

    if (status === "approved") {
      if (!exportItem.items || exportItem.items.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu xuất không có sản phẩm nào",
        });
      }

      const exportDate =
        exportItem.exportDate || new Date().toISOString().split("T")[0];

      const outOfStockItems = [];

      for (const item of exportItem.items) {
        const soLuongXuat = item.soLuong || 0;
        const itemNgayXuat = item.ngayXuatHD || exportDate;

        // ✅ Tìm dòng inventory theo logic ưu tiên mới
        const invItem = await findInventoryForExport(conn, item, exportDate);

        if (!invItem) {
          throw new Error(
            `Không tìm thấy sản phẩm "${item.maHang}" (lô ${item.soLot}) trong kho để xuất`,
          );
        }

        const tonKhoHienTai = invItem.tonKho || 0;

        if (tonKhoHienTai < soLuongXuat) {
          throw new Error(
            `Sản phẩm "${item.tenThuongMai}" (${item.maHang}) - Lô ${item.soLot} không đủ tồn kho. Cần ${soLuongXuat}, còn ${tonKhoHienTai}`,
          );
        }

        const tonKhoMoi = tonKhoHienTai - soLuongXuat;

        if (tonKhoMoi <= 0) {
          // XUẤT HẾT → XÓA
          await conn.execute(`DELETE FROM inventory WHERE id = ?`, [
            invItem.id,
          ]);

          outOfStockItems.push({
            tenThuongMai: item.tenThuongMai,
            maHang: item.maHang,
            soLot: item.soLot,
            soLuongXuat: soLuongXuat,
          });

          console.log(
            `  🗑️ ĐÃ XÓA sản phẩm hết hàng: ${item.maHang} - Lô ${item.soLot} - SL xuất: ${soLuongXuat}`,
          );
        } else {
          // CÒN HÀNG → CẬP NHẬT
          await conn.execute(
            `UPDATE inventory 
             SET tonKho = ?,
                 soLuongXuat = soLuongXuat + ?,
                 giaXuat = ?,
                 ngayXuatHD = ?,
                 soHoaDonXuat = ?,
                 soHopDongXuat = ?
             WHERE id = ?`,
            [
              tonKhoMoi,
              soLuongXuat,
              item.donGia || 0,
              itemNgayXuat,
              item.soHoaDonXuat || "",
              item.soHopDongXuat || "",
              invItem.id,
            ],
          );

          console.log(
            `  ✅ Cập nhật tồn kho: ${item.maHang} (Lô ${item.soLot}, ID ${invItem.id}) - ${tonKhoHienTai} → ${tonKhoMoi}`,
          );
        }
      }

      if (outOfStockItems.length > 0) {
        const danhSachHet = outOfStockItems
          .map(
            (i) =>
              `- ${i.tenThuongMai} (${i.maHang}) - Lô ${i.soLot}: xuất ${i.soLuongXuat}`,
          )
          .join("\n");

        await Notification.create(
          exportItem.createdBy,
          `⚠️ CẢNH BÁO HẾT HÀNG - Phiếu xuất ${exportItem.exportNo}`,
          `${outOfStockItems.length} sản phẩm đã HẾT HÀNG sau khi xuất kho:\n${danhSachHet}`,
          "warning",
          id,
          "export",
        );

        try {
          await Notification.createForManagers(
            `⚠️ CẢNH BÁO HẾT HÀNG - Phiếu xuất ${exportItem.exportNo}`,
            `${outOfStockItems.length} sản phẩm đã HẾT HÀNG sau khi duyệt xuất kho:\n${danhSachHet}`,
            "warning",
            id,
            "export",
          );
        } catch (notifErr) {
          console.error("Lỗi gửi thông báo cho Quản lý:", notifErr);
        }
      }

      let message = `Quản lý đã duyệt phiếu xuất ${exportItem.exportNo}.`;
      if (outOfStockItems.length > 0) {
        message += ` Có ${outOfStockItems.length} sản phẩm đã hết hàng và bị xóa khỏi kho.`;
      }

      await Notification.create(
        exportItem.createdBy,
        `✅ Phiếu xuất ${exportItem.exportNo} đã được duyệt`,
        message,
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

    await conn.commit();

    let responseMessage = `Đã ${
      status === "approved" ? "duyệt" : "từ chối"
    } phiếu xuất thành công`;
    if (status === "approved") {
      responseMessage += ` — Đã cập nhật tồn kho cho ${exportItem.items.length} sản phẩm`;
    }

    res.json({
      success: true,
      message: responseMessage,
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
