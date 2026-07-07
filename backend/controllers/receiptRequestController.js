const ReceiptRequest = require("../models/ReceiptRequest");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// ADMIN: Tạo đề nghị nhập hàng
const createReceiptRequest = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.userId;

    if (!data.tenThuongMai || !data.maHang) {
      return res.status(400).json({
        success: false,
        message: "Tên thương mại và mã hàng là bắt buộc",
      });
    }

    const result = await ReceiptRequest.create(data, createdBy);

    const statusText = result.isMatched ? "Chờ xác nhận" : "Chờ duyệt";

    // Gửi thông báo cho Quản lý
    await Notification.createForManagers(
      `📥 Đề nghị nhập hàng - ${statusText}`,
      `Admin đề nghị nhập "${data.tenThuongMai}" (${data.maHang})`,
      "approval",
      result.id,
      "receipt_request",
    );

    res.json({
      success: true,
      data: {
        id: result.id,
        requestNo: result.requestNo,
        matchStatus: result.matchStatus,
        isMatched: result.isMatched,
      },
      message: `Đã tạo đề nghị nhập hàng, ${statusText}`,
      matchDetails: result.matchDetails || [],
    });
  } catch (error) {
    console.error("Create receipt request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// QUẢN LÝ: Lấy danh sách chờ duyệt - SỬA LẠI
const getPendingReceiptRequests = async (req, res) => {
  try {
    // Lấy tất cả status pending và awaiting_confirmation
    const requests = await ReceiptRequest.getPending();
    console.log(`📥 Found ${requests.length} pending receipt requests`);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get pending receipt requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// QUẢN LÝ: Lấy tất cả đề nghị
const getAllReceiptRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await ReceiptRequest.getAll(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get receipt requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// QUẢN LÝ: Xác nhận/duyệt đề nghị nhập hàng
const approveReceiptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { soLuongNhap } = req.body;
    const approvedBy = req.user.userId;

    const request = await ReceiptRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }

    if (
      request.status !== "pending" &&
      request.status !== "awaiting_confirmation"
    ) {
      return res.status(400).json({
        success: false,
        message: "Đề nghị này đã được xử lý",
      });
    }

    if (request.matchStatus === "matched" && !soLuongNhap) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số lượng nhập để xác nhận",
      });
    }

    await ReceiptRequest.approve(id, approvedBy, soLuongNhap);

    const statusText = request.matchStatus === "matched" ? "xác nhận" : "duyệt";
    await Notification.create(
      request.createdBy,
      `✅ Đề nghị nhập hàng đã được ${statusText}`,
      `Đề nghị nhập "${request.tenThuongMai}" (${request.maHang}) đã được Quản lý ${statusText}`,
      "success",
      id,
      "receipt_request",
    );

    res.json({
      success: true,
      message: `Đã ${statusText} đề nghị nhập hàng thành công`,
    });
  } catch (error) {
    console.error("Approve receipt request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// QUẢN LÝ: Từ chối đề nghị nhập hàng
const rejectReceiptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await ReceiptRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }

    await ReceiptRequest.reject(id, approvedBy, reason);

    await Notification.create(
      request.createdBy,
      "❌ Đề nghị nhập hàng bị từ chối",
      `Đề nghị nhập "${request.tenThuongMai}" (${request.maHang}) bị từ chối.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "receipt_request",
    );

    res.json({
      success: true,
      message: `Đã từ chối đề nghị nhập hàng`,
    });
  } catch (error) {
    console.error("Reject receipt request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy chi tiết đề nghị
const getReceiptRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ReceiptRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đề nghị",
      });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    console.error("Get receipt request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createReceiptRequest,
  getPendingReceiptRequests,
  getAllReceiptRequests,
  approveReceiptRequest,
  rejectReceiptRequest,
  getReceiptRequestById,
};
