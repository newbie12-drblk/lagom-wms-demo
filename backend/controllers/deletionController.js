const DeletionRequest = require("../models/DeletionRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// ==================== TẠO YÊU CẦU XÓA (NHIỀU SẢN PHẨM) ====================
const createDeletionRequest = async (req, res) => {
  try {
    const { productIds } = req.body;
    const requesterId = req.user.userId;

    console.log("📦 Nhận yêu cầu xóa từ Admin:", productIds);

    // Kiểm tra dữ liệu đầu vào
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất một sản phẩm cần xóa",
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const products = [];
    for (const productId of productIds) {
      const product = await Inventory.findById(productId);
      if (!product) {
        console.log(`⚠️ Sản phẩm ID ${productId} không tồn tại, bỏ qua`);
        continue;
      }
      products.push(product);
    }

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm nào hợp lệ để xóa",
      });
    }

    console.log(`📦 Tìm thấy ${products.length} sản phẩm hợp lệ`);

    // Kiểm tra sản phẩm nào đã có yêu cầu xóa đang chờ
    const existingRequests = await DeletionRequest.getAllRequests("pending");
    const existingProductIds = existingRequests.map((req) => req.productId);

    const validProducts = [];
    const skippedProducts = [];

    for (const product of products) {
      if (existingProductIds.includes(product.id)) {
        skippedProducts.push(`${product.tenThuongMai} (${product.maHang})`);
      } else {
        validProducts.push(product);
      }
    }

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Tất cả sản phẩm đã có yêu cầu xóa đang chờ duyệt: ${skippedProducts.join(", ")}`,
      });
    }

    // Tạo yêu cầu xóa cho từng sản phẩm
    const createdIds = [];
    for (const product of validProducts) {
      const requestId = await DeletionRequest.create(
        requesterId,
        product.id,
        product,
      );
      createdIds.push({ id: requestId, productName: product.tenThuongMai });
    }

    console.log(`✅ Đã tạo ${createdIds.length} yêu cầu xóa`);

    // Gửi thông báo cho Quản lý
    const productNames = validProducts
      .map((p) => `"${p.tenThuongMai}"`)
      .join(", ");
    await Notification.createForManagers(
      `🗑️ Yêu cầu xóa ${validProducts.length} sản phẩm`,
      `Admin yêu cầu xóa các sản phẩm: ${productNames}`,
      "approval",
      createdIds[0]?.id || null,
      "deletion_request",
    );

    let message = `✅ Đã gửi yêu cầu xóa ${validProducts.length} sản phẩm, chờ Quản lý duyệt.`;
    if (skippedProducts.length > 0) {
      message += `\n⚠️ Bỏ qua: ${skippedProducts.join(", ")} (đã có yêu cầu chờ duyệt)`;
    }

    res.json({
      success: true,
      data: {
        ids: createdIds,
        total: createdIds.length,
        skipped: skippedProducts,
      },
      message: message,
    });
  } catch (error) {
    console.error("❌ Create deletion request error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// ==================== LẤY TẤT CẢ YÊU CẦU XÓA ====================
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

// ==================== LẤY YÊU CẦU XÓA CỦA TÔI ====================
const getMyDeletionRequests = async (req, res) => {
  try {
    const requests = await DeletionRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my deletion requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== DUYỆT YÊU CẦU XÓA ====================
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

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Yêu cầu này đã được xử lý",
      });
    }

    // Cập nhật trạng thái yêu cầu
    await DeletionRequest.approve(id, approvedBy);

    // Xóa sản phẩm khỏi inventory
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

    // Gửi thông báo cho Admin
    await Notification.create(
      request.requesterId,
      "✅ Yêu cầu xóa sản phẩm đã được duyệt",
      `Sản phẩm "${request.productName}" đã được xóa khỏi kho theo yêu cầu của bạn`,
      "success",
      id,
      "deletion_request",
    );

    res.json({
      success: true,
      message: `Đã duyệt và xóa sản phẩm "${request.productName}" khỏi kho`,
    });
  } catch (error) {
    console.error("Approve deletion request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== TỪ CHỐI YÊU CẦU XÓA ====================
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
      "❌ Yêu cầu xóa sản phẩm bị từ chối",
      `Sản phẩm "${request.productName}" không được chấp thuận xóa.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "deletion_request",
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
