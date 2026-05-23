const Inventory = require("../models/Inventory");
const EditHistory = require("../models/EditHistory");

// Lấy tất cả sản phẩm
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
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy danh sách phân loại
const getCategories = async (req, res) => {
  try {
    const categories = await Inventory.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Tạo sản phẩm mới (chỉ admin)
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const createdBy = req.user.userId;

    // Kiểm tra mã hàng đã tồn tại chưa
    const existing = await Inventory.findByMaHang(productData.maHang);
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Mã hàng đã tồn tại" });
    }

    const productId = await Inventory.create(productData, createdBy);

    // Ghi lịch sử
    await EditHistory.log(
      createdBy,
      "inventory",
      productId,
      "CREATE",
      null,
      JSON.stringify(productData),
    );

    res.json({
      success: true,
      data: { id: productId },
      message: "Tạo sản phẩm thành công",
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Cập nhật sản phẩm
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.userId;

    // Lấy sản phẩm cũ để ghi lịch sử
    const oldProduct = await Inventory.findById(id);
    if (!oldProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    await Inventory.update(id, updateData);

    // Ghi lịch sử từng field thay đổi
    for (const [field, newValue] of Object.entries(updateData)) {
      if (oldProduct[field] != newValue) {
        await EditHistory.log(
          userId,
          "inventory",
          id,
          "UPDATE",
          field,
          String(oldProduct[field] || ""),
          String(newValue || ""),
        );
      }
    }

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Xóa sản phẩm
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const oldProduct = await Inventory.findById(id);
    if (!oldProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    await Inventory.delete(id);

    await EditHistory.log(
      userId,
      "inventory",
      id,
      "DELETE",
      null,
      null,
      JSON.stringify(oldProduct),
    );

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy thống kê
const getStats = async (req, res) => {
  try {
    const totalStats = await Inventory.getTotalStats();
    const expiryStats = await Inventory.getExpiryStats();

    res.json({
      success: true,
      data: {
        ...totalStats,
        ...expiryStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getAllInventory,
  getProductByMaHang,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
};
