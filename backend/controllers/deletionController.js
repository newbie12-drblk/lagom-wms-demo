const DeletionRequest = require("../models/DeletionRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Tạo yêu cầu xóa sản phẩm
const createDeletionRequest = async (req, res) => {
  try {
    const { productId } = req.body;
    const requesterId = req.user.userId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn sản phẩm cần xóa",
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Inventory.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    // Kiểm tra xem đã có yêu cầu xóa cho sản phẩm này chưa (pending)
    const existingRequests = await DeletionRequest.getAllRequests("pending");
    const alreadyRequested = existingRequests.some(
      (req) => req.productId == productId,
    );
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm này đã có yêu cầu xóa đang chờ duyệt",
      });
    }

    const requestId = await DeletionRequest.create(
      requesterId,
      productId,
      product,
    );

    res.json({
      success: true,
      data: { id: requestId },
      message: "Đã gửi yêu cầu xóa sản phẩm, chờ admin duyệt",
    });
  } catch (error) {
    console.error("Create deletion request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy tất cả yêu cầu xóa (admin)
const getAllDeletionRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await DeletionRequest.getAllRequests(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get all deletion requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy yêu cầu xóa của tôi (nhập liệu)
const getMyDeletionRequests = async (req, res) => {
  try {
    const requests = await DeletionRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my deletion requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Duyệt yêu cầu xóa (admin) - ĐÃ SỬA THỨ TỰ
const approveDeletionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    const request = await DeletionRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    // QUAN TRỌNG: Xóa yêu cầu TRƯỚC để phá foreign key constraint
    await DeletionRequest.delete(id);

    // Sau đó xóa sản phẩm khỏi inventory
    await Inventory.delete(request.productId);

    // Ghi lịch sử
    await EditHistory.log(
      approvedBy,
      "inventory",
      request.productId,
      "DELETE_BY_APPROVAL",
      null,
      null,
      JSON.stringify(request.productData),
    );

    // Gửi thông báo cho người yêu cầu
    await Notification.create(
      request.requesterId,
      "Yêu cầu xóa sản phẩm đã được duyệt",
      `Sản phẩm "${request.productName}" đã được xóa khỏi kho`,
      "success",
      id,
    );

    res.json({
      success: true,
      message: `Đã duyệt và xóa sản phẩm "${request.productName}" khỏi kho`,
    });
  } catch (error) {
    console.error("Approve deletion request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// Từ chối yêu cầu xóa (admin)
const rejectDeletionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await DeletionRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu",
      });
    }

    await DeletionRequest.reject(id, approvedBy, reason);

    await Notification.create(
      request.requesterId,
      "Yêu cầu xóa sản phẩm đã bị từ chối",
      reason || "Admin đã từ chối yêu cầu xóa của bạn",
      "warning",
      id,
    );

    res.json({ success: true, message: "Đã từ chối yêu cầu xóa" });
  } catch (error) {
    console.error("Reject deletion request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createDeletionRequest,
  getAllDeletionRequests,
  getMyDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
};
