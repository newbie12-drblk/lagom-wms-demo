const db = require("../config/database");
const ApprovalRequest = require("../models/ApprovalRequest");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

const createApprovalRequest = async (req, res) => {
  try {
    const { products } = req.body;
    const requesterId = req.user.userId;

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

    const requestId = await ApprovalRequest.create(requesterId, { products });

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

    console.log(`✅ Duyệt yêu cầu thêm sản phẩm ID: ${id}`);

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

    const [maxSttResult] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    let currentStt = maxSttResult[0]?.maxStt || 0;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const prod of products) {
        try {
          const existing = await Inventory.findByMaHang(prod.maHang);
          if (existing) {
            errors.push(`Mã hàng ${prod.maHang} đã tồn tại trong kho, bỏ qua`);
            continue;
          }

          currentStt++;

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
              prod.tenThuongMai || "",
              prod.maHang || "",
              prod.quyCach || "",
              prod.hangSX || "",
              prod.dvt || "",
              prod.phanLoai || "",
              prod.giaNhap || 0,
              0,
              prod.soLuongNhap || 0,
              0,
              prod.soLuongNhap || 0,
              prod.soLot || "",
              prod.ngayHetHan || null,
              prod.soHopDongNhap || "",
              prod.soHoaDonNhap || "",
              prod.soHoaDonXuat || "",
              prod.ngayNhapHD || null,
              null,
              prod.ghiChu || "",
              request.requesterId,
              approvedBy,
            ],
          );

          createdIds.push(currentStt);
        } catch (err) {
          errors.push(`Lỗi khi thêm ${prod.maHang}: ${err.message}`);
        }
      }

      await conn.execute(
        `UPDATE approval_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      await conn.commit();

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
