const InvoiceRequest = require("../models/InvoiceRequest");
const Export = require("../models/Export");
const Notification = require("../models/Notification");

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

// ==================== ADMIN: TẠO YÊU CẦU NHẬP HÓA ĐƠN ====================
const createInvoiceRequest = async (req, res) => {
  try {
    const { exportId, soHoaDonNhap, ngayNhapHD, soHoaDonXuat, ngayXuatHD } =
      req.body;
    const createdBy = req.user.userId;

    if (!exportId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn phiếu xuất",
      });
    }

    // Kiểm tra phiếu xuất tồn tại
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

    if (exportItem.hasInvoice) {
      return res.status(400).json({
        success: false,
        message: "Phiếu xuất này đã có hóa đơn",
      });
    }

    // Kiểm tra đã có yêu cầu pending chưa
    const existingRequests = await InvoiceRequest.getByExportId(exportId);
    const hasPending = existingRequests.some((r) => r.status === "pending");
    if (hasPending) {
      return res.status(400).json({
        success: false,
        message: "Phiếu xuất này đã có yêu cầu nhập hóa đơn đang chờ duyệt",
      });
    }

    // Cho phép tạo request với dữ liệu rỗng
    const requestId = await InvoiceRequest.create(
      exportId,
      {
        soHoaDonNhap: soHoaDonNhap || "",
        ngayNhapHD: ngayNhapHD || null,
        soHoaDonXuat: soHoaDonXuat || "",
        ngayXuatHD: ngayXuatHD || null,
      },
      createdBy,
    );

    // Gửi thông báo cho Quản lý
    await Notification.createForManagers(
      `📄 Yêu cầu nhập hóa đơn cho phiếu ${exportItem.exportNo}`,
      `Admin đã nhập thông tin hóa đơn cho phiếu xuất ${exportItem.exportNo}. Vui lòng kiểm tra và duyệt.`,
      "approval",
      requestId,
      "invoice_request",
    );

    res.json({
      success: true,
      data: { id: requestId },
      message: `✅ Đã gửi yêu cầu nhập hóa đơn cho phiếu ${exportItem.exportNo}, chờ Quản lý duyệt.`,
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

// ==================== QUẢN LÝ: LẤY TẤT CẢ YÊU CẦU HÓA ĐƠN ====================
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

// ==================== QUẢN LÝ: LẤY CHI TIẾT YÊU CẦU HÓA ĐƠN ====================
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

    // Gửi thông báo cho Admin
    await Notification.create(
      request.createdBy,
      `✅ Hóa đơn phiếu ${request.exportNo} đã được duyệt`,
      `Quản lý đã duyệt thông tin hóa đơn cho phiếu xuất ${request.exportNo}. Sản phẩm đã được lưu vào tồn kho.`,
      "success",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `✅ Đã duyệt hóa đơn cho phiếu ${request.exportNo}`,
    });
  } catch (error) {
    console.error("❌ Approve invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
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
      `Quản lý đã từ chối thông tin hóa đơn cho phiếu xuất ${request.exportNo}.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối hóa đơn cho phiếu ${request.exportNo}`,
    });
  } catch (error) {
    console.error("❌ Reject invoice error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== ADMIN: XÓA YÊU CẦU HÓA ĐƠN ====================
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
  rejectInvoice,
  deleteInvoiceRequest,
};
