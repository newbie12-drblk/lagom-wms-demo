const db = require("../config/database");
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

    // ✅ 9 trường cho phép sửa
    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "dvt",
      "hangSX",
      "phanLoai",
      "giaNhap",
      "soHopDongNhap",
      "soLuongNhap",
    ];

    // ✅ Kiểm tra trường thay đổi
    const changedFields = {};
    let hasChange = false;
    const changeDetails = [];

    for (const field of allowedFields) {
      if (updatedData[field] !== undefined) {
        const oldVal = oldProduct[field] !== undefined ? oldProduct[field] : "";
        const newVal =
          updatedData[field] !== undefined ? updatedData[field] : "";
        if (String(oldVal).trim() !== String(newVal).trim()) {
          changedFields[field] = updatedData[field];
          hasChange = true;

          const fieldLabels = {
            tenThuongMai: "Tên thương mại",
            maHang: "Mã hàng",
            quyCach: "Quy cách",
            dvt: "ĐVT",
            hangSX: "Hãng/Nước SX",
            phanLoai: "Phân loại máy",
            giaNhap: "Giá nhập",
            soHopDongNhap: "Số HĐ",
            soLuongNhap: "Số lượng nhập",
          };
          changeDetails.push(
            `${fieldLabels[field] || field}: "${oldVal || ""}" → "${newVal || ""}"`,
          );
        }
      }
    }

    if (!hasChange) {
      return res.status(400).json({
        success: false,
        message: "Không có trường nào được thay đổi! Vui lòng kiểm tra lại.",
      });
    }

    // ✅ Kiểm tra yêu cầu pending
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

    // ✅ Tạo request với CHỈ những trường thay đổi
    const requestId = await EditRequest.create(
      requesterId,
      productId,
      oldProduct,
      changedFields,
    );

    // ✅ Gửi thông báo cho Quản lý
    const changeSummary = changeDetails.join("\n");
    await Notification.createForManagers(
      `✏️ Yêu cầu chỉnh sửa sản phẩm "${oldProduct.tenThuongMai}"`,
      `Admin yêu cầu chỉnh sửa ${Object.keys(changedFields).length} trường:\n${changeSummary}`,
      "approval",
      requestId,
      "edit_request",
    );

    res.json({
      success: true,
      data: {
        id: requestId,
        changedFields: Object.keys(changedFields),
        changeCount: Object.keys(changedFields).length,
      },
      message: `✅ Đã gửi yêu cầu chỉnh sửa ${Object.keys(changedFields).length} trường, chờ Quản lý duyệt`,
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

    // ✅ 9 trường cho phép cập nhật
    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "dvt",
      "hangSX",
      "phanLoai",
      "giaNhap",
      "soHopDongNhap",
      "soLuongNhap",
    ];

    const updateFields = {};
    const changeDetails = [];

    for (const field of allowedFields) {
      if (newData[field] !== undefined) {
        const oldVal = oldProduct[field] !== undefined ? oldProduct[field] : "";
        const newVal = newData[field] !== undefined ? newData[field] : "";
        if (String(oldVal).trim() !== String(newVal).trim()) {
          updateFields[field] = newData[field];

          const fieldLabels = {
            tenThuongMai: "Tên thương mại",
            maHang: "Mã hàng",
            quyCach: "Quy cách",
            dvt: "ĐVT",
            hangSX: "Hãng/Nước SX",
            phanLoai: "Phân loại máy",
            giaNhap: "Giá nhập",
            soHopDongNhap: "Số HĐ",
            soLuongNhap: "Số lượng nhập",
          };
          changeDetails.push(
            `${fieldLabels[field] || field}: "${oldVal || ""}" → "${newVal || ""}"`,
          );
        }
      }
    }

    console.log("📦 Cập nhật các trường:", updateFields);

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có trường nào được cập nhật",
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Cập nhật sản phẩm
      const setClause = Object.keys(updateFields)
        .map((f) => `${f} = ?`)
        .join(", ");
      const values = [...Object.values(updateFields), request.productId];

      await conn.execute(
        `UPDATE inventory SET ${setClause} WHERE id = ?`,
        values,
      );

      // Cập nhật trạng thái request
      await conn.execute(
        `UPDATE edit_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      await conn.commit();

      // ✅ Gửi thông báo
      const changeSummary = changeDetails.join("\n");
      await Notification.create(
        request.requesterId,
        "✅ Yêu cầu chỉnh sửa sản phẩm đã được duyệt",
        `Sản phẩm "${request.productName}" đã được cập nhật ${Object.keys(updateFields).length} trường:\n${changeSummary}`,
        "success",
        id,
        "edit_request",
      );

      res.json({
        success: true,
        message: `Đã duyệt và cập nhật ${Object.keys(updateFields).length} trường của sản phẩm "${request.productName}"`,
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
