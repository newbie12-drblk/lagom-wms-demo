// backend/controllers/invoiceController.js
const InvoiceRequest = require("../models/InvoiceRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");

// ✅ ==================== TÌM SẢN PHẨM (Admin) ====================
// GET /api/invoice/search-product?maHang=...&soHopDongNhap=...
const searchProduct = async (req, res) => {
  try {
    const { maHang, soHopDongNhap } = req.query;

    if (!maHang && !soHopDongNhap) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Mã hàng hoặc Số hợp đồng",
      });
    }

    const results = await InvoiceRequest.searchInventory({
      maHang: maHang || "",
      soHopDongNhap: soHopDongNhap || "",
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("❌ Search product error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== ADMIN: TẠO YÊU CẦU HÓA ĐƠN ====================
const createInvoiceRequest = async (req, res) => {
  try {
    const {
      inventoryId,
      maHang,
      soHopDongNhap,
      soLot,
      tenThuongMai,
      soLuong,
      soHoaDonNhap,
      ngayNhapHD,
      soHoaDonXuat,
      ngayXuatHD,
    } = req.body;
    const createdBy = req.user.userId;

    console.log("📥 Tạo yêu cầu hóa đơn:", { inventoryId, maHang, soLuong });

    if (!inventoryId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn sản phẩm",
      });
    }

    if (!maHang) {
      return res.status(400).json({
        success: false,
        message: "Thiếu Mã hàng",
      });
    }

    if (!soHoaDonNhap || !ngayNhapHD) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Số HĐ nhập và Ngày HĐ nhập",
      });
    }

    if (!soHoaDonXuat || !ngayXuatHD) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Số HĐ xuất và Ngày HĐ xuất",
      });
    }

    if (!soLuong || soLuong <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải > 0",
      });
    }

    const invItem = await Inventory.findById(inventoryId);
    if (!invItem) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong kho",
      });
    }

    if (invItem.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm chưa được duyệt trong kho",
      });
    }

    const existing = await InvoiceRequest.getByInventoryId(inventoryId);
    if (existing.length > 0) {
      const existingStatus = existing[0].status;
      return res.status(400).json({
        success: false,
        message: `Sản phẩm "${maHang}" (Lô: ${soLot || "N/A"}) đã có yêu cầu hóa đơn đang ${
          existingStatus === "pending" ? "chờ duyệt" : "đã duyệt"
        }`,
      });
    }

    const result = await InvoiceRequest.create(
      {
        inventoryId,
        maHang,
        soHopDongNhap: soHopDongNhap || invItem.soHopDongNhap || "",
        soLot: soLot || invItem.soLot || "",
        tenThuongMai: tenThuongMai || invItem.tenThuongMai || "",
        soLuong,
        soHoaDonNhap,
        ngayNhapHD,
        soHoaDonXuat,
        ngayXuatHD,
      },
      createdBy,
    );

    await Notification.createForManagers(
      `📄 Hóa đơn mới ${result.soHoaDonCode} chờ duyệt`,
      `Admin đã tạo hóa đơn "${result.soHoaDonCode}" cho sản phẩm ${
        tenThuongMai || maHang
      } (${maHang}). Vui lòng kiểm tra và duyệt.`,
      "approval",
      result.id,
      "invoice_request",
    );

    res.json({
      success: true,
      data: { id: result.id, soHoaDonCode: result.soHoaDonCode },
      message: `✅ Đã gửi yêu cầu hóa đơn "${result.soHoaDonCode}", chờ Quản lý duyệt.`,
    });
  } catch (error) {
    console.error("❌ Create invoice request error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ==================== LẤY TẤT CẢ (Quản lý) ====================
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

// ✅ ==================== ADMIN: LẤY HĐ CỦA MÌNH ====================
const getMyInvoiceRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await InvoiceRequest.getByCreator(userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Get my invoice requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== LẤY CHỜ DUYỆT ====================
const getPendingInvoices = async (req, res) => {
  try {
    const requests = await InvoiceRequest.getPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Get pending invoices error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== LẤY CHI TIẾT ====================
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

// ==================== DUYỆT 1 HĐ ====================
const approveInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

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

    await Notification.create(
      request.createdBy,
      `✅ Hóa đơn ${request.soHoaDonCode} đã được duyệt`,
      `Quản lý đã duyệt hóa đơn "${request.soHoaDonCode}" cho sản phẩm "${request.tenThuongMai}" (${request.maHang}).`,
      "success",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `✅ Đã duyệt hóa đơn "${request.soHoaDonCode}"`,
    });
  } catch (error) {
    console.error("❌ Approve invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ==================== DUYỆT HÀNG LOẠT ====================
const approveMultipleInvoices = async (req, res) => {
  try {
    const { ids } = req.body;
    const approvedBy = req.user.userId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất 1 hóa đơn",
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
          `✅ Hóa đơn ${request.soHoaDonCode} đã được duyệt`,
          `Quản lý đã duyệt hóa đơn "${request.soHoaDonCode}" cho sản phẩm "${request.tenThuongMai}".`,
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

// ==================== TỪ CHỐI ====================
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
      `❌ Hóa đơn ${request.soHoaDonCode} bị từ chối`,
      `Quản lý đã từ chối hóa đơn "${request.soHoaDonCode}".\nLý do: ${
        reason || "Không được chấp thuận"
      }`,
      "warning",
      id,
      "invoice_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối hóa đơn "${request.soHoaDonCode}"`,
    });
  } catch (error) {
    console.error("❌ Reject invoice error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== XÓA ====================
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
  searchProduct,
  createInvoiceRequest,
  getAllInvoiceRequests,
  getMyInvoiceRequests, // ✅ THÊM
  getPendingInvoices,
  getInvoiceRequestById,
  approveInvoice,
  approveMultipleInvoices,
  rejectInvoice,
  deleteInvoiceRequest,
};
