const db = require("../config/database");

const Inventory = {
  // Lấy tất cả sản phẩm
  getAll: async () => {
    const [rows] = await db.execute("SELECT * FROM inventory ORDER BY stt ASC");
    return rows;
  },

  // Lấy sản phẩm theo mã hàng
  findByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE maHang = ?",
      [maHang],
    );
    return rows[0];
  },

  // Lấy sản phẩm theo ID
  findById: async (id) => {
    const [rows] = await db.execute("SELECT * FROM inventory WHERE id = ?", [
      id,
    ]);
    return rows[0];
  },

  // Lấy tất cả phân loại
  getAllCategories: async () => {
    const [rows] = await db.execute(
      'SELECT DISTINCT phanLoai FROM inventory WHERE phanLoai IS NOT NULL AND phanLoai != ""',
    );
    return rows.map((r) => r.phanLoai);
  },

  // Tạo sản phẩm mới
  create: async (data, createdBy) => {
    // Lấy STT lớn nhất + 1
    const [maxStt] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await db.execute(
      `INSERT INTO inventory 
            (stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai, 
             giaNhap, giaXuat, tonKho, soLuongNhap, soLuongXuat, 
             soLot, ngayHetHan, soHopDongNhap, soHoaDonNhap, 
             soHopDongXuat, soHoaDonXuat, ngayNhapHD, ngayXuatHD, 
             ghiChu, createdBy) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newStt,
        data.tenThuongMai,
        data.maHang,
        data.quyCach,
        data.hangSX,
        data.dvt,
        data.phanLoai,
        data.giaNhap || 0,
        data.giaXuat || 0,
        data.tonKho || 0,
        data.soLuongNhap || 0,
        data.soLuongXuat || 0,
        data.soLot,
        data.ngayHetHan,
        data.soHopDongNhap,
        data.soHoaDonNhap,
        data.soHopDongXuat,
        data.soHoaDonXuat,
        data.ngayNhapHD,
        data.ngayXuatHD,
        data.ghiChu,
        createdBy,
      ],
    );
    return result.insertId;
  },

  // Cập nhật sản phẩm
  update: async (id, data) => {
    const updates = [];
    const values = [];

    const fields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "hangSX",
      "dvt",
      "phanLoai",
      "giaNhap",
      "giaXuat",
      "tonKho",
      "soLuongNhap",
      "soLuongXuat",
      "soLot",
      "ngayHetHan",
      "soHopDongNhap",
      "soHoaDonNhap",
      "soHopDongXuat",
      "soHoaDonXuat",
      "ngayNhapHD",
      "ngayXuatHD",
      "ghiChu",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    await db.execute(
      `UPDATE inventory SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
    return true;
  },

  // Cập nhật số lượng tồn kho
  updateStock: async (maHang, quantityChange, type = "import") => {
    const product = await Inventory.findByMaHang(maHang);
    if (!product) return false;

    let newTonKho = product.tonKho;
    if (type === "import") {
      newTonKho += quantityChange;
    } else if (type === "export") {
      newTonKho -= quantityChange;
    }

    await db.execute("UPDATE inventory SET tonKho = ? WHERE maHang = ?", [
      newTonKho,
      maHang,
    ]);
    return true;
  },

  // Xóa sản phẩm
  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM inventory WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // Lấy tổng số liệu thống kê
  getTotalStats: async () => {
    const [rows] = await db.execute(
      `SELECT 
                COUNT(*) as totalItems,
                SUM(tonKho) as totalStock,
                SUM(giaNhap * tonKho) as totalValue
             FROM inventory`,
    );
    return rows[0];
  },

  // Lấy số lượng sắp hết hạn và quá hạn
  getExpiryStats: async () => {
    const today = new Date().toISOString().split("T")[0];

    const [expiringSoon] = await db.execute(
      `SELECT COUNT(*) as count FROM inventory 
             WHERE ngayHetHan IS NOT NULL 
             AND ngayHetHan BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)`,
      [today, today],
    );

    const [expired] = await db.execute(
      `SELECT COUNT(*) as count FROM inventory 
             WHERE ngayHetHan IS NOT NULL AND ngayHetHan < ?`,
      [today],
    );

    return {
      expiringSoon: expiringSoon[0].count,
      expired: expired[0].count,
    };
  },
};

module.exports = Inventory;
