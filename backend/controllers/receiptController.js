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

// Tạo phiếu nhập mới
const createReceipt = async (req, res) => {
  try {
    const receiptData = req.body;
    const createdBy = req.user.userId;

    const receiptId = await Receipt.create(receiptData, createdBy);

    // Ghi lịch sử
    await EditHistory.log(
      createdBy,
      "receipts",
      receiptId,
      "CREATE",
      null,
      null,
      JSON.stringify(receiptData),
    );

    // Thông báo cho admin (nếu cần duyệt)
    // TODO: Lấy danh sách admin và gửi thông báo

    res.json({
      success: true,
      data: { id: receiptId },
      message: "Tạo phiếu nhập thành công",
    });
  } catch (error) {
    console.error("Create receipt error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Cập nhật trạng thái duyệt phiếu nhập
const updateReceiptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectedReason } = req.body;
    const approvedBy = req.user.userId;

    await Receipt.updateStatus(id, status, approvedBy, rejectedReason);

    // Lấy phiếu để gửi thông báo cho người tạo
    const receipt = await Receipt.findById(id);
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
