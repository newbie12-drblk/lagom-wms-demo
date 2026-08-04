const EditRequest = require("../models/EditRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Tạo yêu cầu chỉnh sửa sản phẩm (Admin)
const createEditRequest = async (req, res) => {
  try {
    const { productId, updatedData } = req.body;
    const requesterId = req.user.userId;

    if (!productId || !updatedData) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn sản phẩm và cung cấp dữ liệu cập nhật",
      });
    }

    const oldProduct = await Inventory.findById(productId);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Kiểm tra xem đã có yêu cầu chỉnh sửa cho sản phẩm này chưa
    const existingRequests = await EditRequest.getAllRequests("pending");
    const alreadyRequested = existingRequests.some(
      (req) => req.productId == productId,
    );
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm này đã có yêu cầu chỉnh sửa đang chờ duyệt",
      });
    }

    const requestId = await EditRequest.create(
      requesterId,
      productId,
      oldProduct,
      updatedData,
    );

    // Gửi thông báo cho Quản lý
    await Notification.createForManagers(
      "✏️ Yêu cầu chỉnh sửa sản phẩm",
      `Admin yêu cầu chỉnh sửa sản phẩm "${oldProduct.tenThuongMai}" (${oldProduct.maHang})`,
      "approval",
      requestId,
      "edit_request",
    );

    res.json({
      success: true,
      data: { id: requestId },
      message: "✅ Đã gửi yêu cầu chỉnh sửa sản phẩm, chờ Quản lý duyệt",
    });
  } catch (error) {
    console.error("Create edit request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy tất cả yêu cầu chỉnh sửa (Quản lý)
const getAllEditRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await EditRequest.getAllRequests(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get all edit requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy yêu cầu chỉnh sửa của tôi (Admin)
const getMyEditRequests = async (req, res) => {
  try {
    const requests = await EditRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my edit requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ============================================================
// DUYỆT YÊU CẦU CHỈNH SỬA - FIX
// ============================================================
const approveEditRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    console.log(`✅ Duyệt yêu cầu chỉnh sửa ID: ${id}`);

    const request = await EditRequest.findById(id);
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

    // ✅ LẤY DỮ LIỆU CŨ TRƯỚC KHI CẬP NHẬT
    const oldProduct = await Inventory.findById(request.productId);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong kho",
      });
    }

    // ✅ CHỈ CẬP NHẬT 7 TRƯỜNG CƠ BẢN
    const newData = request.newData || {};
    const updateFields = {};

    // Chỉ cập nhật các trường được phép (7 trường)
    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "dvt",
      "hangSX",
      "phanLoai",
      "giaNhap",
      "soHopDongNhap",
    ];

    for (const field of allowedFields) {
      if (newData[field] !== undefined) {
        updateFields[field] = newData[field];
      }
    }

    console.log("📦 Cập nhật các trường:", updateFields);

    // ✅ CẬP NHẬT SẢN PHẨM TRONG INVENTORY
    await Inventory.update(request.productId, updateFields);

    // ✅ CẬP NHẬT TRẠNG THÁI YÊU CẦU
    await EditRequest.approve(id, approvedBy);

    // ✅ GHI LỊCH SỬ
    await EditHistory.log(
      approvedBy,
      "inventory",
      request.productId,
      "EDIT_BY_APPROVAL",
      null,
      JSON.stringify(oldProduct),
      JSON.stringify({ ...oldProduct, ...updateFields }),
    );

    // ✅ GỬI THÔNG BÁO CHO ADMIN
    await Notification.create(
      request.requesterId,
      "✅ Yêu cầu chỉnh sửa sản phẩm đã được duyệt",
      `Sản phẩm "${request.productName}" đã được cập nhật theo yêu cầu của bạn`,
      "success",
      id,
      "edit_request",
    );

    res.json({
      success: true,
      message: `Đã duyệt và cập nhật sản phẩm "${request.productName}"`,
    });
  } catch (error) {
    console.error("Approve edit request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// Từ chối yêu cầu chỉnh sửa (Quản lý)
const rejectEditRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await EditRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    await EditRequest.reject(id, approvedBy, reason);

    await Notification.create(
      request.requesterId,
      "❌ Yêu cầu chỉnh sửa sản phẩm bị từ chối",
      `Sản phẩm "${request.productName}" không được chấp thuận chỉnh sửa.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "edit_request",
    );

    res.json({ success: true, message: "Đã từ chối yêu cầu chỉnh sửa" });
  } catch (error) {
    console.error("Reject edit request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createEditRequest,
  getAllEditRequests,
  getMyEditRequests,
  approveEditRequest,
  rejectEditRequest,
};
