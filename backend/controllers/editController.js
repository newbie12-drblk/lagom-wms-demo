const EditRequest = require("../models/EditRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Tạo yêu cầu chỉnh sửa sản phẩm
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

    res.json({
      success: true,
      data: { id: requestId },
      message: "Đã gửi yêu cầu chỉnh sửa sản phẩm, chờ admin duyệt",
    });
  } catch (error) {
    console.error("Create edit request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy tất cả yêu cầu chỉnh sửa (admin)
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

// Lấy yêu cầu chỉnh sửa của tôi (nhập liệu)
const getMyEditRequests = async (req, res) => {
  try {
    const requests = await EditRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my edit requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Duyệt yêu cầu chỉnh sửa (admin)
const approveEditRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    const request = await EditRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    // Cập nhật sản phẩm trong inventory
    await Inventory.update(request.productId, request.newData);

    // Xóa yêu cầu
    await EditRequest.delete(id);

    // Ghi lịch sử
    await EditHistory.log(
      approvedBy,
      "inventory",
      request.productId,
      "EDIT_BY_APPROVAL",
      null,
      JSON.stringify(request.oldData),
      JSON.stringify(request.newData),
    );

    // Gửi thông báo
    await Notification.create(
      request.requesterId,
      "Yêu cầu chỉnh sửa sản phẩm đã được duyệt",
      `Sản phẩm "${request.productName}" đã được cập nhật`,
      "success",
      id,
    );

    res.json({
      success: true,
      message: `Đã duyệt và cập nhật sản phẩm "${request.productName}"`,
    });
  } catch (error) {
    console.error("Approve edit request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Từ chối yêu cầu chỉnh sửa (admin)
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
    await EditRequest.delete(id);

    await Notification.create(
      request.requesterId,
      "Yêu cầu chỉnh sửa sản phẩm đã bị từ chối",
      reason || "Admin đã từ chối yêu cầu chỉnh sửa của bạn",
      "warning",
      id,
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
