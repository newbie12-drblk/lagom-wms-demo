const db = require("../config/database");
const InvoiceRequest = require("../models/InvoiceRequest");
const Receipt = require("../models/Receipt");
const Export = require("../models/Export");
const Notification = require("../models/Notification");

// ==================== ADMIN: TẠO YÊU CẦU HÓA ĐƠN ====================
const createInvoiceRequest = async (req, res) => {
  try {
    const {
      type,
      referenceId,
      soHoaDonNhap,
      ngayNhapHD,
      soHoaDonXuat,
      ngayXuatHD,
      notes,
    } = req.body;
    const createdBy = req.user.userId;

    if (!type || !referenceId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn loại hóa đơn và phiếu tham chiếu",
      });
    }

    if (type !== "receipt" && type !== "export") {
      return res.status(400).json({
        success: false,
        message: "Loại hóa đơn phải là 'receipt' hoặc 'export'",
      });
    }

    let reference = null;
    if (type === "receipt") {
      reference = await Receipt.findById(referenceId);
    } else {
      reference = await Export.findById(referenceId);
    }

    if (!reference) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu tham chiếu",
      });
    }

    if (reference.status !== "approved") {
      return res.status(400).json({
        success: false,
        message:
          "Phiếu tham chiếu chưa được duyệt. Vui lòng duyệt phiếu trước.",
      });
    }

    const existingRequests = await InvoiceRequest.getAll("pending");
    const alreadyRequested = existingRequests.some(
      (r) => r.type === type && r.referenceId === referenceId,
    );
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "Phiếu này đã có yêu cầu hóa đơn đang chờ duyệt",
      });
    }

    const result = await InvoiceRequest.create(
      {
        type,
        referenceId,
        soHoaDonNhap,
        ngayNhapHD,
        soHoaDonXuat,
        ngayXuatHD,
        notes,
      },
      createdBy,
    );

    const typeText = type === "receipt" ? "nhập" : "xuất";
    await Notification.createForManagers(
      `🧾 Yêu cầu hóa đơn ${typeText}`,
      `Admin yêu cầu duyệt hóa đơn cho phiếu ${typeText} #${reference.receiptNo || reference.exportNo}`,
      "approval",
      result.id,
      "invoice_request",
    );

    res.json({
      success: true,
      data: {
        id: result.id,
        requestNo: result.requestNo,
      },
      message: `✅ Đã gửi yêu cầu hóa đơn, chờ Quản lý duyệt`,
    });
  } catch (error) {
    console.error("Create invoice request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// ==================== QUẢN LÝ: LẤY DANH SÁCH CHỜ DUYỆT ====================
const getPendingInvoices = async (req, res) => {
  try {
    const requests = await InvoiceRequest.getPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get pending invoices error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: LẤY TẤT CẢ YÊU CẦU HÓA ĐƠN ====================
const getAllInvoices = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await InvoiceRequest.getAll(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get all invoices error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: DUYỆT YÊU CẦU HÓA ĐƠN ====================
const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    console.log(`✅ Duyệt hóa đơn ID: ${id}`);

    const request = await InvoiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu này đã được xử lý",
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Cập nhật yêu cầu thành approved
      await InvoiceRequest.approve(id, approvedBy);

      const typeText = request.type === "receipt" ? "nhập" : "xuất";

      if (request.type === "receipt") {
        // Cập nhật vào bảng receipts
        await conn.execute(
          `UPDATE receipts 
           SET soHoaDonNhap = ?, ngayNhapHD = ?, soHoaDonXuat = ?, ngayXuatHD = ?
           WHERE id = ?`,
          [
            request.soHoaDonNhap || "",
            request.ngayNhapHD || null,
            request.soHoaDonXuat || "",
            request.ngayXuatHD || null,
            request.referenceId,
          ],
        );

        // Lấy danh sách items từ receipt
        const [items] = await conn.execute(
          `SELECT * FROM receipt_items WHERE receiptId = ?`,
          [request.referenceId],
        );

        // Cập nhật vào inventory cho từng item
        for (const item of items) {
          // Tìm dòng inventory tương ứng
          const [invItems] = await conn.execute(
            `SELECT id FROM inventory 
             WHERE maHang = ? AND soLot = ? AND ngayNhapHD = ?
             ORDER BY id DESC LIMIT 1`,
            [item.maHang, item.soLot || "", item.ngayNhapHD || null],
          );

          if (invItems.length > 0) {
            await conn.execute(
              `UPDATE inventory 
               SET soHoaDonNhap = ?, ngayNhapHD = ?, soHoaDonXuat = ?, ngayXuatHD = ?
               WHERE id = ?`,
              [
                request.soHoaDonNhap || "",
                request.ngayNhapHD || null,
                request.soHoaDonXuat || "",
                request.ngayXuatHD || null,
                invItems[0].id,
              ],
            );
          }
        }
      } else if (request.type === "export") {
        // Cập nhật vào bảng exports
        await conn.execute(
          `UPDATE exports 
           SET soHoaDonNhap = ?, ngayNhapHD = ?, soHoaDonXuat = ?, ngayXuatHD = ?
           WHERE id = ?`,
          [
            request.soHoaDonNhap || "",
            request.ngayNhapHD || null,
            request.soHoaDonXuat || "",
            request.ngayXuatHD || null,
            request.referenceId,
          ],
        );

        // Lấy danh sách items từ export
        const [items] = await conn.execute(
          `SELECT * FROM export_items WHERE exportId = ?`,
          [request.referenceId],
        );

        // Cập nhật vào inventory cho từng item
        for (const item of items) {
          const [invItems] = await conn.execute(
            `SELECT id FROM inventory 
             WHERE maHang = ? AND soLot = ? AND ngayNhapHD = ?
             ORDER BY id DESC LIMIT 1`,
            [item.maHang, item.soLot || "", item.ngayNhapHD || null],
          );

          if (invItems.length > 0) {
            await conn.execute(
              `UPDATE inventory 
               SET soHoaDonXuat = ?, ngayXuatHD = ?
               WHERE id = ?`,
              [
                request.soHoaDonXuat || "",
                request.ngayXuatHD || null,
                invItems[0].id,
              ],
            );
          }
        }
      }

      await conn.commit();

      // Gửi thông báo cho Admin
      await Notification.create(
        request.createdBy,
        `✅ Yêu cầu hóa đơn ${typeText} đã được duyệt`,
        `Hóa đơn cho phiếu ${typeText} đã được Quản lý duyệt`,
        "success",
        id,
        "invoice_request",
      );

      res.json({
        success: true,
        message: `Đã duyệt yêu cầu hóa đơn ${typeText}`,
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Approve invoice error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// ==================== QUẢN LÝ: TỪ CHỐI YÊU CẦU HÓA ĐƠN ====================
const rejectInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await InvoiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    await InvoiceRequest.reject(id, approvedBy, reason);

    const typeText = request.type === "receipt" ? "nhập" : "xuất";
    await Notification.create(
      request.createdBy,
      `❌ Yêu cầu hóa đơn ${typeText} bị từ chối`,
      `Hóa đơn cho phiếu ${typeText} bị từ chối.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối yêu cầu hóa đơn ${typeText}`,
    });
  } catch (error) {
    console.error("Reject invoice error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createInvoiceRequest,
  getPendingInvoices,
  getAllInvoices,
  approveInvoice,
  rejectInvoice,
};
