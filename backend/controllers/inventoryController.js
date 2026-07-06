const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const EditHistory = require("../models/EditHistory");

// Lấy tất cả sản phẩm đã duyệt
const getAllInventory = async (req, res) => {
  try {
    const inventory = await Inventory.getAll();
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy sản phẩm theo mã
const getProductByMaHang = async (req, res) => {
  try {
    const { maHang } = req.params;
    const product = await Inventory.findByMaHang(maHang);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy danh sách chờ duyệt (Quản lý)
const getPendingProducts = async (req, res) => {
  try {
    const products = await Inventory.getPending();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Get pending products error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ADMIN: Tạo yêu cầu nhập sản phẩm mới (chờ duyệt)
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const createdBy = req.user.userId;

    // Kiểm tra mã hàng đã tồn tại chưa
    const existing = await Inventory.findByMaHang(productData.maHang);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Mã hàng đã tồn tại trong kho",
      });
    }

    const productId = await Inventory.create(productData, createdBy);

    // Gửi thông báo cho Quản lý
    await Notification.createForManagers(
      "📦 Yêu cầu nhập sản phẩm mới",
      `Admin đã tạo yêu cầu nhập sản phẩm "${productData.tenThuongMai}" (${productData.maHang})`,
      "approval",
      productId,
      "inventory",
    );

    // Ghi lịch sử
    await EditHistory.log(
      createdBy,
      "inventory",
      productId,
      "CREATE_PENDING",
      null,
      null,
      JSON.stringify(productData),
    );

    res.json({
      success: true,
      data: { id: productId, status: "pending" },
      message: "✅ Đã gửi yêu cầu nhập sản phẩm, chờ Quản lý duyệt",
    });
  } catch (error) {
    console.error("Create product error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

// QUẢN LÝ: Duyệt sản phẩm
const approveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { tonKho } = req.body;
    const approvedBy = req.user.userId;

    const product = await Inventory.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    await Inventory.approve(id, approvedBy, tonKho || 0);

    // Gửi thông báo cho Admin
    await Notification.create(
      product.createdBy,
      "✅ Yêu cầu nhập sản phẩm đã được duyệt",
      `Sản phẩm "${product.tenThuongMai}" (${product.maHang}) đã được Quản lý duyệt với số lượng: ${tonKho || 0}`,
      "success",
      id,
      "inventory",
    );

    // Ghi lịch sử
    await EditHistory.log(
      approvedBy,
      "inventory",
      id,
      "APPROVED",
      null,
      null,
      JSON.stringify({ ...product, tonKho }),
    );

    res.json({
      success: true,
      message: `✅ Đã duyệt sản phẩm "${product.tenThuongMai}"`,
    });
  } catch (error) {
    console.error("Approve product error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// QUẢN LÝ: Từ chối sản phẩm
const rejectProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approvedBy = req.user.userId;

    const product = await Inventory.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    await Inventory.reject(id, approvedBy, reason);

    await Notification.create(
      product.createdBy,
      "❌ Yêu cầu nhập sản phẩm bị từ chối",
      `Sản phẩm "${product.tenThuongMai}" (${product.maHang}) đã bị từ chối.\nLý do: ${reason || "Không được chấp thuận"}`,
      "warning",
      id,
      "inventory",
    );

    res.json({
      success: true,
      message: `Đã từ chối sản phẩm "${product.tenThuongMai}"`,
    });
  } catch (error) {
    console.error("Reject product error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Thống kê
const getStats = async (req, res) => {
  try {
    const stats = await Inventory.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getAllInventory,
  getProductByMaHang,
  getPendingProducts,
  createProduct,
  approveProduct,
  rejectProduct,
  getStats,
};
