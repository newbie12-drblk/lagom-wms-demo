const InvoiceRequest = require("../models/InvoiceRequest");
const Export = require("../models/Export");
const Notification = require("../models/Notification");
const db = require("../config/database");

// ==================== ADMIN: LẤY DANH SÁCH PHIẾU XUẤT CHƯA CÓ HÓA ĐƠN ====================
const getExportsWithoutInvoice = async (req, res) => {
  try {
    const exports = await InvoiceRequest.getExportsWithoutInvoice();
    res.json({ success: true, data: exports });
  } catch (error) {
    console.error("❌ Get exports without invoice error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== ADMIN: TẠO YÊU CẦU NHẬP HÓA ĐƠN CHO TỪNG ITEM ====================
const createInvoiceRequest = async (req, res) => {
  try {
    const { exportId, items } = req.body;
    const createdBy = req.user.userId;

    if (!exportId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn phiếu xuất",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập thông tin hóa đơn cho ít nhất 1 sản phẩm",
      });
    }

    // Kiểm tra phiếu xuất
    const exportItem = await Export.findById(exportId);
    if (!exportItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu xuất",
      });
    }

    if (exportItem.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Phiếu xuất chưa được duyệt",
      });
    }

    // Validate từng item
    for (const item of items) {
      if (!item.exportItemId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu exportItemId cho 1 sản phẩm",
        });
      }

      // Kiểm tra item đã có hóa đơn pending/approved chưa
      const existing = await InvoiceRequest.getByExportItemId(
        item.exportItemId,
      );
      if (
        existing &&
        (existing.status === "pending" || existing.status === "approved")
      ) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ID ${item.exportItemId} đã có hóa đơn (${existing.status})`,
        });
      }
    }

    // Tạo yêu cầu cho từng item
    const requestIds = await InvoiceRequest.createMultiple(
      exportId,
      items,
      createdBy,
    );

    // Thông báo cho Quản lý
    await Notification.createForManagers(
      `📄 Yêu cầu nhập hóa đơn cho phiếu ${exportItem.exportNo}`,
      `Admin đã nhập thông tin hóa đơn cho ${items.length} sản phẩm trong phiếu xuất ${exportItem.exportNo}. Vui lòng kiểm tra và duyệt.`,
      "approval",
      requestIds[0],
      "invoice_request",
    );

    res.json({
      success: true,
      data: { ids: requestIds, count: requestIds.length },
      message: `✅ Đã gửi yêu cầu nhập hóa đơn cho ${items.length} sản phẩm, chờ Quản lý duyệt.`,
    });
  } catch (error) {
    console.error("❌ Create invoice request error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ==================== QUẢN LÝ: LẤY DANH SÁCH HÓA ĐƠN CHỜ DUYỆT ====================
const getPendingInvoices = async (req, res) => {
  try {
    const requests = await InvoiceRequest.getPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Get pending invoices error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: LẤY TẤT CẢ YÊU CẦU ====================
const getAllInvoiceRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await InvoiceRequest.getAll(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Get all invoice requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: LẤY CHI TIẾT ====================
const getInvoiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await InvoiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("❌ Get invoice request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: DUYỆT HÓA ĐƠN ====================
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

    await InvoiceRequest.approve(id, approvedBy);

    // Thông báo cho Admin
    await Notification.create(
      request.createdBy,
      `✅ Hóa đơn phiếu ${request.exportNo} đã được duyệt`,
      `Quản lý đã duyệt hóa đơn cho sản phẩm "${request.tenThuongMai}" trong phiếu ${request.exportNo}.`,
      "success",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `✅ Đã duyệt hóa đơn cho sản phẩm "${request.tenThuongMai}"`,
    });
  } catch (error) {
    console.error("❌ Approve invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ==================== QUẢN LÝ: DUYỆT HÀNG LOẠT ====================
const approveMultipleInvoices = async (req, res) => {
  try {
    const { ids } = req.body;
    const approvedBy = req.user.userId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất 1 hóa đơn để duyệt",
      });
    }

    const results = [];
    for (const id of ids) {
      try {
        const request = await InvoiceRequest.findById(id);
        if (!request || request.status !== "pending") {
          results.push({ id, success: false, message: "Không hợp lệ" });
          continue;
        }

        await InvoiceRequest.approve(id, approvedBy);

        await Notification.create(
          request.createdBy,
          `✅ Hóa đơn phiếu ${request.exportNo} đã được duyệt`,
          `Quản lý đã duyệt hóa đơn cho sản phẩm "${request.tenThuongMai}".`,
          "success",
          id,
          "invoice_request",
        );

        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, message: err.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Đã duyệt ${results.filter((r) => r.success).length}/${ids.length} hóa đơn`,
    });
  } catch (error) {
    console.error("❌ Approve multiple invoices error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== QUẢN LÝ: TỪ CHỐI HÓA ĐƠN ====================
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

    await InvoiceRequest.reject(
      id,
      approvedBy,
      reason || "Không được chấp thuận",
    );

    await Notification.create(
      request.createdBy,
      `❌ Hóa đơn phiếu ${request.exportNo} bị từ chối`,
      `Quản lý đã từ chối hóa đơn cho sản phẩm "${request.tenThuongMai}".\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối hóa đơn`,
    });
  } catch (error) {
    console.error("❌ Reject invoice error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== ADMIN: XÓA YÊU CẦU ====================
const deleteInvoiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await InvoiceRequest.delete(id);
    res.json({ success: true, message: "Xóa yêu cầu thành công" });
  } catch (error) {
    console.error("❌ Delete invoice request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getExportsWithoutInvoice,
  createInvoiceRequest,
  getPendingInvoices,
  getAllInvoiceRequests,
  getInvoiceRequestById,
  approveInvoice,
  approveMultipleInvoices,
  rejectInvoice,
  deleteInvoiceRequest,
};
