const db = require("../config/database");

const Inventory = {
  // ==================== LẤY TẤT CẢ SẢN PHẨM ====================
  getAll: async () => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE status = 'approved' ORDER BY stt ASC",
    );
    return rows;
  },

  // ==================== TÌM THEO MÃ HÀNG (1 DÒNG) ====================
  findByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE maHang = ? AND status = 'approved' LIMIT 1",
      [maHang],
    );
    return rows[0] || null;
  },

  // ==================== TÌM THEO MÃ HÀNG (NHIỀU DÒNG) ====================
  findAllByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND status = 'approved'
       ORDER BY ngayNhapHD ASC, id ASC`,
      [maHang],
    );
    return rows;
  },

  // ==================== TÌM THEO MÃ + LÔ + NGÀY NHẬP ====================
  findByMaHangAndLot: async (maHang, soLot, ngayNhapHD) => {
    const [rows] = await db.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND soLot = ? AND ngayNhapHD = ? 
       AND status = 'approved'`,
      [maHang, soLot, ngayNhapHD],
    );
    return rows[0] || null;
  },

  // ==================== TÌM THEO ID ====================
  findById: async (id) => {
    const [rows] = await db.execute("SELECT * FROM inventory WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  },

  // ==================== LẤY SẢN PHẨM CHỜ DUYỆT ====================
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

  // ==================== TẠO SẢN PHẨM (CHỜ DUYỆT) ====================
  create: async (data, createdBy) => {
    const [maxStt] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await db.execute(
      `INSERT INTO inventory 
        (stt, tenThuongMai, maHang, quyCach, quyCachDongGoi, hangSX, dvt, phanLoai,
         giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
         soLot, ngayHetHan,
         soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu, 
         status, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        newStt,
        data.tenThuongMai || "",
        data.maHang || "",
        data.quyCach || "",
        data.quyCachDongGoi || "",
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

  // ==================== TẠO SẢN PHẨM (ĐÃ DUYỆT) ====================
  createApproved: async (data, createdBy, approvedBy) => {
    const [maxStt] = await db.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await db.execute(
      `INSERT INTO inventory 
        (stt, tenThuongMai, maHang, quyCach, quyCachDongGoi, hangSX, dvt, phanLoai,
         giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
         soLot, ngayHetHan,
         soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu, 
         status, createdBy, approvedBy, approvedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
      [
        newStt,
        data.tenThuongMai || "",
        data.maHang || "",
        data.quyCach || "",
        data.quyCachDongGoi || "",
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
        approvedBy,
      ],
    );
    return result.insertId;
  },

  // ==================== DUYỆT SẢN PHẨM ====================
  approve: async (id, approvedBy, tonKho = 0) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW(), tonKho = ?
       WHERE id = ?`,
      [approvedBy, tonKho, id],
    );
    return true;
  },

  // ==================== TỪ CHỐI SẢN PHẨM ====================
  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  // ==================== CẬP NHẬT TỒN KHO ====================
  updateStock: async (id, quantity, type = "import") => {
    const operator = type === "import" ? "+" : "-";
    await db.execute(
      `UPDATE inventory SET tonKho = tonKho ${operator} ? WHERE id = ?`,
      [quantity, id],
    );
    return true;
  },

  // ==================== CẬP NHẬT SẢN PHẨM ====================
  update: async (id, data) => {
    const fields = [];
    const values = [];

    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "quyCachDongGoi",
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
      "status",
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

  // ==================== XÓA SẢN PHẨM ====================
  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM inventory WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  // ==================== THỐNG KÊ ====================
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

  // ==================== LẤY DANH SÁCH PHÂN LOẠI ====================
  getCategories: async () => {
    const [rows] = await db.execute(
      "SELECT DISTINCT phanLoai FROM inventory WHERE status = 'approved' AND phanLoai IS NOT NULL AND phanLoai != '' ORDER BY phanLoai",
    );
    return rows.map((r) => r.phanLoai);
  },
};

module.exports = Inventory;
