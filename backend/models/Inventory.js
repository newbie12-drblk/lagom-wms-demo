const db = require("../config/database");

const Inventory = {
  getAll: async () => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE status = 'approved' ORDER BY stt ASC",
    );
    console.log(`📦 Inventory getAll: ${rows.length} rows`);
    return rows;
  },

  findByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE maHang = ? AND status = 'approved'",
      [maHang],
    );
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.execute("SELECT * FROM inventory WHERE id = ?", [
      id,
    ]);
    return rows[0];
  },

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
        data.quyCachDongGoi || "", // ← TRƯỜNG MỚI
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

  approve: async (id, approvedBy, tonKho = 0) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW(), tonKho = ?
       WHERE id = ?`,
      [approvedBy, tonKho, id],
    );
    return true;
  },

  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE inventory 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  updateStock: async (maHang, quantity, type = "import") => {
    const operator = type === "import" ? "+" : "-";
    await db.execute(
      `UPDATE inventory SET tonKho = tonKho ${operator} ? WHERE maHang = ?`,
      [quantity, maHang],
    );
    return true;
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];

    const allowedFields = [
      "tenThuongMai",
      "maHang",
      "quyCach",
      "quyCachDongGoi", // ← TRƯỜNG MỚI
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

  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM inventory WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

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

  getCategories: async () => {
    const [rows] = await db.execute(
      "SELECT DISTINCT phanLoai FROM inventory WHERE status = 'approved' AND phanLoai IS NOT NULL AND phanLoai != '' ORDER BY phanLoai",
    );
    return rows.map((r) => r.phanLoai);
  },
};

module.exports = Inventory;
