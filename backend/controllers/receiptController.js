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
    const receipt = await Receipt.findById(receiptId);

    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu vừa tạo" });
    }

    console.log("✅ Phiếu tạo thành công:", receipt.receiptNo);
    console.log("📦 Số items trong phiếu:", receipt.items?.length || 0);

    // Luôn để awaiting_confirmation để Quản lý duyệt
    await Receipt.updateStatus(receiptId, "awaiting_confirmation", null, null);

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
// QUAN TRỌNG: HÀM DUYỆT PHIẾU NHẬP - THÊM SẢN PHẨM VÀO KHO
// ============================================================
const updateReceiptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    const receipt = await Receipt.findById(id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu" });
    }

    // Nếu duyệt phiếu -> thêm sản phẩm vào kho
    if (status === "approved") {
      console.log(
        `✅ Duyệt phiếu ${receipt.receiptNo}, thêm sản phẩm vào kho...`,
      );

      const items = receipt.items || [];
      let addedCount = 0;
      let errorItems = [];

      for (const item of items) {
        try {
          // Kiểm tra sản phẩm đã tồn tại trong kho chưa
          const existing = await Inventory.findByMaHang(item.maHang);

          if (existing) {
            // Nếu đã tồn tại -> CẬP NHẬT số lượng
            console.log(
              `📦 Sản phẩm ${item.maHang} đã tồn tại, cập nhật số lượng...`,
            );
            await Inventory.updateStock(
              item.maHang,
              item.soLuongNhap,
              "import",
            );
            addedCount++;
          } else {
            // Nếu chưa tồn tại -> THÊM MỚI
            console.log(
              `📦 Thêm sản phẩm mới: ${item.maHang} - ${item.tenThuongMai}`,
            );

            // Lấy STT max
            const [maxStt] = await db.execute(
              "SELECT MAX(stt) as maxStt FROM inventory",
            );
            const newStt = (maxStt[0]?.maxStt || 0) + 1;

            // Thêm vào bảng inventory
            await db.execute(
              `INSERT INTO inventory (
                stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
                giaNhap, soLuongNhap, tonKho, soLot, ngayHetHan,
                soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
                ngayNhapHD, ngayXuatHD, ghiChu,
                status, createdBy, approvedBy, approvedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
              [
                newStt,
                item.tenThuongMai || "",
                item.maHang || "",
                item.quyCach || "",
                item.hangSX || "",
                item.dvt || "",
                item.phanLoai || "",
                item.giaNhap || 0,
                item.soLuongNhap || 0,
                item.soLuongNhap || 0,
                item.soLot || "",
                item.ngayHetHan || null,
                item.soHopDongNhap || "",
                item.soHoaDonNhap || "",
                item.soHoaDonXuat || "",
                item.ngayNhapHD || null,
                item.ngayXuatHD || null,
                item.ghiChu || "",
                receipt.createdBy,
                approvedBy,
              ],
            );
            addedCount++;
          }
        } catch (err) {
          console.error(`❌ Lỗi khi thêm sản phẩm ${item.maHang}:`, err);
          errorItems.push(item.maHang);
        }
      }

      console.log(`✅ Đã thêm/cập nhật ${addedCount} sản phẩm vào kho`);

      // Gửi thông báo thành công
      await Notification.create(
        receipt.createdBy,
        `✅ Phiếu nhập ${receipt.receiptNo} đã được duyệt`,
        `Quản lý đã duyệt phiếu nhập. Đã thêm ${addedCount} sản phẩm vào kho.`,
        "success",
        id,
      );
    }

    // Cập nhật trạng thái phiếu
    await Receipt.updateStatus(id, status, approvedBy, rejectedReason);

    const statusText =
      status === "approved" ? "đã được duyệt" : "đã bị từ chối";

    await Notification.create(
      receipt.createdBy,
      `Phiếu nhập ${receipt.receiptNo} ${statusText}`,
      status === "rejected"
        ? `Lý do: ${rejectedReason}`
        : `Phiếu nhập của bạn đã được Quản lý duyệt`,
      status === "approved" ? "success" : "warning",
      id,
    );

    await EditHistory.log(
      approvedBy,
      "receipts",
      id,
      "UPDATE",
      "status",
      null,
      status,
    );

    res.json({
      success: true,
      message: `Đã ${status === "approved" ? "duyệt" : "từ chối"} phiếu`,
    });
  } catch (error) {
    console.error("Update receipt status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
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
        `SELECT * FROM receipt_items WHERE receiptId = ?`,
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
