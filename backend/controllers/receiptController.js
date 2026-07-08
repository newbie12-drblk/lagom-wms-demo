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
    console.log("📦 Số items trong phiếu:", receipt.items?.length || 0);

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
// HÀM DUYỆT PHIẾU NHẬP - THÊM SẢN PHẨM VÀO KHO
// ĐÃ SỬA: ĐỒNG BỘ VỚI TẤT CẢ TRƯỜNG TRONG inventory
// ============================================================
const updateReceiptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    console.log(`📋 Cập nhật phiếu ID: ${id}, Status: ${status}`);

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }

    console.log(
      `📦 Phiếu ${receipt.receiptNo} có ${receipt.items?.length || 0} sản phẩm`,
    );

    // Nếu duyệt phiếu -> thêm sản phẩm vào kho
    if (status === "approved") {
      const items = receipt.items || [];

      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Phiếu không có sản phẩm để nhập kho!",
        });
      }

      let addedCount = 0;
      let updatedCount = 0;

      const [maxSttResult] = await db.execute(
        "SELECT MAX(stt) as maxStt FROM inventory",
      );
      let currentStt = maxSttResult[0]?.maxStt || 0;

      for (const item of items) {
        try {
          console.log(
            `📦 Xử lý sản phẩm: ${item.maHang} - ${item.tenThuongMai}`,
          );

          const [existing] = await db.execute(
            "SELECT * FROM inventory WHERE maHang = ?",
            [item.maHang],
          );

          if (existing.length > 0) {
            // Nếu đã tồn tại -> CẬP NHẬT số lượng
            console.log(
              `📦 Sản phẩm ${item.maHang} đã tồn tại, cập nhật số lượng...`,
            );
            await db.execute(
              `UPDATE inventory SET 
                tonKho = tonKho + ?,
                soLuongNhap = soLuongNhap + ?,
                giaNhap = ?,
                soHopDongNhap = ?,
                soHoaDonNhap = ?,
                ngayNhapHD = ?,
                soLot = ?,
                ngayHetHan = ?,
                ghiChu = ?,
                updatedAt = NOW()
              WHERE maHang = ?`,
              [
                item.soLuongNhap || 0,
                item.soLuongNhap || 0,
                item.giaNhap || 0,
                item.soHopDongNhap || "",
                item.soHoaDonNhap || "",
                item.ngayNhapHD || null,
                item.soLot || "",
                item.ngayHetHan || null,
                item.ghiChu || "",
                item.maHang,
              ],
            );
            updatedCount++;
          } else {
            // Nếu chưa tồn tại -> THÊM MỚI VỚI ĐẦY ĐỦ TRƯỜNG
            console.log(
              `📦 Thêm sản phẩm mới: ${item.maHang} - ${item.tenThuongMai}`,
            );
            currentStt++;

            await db.execute(
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
                item.giaNhap || 0, // giaXuat = giaNhap
                item.soLuongNhap || 0,
                0, // soLuongXuat = 0
                item.soLuongNhap || 0, // tonKho = soLuongNhap
                item.soLot || "",
                item.ngayHetHan || null,
                item.soHopDongNhap || "",
                item.soHoaDonNhap || "",
                "", // soHoaDonXuat = ""
                item.ngayNhapHD || null,
                null, // ngayXuatHD = NULL
                item.ghiChu || "",
                receipt.createdBy,
                approvedBy,
              ],
            );
            addedCount++;
          }
        } catch (err) {
          console.error(
            `❌ Lỗi khi thêm sản phẩm ${item.maHang}:`,
            err.message,
          );
        }
      }

      console.log(
        `✅ Đã thêm ${addedCount} sản phẩm mới, cập nhật ${updatedCount} sản phẩm vào kho`,
      );

      await Notification.create(
        receipt.createdBy,
        `✅ Phiếu nhập ${receipt.receiptNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu nhập. Đã thêm ${addedCount} sản phẩm mới và cập nhật ${updatedCount} sản phẩm vào kho.`,
        "success",
        id,
      );
    }

    await Receipt.updateStatus(id, status, approvedBy, rejectedReason);

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu`,
    });
  } catch (error) {
    console.error("❌ Update receipt status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
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
          soHopDongNhap, soHoaDonNhap, ngayNhapHD,
          soLuongXuat, giaXuat, soHopDongXuat, soHoaDonXuat, ngayXuatHD,
          ghiChu
         FROM receipt_items WHERE receiptId = ?`,
        [row.id],
      );
      console.log(`  - ${row.receiptNo}: ${items.length} items`);
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
    const userId = req.user.userId;

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
