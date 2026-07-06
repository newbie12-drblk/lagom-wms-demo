const db = require("../config/database");

const Inventory = {
  // Lấy tất cả sản phẩm đã duyệt
  getAll: async () => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE status = 'approved' ORDER BY stt ASC",
    );
    return rows;
  },

  // Lấy sản phẩm theo mã hàng
  findByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE maHang = ? AND status = 'approved'",
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

  // Lấy danh sách chờ duyệt (cho Quản lý)
  getPending: async () => {
    const [rows] = await db.execute(
      `SELECT i.*, u.fullName as creatorName
       FROM inventory i
       LEFT JOIN users u ON i.createdBy = u.id
       WHERE i.status = 'pending'
       ORDER BY i.createdAt ASC`,
    );
    return rows;
  },

  // ADMIN: Tạo sản phẩm mới (chờ duyệt)
  create: async (data, createdBy) => {
    const [maxStt] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await db.execute(
      `INSERT INTO inventory 
        (stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
         giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
         soLot, ngayHetHan,
         soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu, 
         status, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        newStt,
        data.tenThuongMai || "",
        data.maHang || "",
        data.quyCach || "",
        data.hangSX || "",
        data.dvt || "",
        data.phanLoai || "",
        data.giaNhap || 0,
        data.giaXuat || 0,
        data.soLuongNhap || 0,
        data.soLuongXuat || 0,
        data.tonKho || 0,
        data.soLot || "",
        data.ngayHetHan || null,
        data.soHopDongNhap || "",
        data.soHoaDonNhap || "",
        data.soHoaDonXuat || "",
        data.ngayNhapHD || null,
        data.ngayXuatHD || null,
        data.ghiChu || "",
        createdBy,
      ],
    );
    return result.insertId;
  },

  // QUẢN LÝ: Duyệt sản phẩm
  approve: async (id, approvedBy, tonKho = 0) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW(), tonKho = ?
       WHERE id = ?`,
      [approvedBy, tonKho, id],
    );
    return true;
  },

  // QUẢN LÝ: Từ chối sản phẩm
  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  // Cập nhật tồn kho
  updateStock: async (maHang, quantity, type = "import") => {
    const operator = type === "import" ? "+" : "-";
    await db.execute(
      `UPDATE inventory SET tonKho = tonKho ${operator} ? WHERE maHang = ?`,
      [quantity, maHang],
    );
    return true;
  },

  // Cập nhật sản phẩm
  update: async (id, data) => {
    const fields = [];
    const values = [];

    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "hangSX",
      "dvt",
      "phanLoai",
      "giaNhap",
      "giaXuat",
      "soLuongNhap",
      "soLuongXuat",
      "tonKho",
      "soLot",
      "ngayHetHan",
      "soHopDongNhap",
      "soHoaDonNhap",
      "soHoaDonXuat",
      "ngayNhapHD",
      "ngayXuatHD",
      "ghiChu",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return false;

    values.push(id);
    await db.execute(
      `UPDATE inventory SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    return true;
  },

  // Xóa sản phẩm
  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM inventory WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // Thống kê
  getStats: async () => {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as totalItems,
        SUM(tonKho) as totalStock,
        SUM(giaNhap * tonKho) as totalValue
       FROM inventory WHERE status = 'approved'`,
    );
    return rows[0];
  },

  // Lấy danh sách phân loại
  getCategories: async () => {
    const [rows] = await db.execute(
      "SELECT DISTINCT phanLoai FROM inventory WHERE status = 'approved' AND phanLoai IS NOT NULL AND phanLoai != '' ORDER BY phanLoai",
    );
    return rows.map((r) => r.phanLoai);
  },
};

module.exports = Inventory;
