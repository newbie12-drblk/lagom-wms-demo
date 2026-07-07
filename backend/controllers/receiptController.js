const db = require("../config/database");
const Receipt = require("../models/Receipt");
const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Lấy tất cả phiếu nhập
const getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.getAll();
    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error("Get receipts error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy phiếu nhập theo ID
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

// Tạo phiếu nhập mới
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

    let allMatched = true;
    let mismatchDetails = [];
    let matchedProducts = [];

    for (const item of receipt.items || []) {
      const product = await Inventory.findByMaHang(item.maHang);

      if (!product) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Sản phẩm "${item.tenThuongMai}" (${item.maHang}) chưa có trong kho`,
        );
        continue;
      }

      let itemMatched = true;
      let itemErrors = [];

      if (product.tenThuongMai !== item.tenThuongMai) {
        itemMatched = false;
        itemErrors.push(
          `Tên: "${product.tenThuongMai}" → "${item.tenThuongMai}"`,
        );
      }
      if (product.quyCach !== item.quyCach) {
        itemMatched = false;
        itemErrors.push(`Quy cách: "${product.quyCach}" → "${item.quyCach}"`);
      }
      if (product.hangSX !== item.hangSX) {
        itemMatched = false;
        itemErrors.push(`Hãng SX: "${product.hangSX}" → "${item.hangSX}"`);
      }
      if (product.dvt !== item.dvt) {
        itemMatched = false;
        itemErrors.push(`ĐVT: "${product.dvt}" → "${item.dvt}"`);
      }

      if (!itemMatched) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Sản phẩm "${item.maHang}" không khớp:\n   ${itemErrors.join("\n   ")}`,
        );
      } else {
        matchedProducts.push({
          maHang: item.maHang,
          soLuongNhap: item.soLuongNhap,
          productId: product.id,
        });
      }
    }

    if (allMatched) {
      await Receipt.updateStatus(receiptId, "approved", createdBy, null);

      for (const item of matchedProducts) {
        await Inventory.updateStock(item.maHang, item.soLuongNhap, "import");
      }

      await EditHistory.log(
        createdBy,
        "receipts",
        receiptId,
        "AUTO_APPROVED",
        null,
        null,
        JSON.stringify(receiptData),
      );

      await Notification.create(
        createdBy,
        `✅ Phiếu nhập ${receipt.receiptNo} đã được tự động xác nhận`,
        `Tất cả ${matchedProducts.length} sản phẩm trong phiếu đều khớp với kho.`,
        "success",
        receiptId,
      );

      res.json({
        success: true,
        data: {
          id: receiptId,
          status: "approved",
          receiptNo: receipt.receiptNo,
        },
        message:
          "✅ Tạo phiếu nhập thành công! Phiếu đã được tự động xác nhận.",
      });
    } else {
      await Receipt.updateStatus(
        receiptId,
        "awaiting_confirmation",
        createdBy,
        null,
      );

      await EditHistory.log(
        createdBy,
        "receipts",
        receiptId,
        "CREATE",
        null,
        null,
        JSON.stringify(receiptData),
      );

      await Notification.create(
        createdBy,
        `⚠️ Phiếu nhập ${receipt.receiptNo} đang chờ xác nhận`,
        `Có ${mismatchDetails.length} sản phẩm không khớp với kho.`,
        "warning",
        receiptId,
      );

      await Notification.createForManagers(
        `📥 Phiếu nhập ${receipt.receiptNo} chờ xác nhận`,
        `Admin vừa tạo phiếu nhập có ${mismatchDetails.length} sản phẩm không khớp với kho.\nVui lòng kiểm tra và xác nhận.`,
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
        message:
          "⚠️ Tạo phiếu nhập thành công! Phiếu đang chờ xác nhận từ Quản lý.",
        details: mismatchDetails,
      });
    }
  } catch (error) {
    console.error("❌ Create receipt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// Cập nhật trạng thái
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
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy danh sách phiếu chờ duyệt
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

// Xóa phiếu
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
    await EditHistory.log(
      userId,
      "receipts",
      id,
      "DELETE",
      null,
      null,
      JSON.stringify(receipt),
    );

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
