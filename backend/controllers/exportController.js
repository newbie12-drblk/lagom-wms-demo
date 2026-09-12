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
// TẠO PHIẾU XUẤT - CẢNH BÁO NẾU SẮP HẾT HÀNG
// ============================================================
const createExport = async (req, res) => {
  try {
    const exportData = req.body;
    const createdBy = req.user.userId;

    // Kiểm tra tồn kho + phát hiện sản phẩm sắp hết
    const willBeOutOfStock = [];

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

      // ✅ Kiểm tra nếu xuất xong sẽ hết hàng
      const tonKhoSau = (product.tonKho || 0) - (item.soLuong || 0);
      if (tonKhoSau <= 0) {
        willBeOutOfStock.push({
          tenThuongMai: item.tenThuongMai,
          maHang: item.maHang,
          tonKhoHienTai: product.tonKho || 0,
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

    // ✅ Thông báo cho Quản lý duyệt phiếu
    let managerMessage = `Admin vừa tạo phiếu xuất mới. Vui lòng kiểm tra và duyệt.`;

    if (willBeOutOfStock.length > 0) {
      const danhSachSapHet = willBeOutOfStock
        .map(
          (i) =>
            `- ${i.tenThuongMai} (${i.maHang}): tồn ${i.tonKhoHienTai}, xuất ${i.soLuongXuat} → HẾT`,
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

    // ✅ Thông báo cho Admin nếu có SP sắp hết
    if (willBeOutOfStock.length > 0) {
      const danhSachSapHet = willBeOutOfStock
        .map(
          (i) =>
            `- ${i.tenThuongMai} (${i.maHang}): tồn ${i.tonKhoHienTai}, xuất ${i.soLuongXuat} → HẾT`,
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

    // ✅ NẾU DUYỆT → TRỪ TỒN KHO
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

      const outOfStockItems = []; // Danh sách sản phẩm hết hàng

      for (const item of exportItem.items) {
        const soLuongXuat = item.soLuong || 0;
        const itemNgayXuat = item.ngayXuatHD || exportDate;

        // ✅ Tìm dòng inventory khớp: ưu tiên (maHang + soLot)
        let inventoryRows = [];

        if (item.soLot) {
          [inventoryRows] = await conn.execute(
            `SELECT * FROM inventory 
             WHERE maHang = ? AND soLot = ? AND status = 'approved'
             ORDER BY ngayNhapHD ASC, id ASC LIMIT 1`,
            [item.maHang, item.soLot],
          );
        }

        // Fallback: tìm theo maHang
        if (inventoryRows.length === 0) {
          [inventoryRows] = await conn.execute(
            `SELECT * FROM inventory 
             WHERE maHang = ? AND status = 'approved' AND tonKho > 0
             ORDER BY ngayNhapHD ASC, id ASC LIMIT 1`,
            [item.maHang],
          );
        }

        if (inventoryRows.length === 0) {
          throw new Error(
            `Không tìm thấy sản phẩm "${item.maHang}" trong kho để xuất`,
          );
        }

        const invItem = inventoryRows[0];
        const tonKhoHienTai = invItem.tonKho || 0;

        // ✅ Kiểm tra đủ hàng không
        if (tonKhoHienTai < soLuongXuat) {
          throw new Error(
            `Sản phẩm "${item.tenThuongMai}" (${item.maHang}) không đủ tồn kho. Cần ${soLuongXuat}, còn ${tonKhoHienTai}`,
          );
        }

        const tonKhoMoi = tonKhoHienTai - soLuongXuat;

        if (tonKhoMoi <= 0) {
          // ✅ XUẤT HẾT → XÓA SẢN PHẨM KHỎI KHO
          await conn.execute(`DELETE FROM inventory WHERE id = ?`, [
            invItem.id,
          ]);

          outOfStockItems.push({
            tenThuongMai: item.tenThuongMai,
            maHang: item.maHang,
            soLuongXuat: soLuongXuat,
          });

          console.log(
            `  🗑️ ĐÃ XÓA sản phẩm hết hàng: ${item.maHang} - SL xuất: ${soLuongXuat}`,
          );
        } else {
          // ✅ CÒN HÀNG → CẬP NHẬT SỐ LƯỢNG
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
            `  ✅ Cập nhật tồn kho: ${item.maHang} - ${tonKhoHienTai} → ${tonKhoMoi}`,
          );
        }
      }

      // ✅ THÔNG BÁO CHO ADMIN + QUẢN LÝ NẾU CÓ SẢN PHẨM HẾT HÀNG
      if (outOfStockItems.length > 0) {
        const danhSachHet = outOfStockItems
          .map(
            (i) => `- ${i.tenThuongMai} (${i.maHang}): xuất ${i.soLuongXuat}`,
          )
          .join("\n");

        // Thông báo cho Admin (người tạo phiếu)
        await Notification.create(
          exportItem.createdBy,
          `⚠️ CẢNH BÁO HẾT HÀNG - Phiếu xuất ${exportItem.exportNo}`,
          `${outOfStockItems.length} sản phẩm đã HẾT HÀNG sau khi xuất kho:\n${danhSachHet}`,
          "warning",
          id,
          "export",
        );

        // Thông báo cho TẤT CẢ Quản lý
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

        console.log(
          `⚠️ Đã gửi thông báo HẾT HÀNG cho ${outOfStockItems.length} sản phẩm`,
        );
      }

      // Thông báo duyệt phiếu bình thường
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
