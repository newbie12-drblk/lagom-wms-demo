const ExportRequest = require("../models/ExportRequest");
const Notification = require("../models/Notification");

const createExportRequest = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.userId;

    if (!data.tenThuongMai || !data.maHang) {
      return res.status(400).json({
        success: false,
        message: "Tên thương mại và mã hàng là bắt buộc",
      });
    }

    const result = await ExportRequest.create(data, createdBy);

    const statusText = result.isMatched ? "Chờ xác nhận" : "Chờ duyệt";

    await Notification.createForManagers(
      `📤 Đề nghị xuất kho - ${statusText}`,
      `Admin đề nghị xuất "${data.tenThuongMai}" (${data.maHang})`,
      "approval",
      result.id,
      "export_request",
    );

    res.json({
      success: true,
      data: {
        id: result.id,
        requestNo: result.requestNo,
        matchStatus: result.matchStatus,
        isMatched: result.isMatched,
        currentStock: result.currentStock,
      },
      message: `Đã tạo đề nghị xuất kho, ${statusText}`,
      matchDetails: result.matchDetails || [],
    });
  } catch (error) {
    console.error("Create export request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getPendingExportRequests = async (req, res) => {
  try {
    const requests = await ExportRequest.getPending();
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get pending export requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getAllExportRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await ExportRequest.getAll(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get export requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const approveExportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      donGiaXuat,
      soLuong,
      soLot,
      ngayHetHan,
      soHopDongXuat,
      soHoaDonXuat,
      ngayXuatHD,
      soHoaDonNhap,
      ngayNhapHD,
    } = req.body;
    const approvedBy = req.user.userId;

    const request = await ExportRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Đề nghị này đã được xử lý",
      });
    }

    const finalQuantity = soLuong || request.soLuong || 0;
    if (finalQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số lượng xuất hợp lệ (> 0)",
      });
    }

    if (!soLot) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Số lot",
      });
    }
    if (!ngayHetHan) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Ngày hết hạn",
      });
    }

    await ExportRequest.approve(id, approvedBy, {
      donGiaXuat: donGiaXuat || request.donGiaXuat || 0,
      soLuong: finalQuantity,
      soLot: soLot || request.soLot || "",
      ngayHetHan: ngayHetHan || request.ngayHetHan || null,
      soHopDongXuat: soHopDongXuat || request.soHopDongXuat || "",
      soHoaDonXuat: soHoaDonXuat || "",
      ngayXuatHD: ngayXuatHD || new Date().toISOString().split("T")[0],
      soHoaDonNhap: soHoaDonNhap || request.soHoaDonNhap || "",
      ngayNhapHD: ngayNhapHD || request.ngayNhapHD || null,
    });

    const statusText = request.matchStatus === "matched" ? "xác nhận" : "duyệt";
    await Notification.create(
      request.createdBy,
      `✅ Đề nghị xuất kho đã được ${statusText}`,
      `Đề nghị xuất "${request.tenThuongMai}" (${request.maHang}) đã được Quản lý ${statusText}`,
      "success",
      id,
      "export_request",
    );

    res.json({
      success: true,
      message: `Đã ${statusText} đề nghị xuất kho thành công`,
    });
  } catch (error) {
    console.error("Approve export request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const rejectExportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await ExportRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }

    await ExportRequest.reject(id, approvedBy, reason);

    await Notification.create(
      request.createdBy,
      "❌ Đề nghị xuất kho bị từ chối",
      `Đề nghị xuất "${request.tenThuongMai}" (${request.maHang}) bị từ chối.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "export_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối đề nghị xuất kho`,
    });
  } catch (error) {
    console.error("Reject export request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getExportRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ExportRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Get export request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createExportRequest,
  getPendingExportRequests,
  getAllExportRequests,
  approveExportRequest,
  rejectExportRequest,
  getExportRequestById,
};
