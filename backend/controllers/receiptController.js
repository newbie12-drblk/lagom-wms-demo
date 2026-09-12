const db = require("../config/database");
const Receipt = require("../models/Receipt");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

const getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.getAll();
    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error("Get receipts error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }
    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error("Get receipt by id error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const createReceipt = async (req, res) => {
  try {
    const receiptData = req.body;
    const createdBy = req.user.userId;

    console.log("📥 Tạo phiếu nhập bởi user:", createdBy);
    console.log("📦 Số lượng items:", receiptData.items?.length || 0);

    const receiptId = await Receipt.create(receiptData, createdBy);
    await Receipt.updateStatus(receiptId, "awaiting_confirmation", null, null);

    const receipt = await Receipt.findById(receiptId);

    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu vừa tạo" });
    }

    console.log("✅ Phiếu tạo thành công:", receipt.receiptNo);

    await Notification.createForManagers(
      `📥 Phiếu nhập ${receipt.receiptNo} chờ duyệt`,
      `Admin vừa tạo phiếu nhập mới. Vui lòng kiểm tra và duyệt.`,
      "approval",
      receiptId,
      "receipt",
    );

    res.json({
      success: true,
      data: {
        id: receiptId,
        status: "awaiting_confirmation",
        receiptNo: receipt.receiptNo,
        items: receipt.items || [],
      },
      message: "✅ Tạo phiếu nhập thành công! Phiếu đang chờ Quản lý duyệt.",
    });
  } catch (error) {
    console.error("❌ Create receipt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// ============================================================
// ✅ DUYỆT PHIẾU NHẬP — INSERT ITEMS VÀO INVENTORY
// ============================================================
const updateReceiptStatus = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    console.log(`📋 Cập nhật phiếu nhập ID: ${id}, Status: ${status}`);

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu",
      });
    }

    if (
      receipt.status !== "pending" &&
      receipt.status !== "awaiting_confirmation"
    ) {
      return res.status(400).json({
        success: false,
        message: "Phiếu này đã được xử lý",
      });
    }

    console.log(
      `📦 Phiếu ${receipt.receiptNo} có ${receipt.items?.length || 0} sản phẩm`,
    );

    await conn.beginTransaction();

    // Cập nhật status phiếu
    await conn.execute(
      `UPDATE receipts 
       SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectedReason || null, id],
    );

    // ✅ NẾU DUYỆT → INSERT TẤT CẢ ITEMS VÀO INVENTORY
    if (status === "approved") {
      if (!receipt.items || receipt.items.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "Phiếu nhập không có sản phẩm nào để lưu vào kho",
        });
      }

      // Lấy stt lớn nhất hiện tại
      const [maxSttResult] = await conn.execute(
        "SELECT MAX(stt) as maxStt FROM inventory",
      );
      let currentStt = maxSttResult[0]?.maxStt || 0;

      for (const item of receipt.items) {
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
            item.tenThuongMai || "",
            item.maHang || "",
            item.quyCach || "",
            item.hangSX || "",
            item.dvt || "",
            item.phanLoai || "",
            item.giaNhap || 0,
            0, // giaXuat = 0
            item.soLuongNhap || 0,
            0, // soLuongXuat = 0
            item.soLuongNhap || 0, // tonKho = soLuongNhap
            item.soLot || "",
            item.ngayHetHan || null,
            item.soHopDongNhap || "",
            item.soHoaDonNhap || "",
            "", // soHoaDonXuat để trống
            item.ngayNhapHD || null,
            null, // ngayXuatHD để trống
            item.ghiChu || "",
            receipt.createdBy,
            approvedBy,
          ],
        );

        console.log(
          `  ✅ Inserted inventory: ${item.maHang} - SL: ${item.soLuongNhap}`,
        );
      }

      console.log(
        `✅ Đã lưu ${receipt.items.length} sản phẩm vào tồn kho từ phiếu ${receipt.receiptNo}`,
      );
    }

    await conn.commit();

    // Thông báo
    if (status === "approved") {
      await Notification.create(
        receipt.createdBy,
        `✅ Phiếu nhập ${receipt.receiptNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu nhập. ${receipt.items.length} sản phẩm đã được lưu vào tồn kho.`,
        "success",
        id,
        "receipt",
      );
    } else if (status === "rejected") {
      await Notification.create(
        receipt.createdBy,
        `❌ Phiếu nhập ${receipt.receiptNo} bị từ chối`,
        `Lý do: ${rejectedReason || "Không được chấp thuận"}`,
        "warning",
        id,
        "receipt",
      );
    }

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu nhập thành công${
        status === "approved"
          ? ` — Đã lưu ${receipt.items.length} sản phẩm vào tồn kho`
          : ""
      }`,
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Update receipt status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  } finally {
    conn.release();
  }
};

const getPendingReceipts = async (req, res) => {
  try {
    console.log("📋 Fetching pending receipts...");

    const [rows] = await db.execute(
      `SELECT r.*, u.fullName as creatorName 
       FROM receipts r 
       LEFT JOIN users u ON r.createdBy = u.id 
       WHERE r.status IN ('pending', 'awaiting_confirmation')
       ORDER BY r.createdAt DESC`,
    );

    console.log(`📋 Found ${rows.length} pending receipts`);

    const result = [];
    for (const row of rows) {
      const [items] = await db.execute(
        `SELECT 
          id, receiptId, 
          tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
          giaNhap, soLuongNhap, thanhTien,
          soLot, ngayHetHan,
          soHopDongNhap, soHoaDonNhap,
          ngayNhapHD, ghiChu
         FROM receipt_items WHERE receiptId = ?`,
        [row.id],
      );
      result.push({ ...row, items });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Get pending receipts error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }

    await Receipt.delete(id);
    res.json({ success: true, message: "Xóa phiếu thành công" });
  } catch (error) {
    console.error("Delete receipt error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getAllReceipts,
  getReceiptById,
  createReceipt,
  updateReceiptStatus,
  getPendingReceipts,
  deleteReceipt,
};
