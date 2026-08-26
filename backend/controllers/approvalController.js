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

    const maHangs = products.map((p) => p.maHang);
    if (new Set(maHangs).size !== maHangs.length) {
      return res
        .status(400)
        .json({ success: false, message: "Mã hàng bị trùng trong yêu cầu" });
    }

    for (const prod of products) {
      const existing = await Inventory.findByMaHang(prod.maHang);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Mã hàng ${prod.maHang} đã tồn tại trong kho`,
        });
      }
    }

    // Lưu từng sản phẩm với 4 trường hóa đơn
    for (const prod of products) {
      const requestId = await ApprovalRequest.create(requesterId, prod);
      console.log("✅ Đã tạo yêu cầu ID:", requestId);
    }

    // Lấy danh sách yêu cầu vừa tạo
    const allRequests = await ApprovalRequest.getByRequester(requesterId);
    const latestRequests = allRequests.slice(0, products.length);

    await Notification.createForManagers(
      `📦 Yêu cầu thêm ${products.length} sản phẩm mới`,
      `Admin đã tạo yêu cầu thêm sản phẩm. Vui lòng kiểm tra và duyệt.`,
      "approval",
      latestRequests[0]?.id || null,
      "approval_request",
    );

    res.json({
      success: true,
      data: { ids: latestRequests.map((r) => r.id) },
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

    const productData = request.productData || {};
    const createdIds = [];
    const errors = [];

    const [maxSttResult] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    let currentStt = maxSttResult[0]?.maxStt || 0;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      currentStt++;

      // ✅ LƯU 11 TRƯỜNG VÀO INVENTORY (7 + 4 HÓA ĐƠN)
      await conn.execute(
        `INSERT INTO inventory (
          stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
          giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
          soLot, ngayHetHan,
          soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
          ngayNhapHD, ngayXuatHD, ghiChu,
          status, createdBy, approvedBy, approvedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
        [
          currentStt,
          productData.tenThuongMai || "",
          productData.maHang || "",
          productData.quyCach || "",
          productData.hangSX || "",
          productData.dvt || "",
          productData.phanLoai || "",
          productData.giaNhap || 0,
          0,
          productData.soLuongNhap || 0,
          0,
          productData.soLuongNhap || 0,
          productData.soLot || "",
          productData.ngayHetHan || null,
          productData.soHopDongNhap || "",
          productData.soHoaDonNhap || "", // ✅ TRƯỜNG MỚI
          productData.soHoaDonXuat || "", // ✅ TRƯỜNG MỚI
          productData.ngayNhapHD || null, // ✅ TRƯỜNG MỚI
          productData.ngayXuatHD || null, // ✅ TRƯỜNG MỚI
          productData.ghiChu || "",
          request.requesterId,
          approvedBy,
        ],
      );

      createdIds.push(currentStt);

      await conn.execute(
        `UPDATE approval_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      await conn.commit();

      let message = `Đã duyệt yêu cầu, thêm 1 sản phẩm vào kho.`;
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
        message: `Đã duyệt và thêm sản phẩm vào kho`,
        errors,
        data: { createdIds, count: createdIds.length },
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
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
