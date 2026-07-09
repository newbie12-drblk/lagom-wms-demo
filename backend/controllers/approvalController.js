const db = require("../config/database");
const ApprovalRequest = require("../models/ApprovalRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

const createApprovalRequest = async (req, res) => {
  try {
    const { products } = req.body;
    const requesterId = req.user.userId;

    console.log(
      "📦 Tạo yêu cầu thêm sản phẩm:",
      JSON.stringify(products, null, 2),
    );

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Phải có ít nhất một sản phẩm" });
    }

    // Kiểm tra mã hàng trùng trong yêu cầu
    const maHangs = products.map((p) => p.maHang);
    if (new Set(maHangs).size !== maHangs.length) {
      return res
        .status(400)
        .json({ success: false, message: "Mã hàng bị trùng trong yêu cầu" });
    }

    // Kiểm tra mã hàng đã tồn tại trong kho chưa
    for (const prod of products) {
      const existing = await Inventory.findByMaHang(prod.maHang);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Mã hàng ${prod.maHang} đã tồn tại trong kho`,
        });
      }
    }

    // Tạo yêu cầu
    const requestId = await ApprovalRequest.create(requesterId, { products });
    console.log("✅ Đã tạo yêu cầu ID:", requestId);

    // Gửi thông báo cho Quản lý
    await Notification.createForManagers(
      `📦 Yêu cầu thêm ${products.length} sản phẩm mới`,
      `Admin đã tạo yêu cầu thêm sản phẩm. Vui lòng kiểm tra và duyệt.`,
      "approval",
      requestId,
      "approval_request",
    );

    res.json({
      success: true,
      data: { id: requestId },
      message: "✅ Đã gửi yêu cầu thêm sản phẩm! Chờ Quản lý duyệt.",
    });
  } catch (error) {
    console.error("❌ Create approval request error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await ApprovalRequest.getAllRequests(status);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const requests = await ApprovalRequest.getByRequester(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user.userId;

    console.log(`✅ Duyệt yêu cầu ID: ${id}`);

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Yêu cầu này đã được xử lý" });
    }

    const products = request.productData.products || [];
    const createdIds = [];
    const errors = [];

    for (const prod of products) {
      try {
        // Kiểm tra mã hàng đã tồn tại trong kho chưa
        const existing = await Inventory.findByMaHang(prod.maHang);
        if (existing) {
          errors.push(`Mã hàng ${prod.maHang} đã tồn tại trong kho, bỏ qua`);
          continue;
        }

        // Chuẩn bị dữ liệu sản phẩm
        const productData = {
          tenThuongMai: prod.tenThuongMai || "",
          maHang: prod.maHang || "",
          quyCach: prod.quyCach || "",
          hangSX: prod.hangSX || "",
          dvt: prod.dvt || "",
          phanLoai: prod.phanLoai || "",
          giaNhap: prod.giaNhap || 0,
          giaXuat: prod.giaNhap || 0,
          tonKho: prod.tonKho || 0,
          soLuongNhap: prod.soLuongNhap || 0,
          soLuongXuat: 0,
          soLot: prod.soLot || "",
          ngayHetHan: prod.ngayHetHan || null,
          soHopDongNhap: prod.soHopDongNhap || "",
          soHoaDonNhap: prod.soHoaDonNhap || "",
          soHopDongXuat: "",
          soHoaDonXuat: "",
          ngayNhapHD: prod.ngayNhapHD || null,
          ngayXuatHD: null,
          ghiChu: prod.ghiChu || "",
        };

        console.log(
          `📦 Thêm sản phẩm: ${productData.maHang} - ${productData.tenThuongMai}`,
        );

        const productId = await Inventory.create(productData, approvedBy);
        createdIds.push(productId);

        await EditHistory.log(
          approvedBy,
          "inventory",
          productId,
          "APPROVE_CREATE",
          null,
          null,
          JSON.stringify(productData),
        );
      } catch (err) {
        console.error(`❌ Lỗi khi thêm sản phẩm ${prod.maHang}:`, err.message);
        errors.push(`Lỗi khi thêm ${prod.maHang}: ${err.message}`);
      }
    }

    await ApprovalRequest.approve(id, approvedBy);

    let message = `Đã duyệt yêu cầu, thêm ${createdIds.length} sản phẩm vào kho.`;
    if (errors.length) message += ` Lưu ý: ${errors.join("; ")}`;

    await Notification.create(
      request.requesterId,
      "✅ Yêu cầu thêm sản phẩm đã được duyệt",
      message,
      "success",
      id,
      "approval_request",
    );

    res.json({
      success: true,
      message: `Đã duyệt và thêm ${createdIds.length} sản phẩm vào kho`,
      errors,
    });
  } catch (error) {
    console.error("Approve request error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const request = await ApprovalRequest.findById(id);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Yêu cầu này đã được xử lý" });
    }

    await ApprovalRequest.reject(
      id,
      approvedBy,
      reason || "Không được chấp thuận",
    );

    await Notification.create(
      request.requesterId,
      "❌ Yêu cầu thêm sản phẩm đã bị từ chối",
      reason || "Quản lý đã từ chối yêu cầu của bạn",
      "warning",
      id,
      "approval_request",
    );

    res.json({ success: true, message: "Đã từ chối yêu cầu" });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await ApprovalRequest.delete(id);
    res.json({ success: true, message: "Xóa yêu cầu thành công" });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createApprovalRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest,
  deleteRequest,
};
