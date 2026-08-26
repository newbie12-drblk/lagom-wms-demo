const EditRequest = require("../models/EditRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

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

const getMyEditRequests = async (req, res) => {
  try {
    const requests = await EditRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my edit requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

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

    const oldProduct = await Inventory.findById(request.productId);
    if (!oldProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong kho",
      });
    }

    const newData = request.newData || {};
    const updateFields = {};

    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
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

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE inventory SET ${Object.keys(updateFields)
          .map((f) => `${f} = ?`)
          .join(", ")} WHERE id = ?`,
        [...Object.values(updateFields), request.productId],
      );

      await conn.execute(
        `UPDATE edit_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      await conn.commit();

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
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Approve edit request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

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
