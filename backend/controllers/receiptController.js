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
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Tạo phiếu nhập mới - TỰ ĐỘNG KIỂM TRA
const createReceipt = async (req, res) => {
  try {
    const receiptData = req.body;
    const createdBy = req.user.userId;

    // 1. Tạo phiếu với status = "pending"
    const receiptId = await Receipt.create(receiptData, createdBy);

    // 2. Lấy phiếu vừa tạo để kiểm tra
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu vừa tạo" });
    }

    // 3. TỰ ĐỘNG KIỂM TRA SẢN PHẨM TRONG KHO
    let allMatched = true;
    let mismatchDetails = [];
    let matchedProducts = [];

    for (const item of receipt.items || []) {
      // Kiểm tra sản phẩm có tồn tại trong kho không
      const product = await Inventory.findByMaHang(item.maHang);

      if (!product) {
        allMatched = false;
        mismatchDetails.push(
          `❌ Sản phẩm "${item.tenThuongMai}" (${item.maHang}) chưa có trong kho`,
        );
        continue;
      }

      // So sánh các trường
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

    // 4. Nếu tất cả khớp → TỰ ĐỘNG DUYỆT
    if (allMatched) {
      // Cập nhật trạng thái thành "approved"
      await Receipt.updateStatus(receiptId, "approved", createdBy, null);

      // Cập nhật tồn kho
      for (const item of matchedProducts) {
        await Inventory.updateStock(item.maHang, item.soLuongNhap, "import");
      }

      // Ghi log
      await EditHistory.log(
        createdBy,
        "receipts",
        receiptId,
        "AUTO_APPROVED",
        null,
        null,
        JSON.stringify(receiptData),
      );

      // Gửi thông báo
      await Notification.create(
        createdBy,
        `✅ Phiếu nhập ${receipt.receiptNo} đã được tự động xác nhận`,
        `Tất cả ${matchedProducts.length} sản phẩm trong phiếu đều khớp với kho, hệ thống tự động duyệt thành công.`,
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
      // Nếu không khớp → VẪN GIỮ "pending"
      await EditHistory.log(
        createdBy,
        "receipts",
        receiptId,
        "CREATE",
        null,
        null,
        JSON.stringify(receiptData),
      );

      // Gửi thông báo lỗi cho user
      await Notification.create(
        createdBy,
        `⚠️ Phiếu nhập ${receipt.receiptNo} đang chờ xử lý`,
        `Có ${mismatchDetails.length} sản phẩm không khớp với kho.\n\nChi tiết:\n${mismatchDetails.join("\n")}`,
        "warning",
        receiptId,
      );

      res.json({
        success: true,
        data: {
          id: receiptId,
          status: "pending",
          receiptNo: receipt.receiptNo,
        },
        message:
          "⚠️ Tạo phiếu nhập thành công! Nhưng có sản phẩm không khớp với kho, vui lòng kiểm tra lại.",
        details: mismatchDetails,
      });
    }
  } catch (error) {
    console.error("Create receipt error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// Cập nhật trạng thái duyệt phiếu nhập (vẫn giữ cho admin nếu cần)
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

    if (receipt) {
      const statusText =
        status === "approved" ? "đã được duyệt" : "đã bị từ chối";
      await Notification.create(
        receipt.createdBy,
        `Phiếu nhập ${receipt.receiptNo} ${statusText}`,
        status === "rejected"
          ? `Lý do: ${rejectedReason}`
          : `Phiếu nhập của bạn đã được duyệt`,
        status === "approved" ? "success" : "warning",
        id,
      );
    }

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
    const receipts = await Receipt.getPendingApprovals();
    res.json({ success: true, data: receipts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Xóa phiếu nhập
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
