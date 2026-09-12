const db = require("../config/database");

const Inventory = {
  getAll: async () => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE status = 'approved' ORDER BY stt ASC, id ASC",
    );
    return rows;
  },

  findByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      "SELECT * FROM inventory WHERE maHang = ? AND status = 'approved' LIMIT 1",
      [maHang],
    );
    return rows[0] || null;
  },

  findAllByMaHang: async (maHang) => {
    const [rows] = await db.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND status = 'approved'
       ORDER BY ngayNhapHD ASC, id ASC`,
      [maHang],
    );
    return rows;
  },

  findByMaHangAndLot: async (maHang, soLot, ngayNhapHD) => {
    const [rows] = await db.execute(
      `SELECT * FROM inventory 
       WHERE maHang = ? AND soLot = ? AND ngayNhapHD = ? 
       AND status = 'approved'`,
      [maHang, soLot, ngayNhapHD],
    );
    return rows[0] || null;
  },

  findById: async (id) => {
    const [rows] = await db.execute("SELECT * FROM inventory WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
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

  // Tạo dòng inventory từ item của phiếu nhập (khi duyệt)
  createFromReceiptItem: async (item, receipt, approvedBy, conn) => {
    const [maxStt] = await conn.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await conn.execute(
      `INSERT INTO inventory 
        (stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
         giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
         soLot, ngayHetHan,
         soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu,
         status, createdBy, approvedBy, approvedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
      [
        newStt,
        item.tenThuongMai || "",
        item.maHang || "",
        item.quyCach || "",
        item.hangSX || "",
        item.dvt || "",
        item.phanLoai || "",
        item.giaNhap || 0,
        0,
        item.soLuongNhap || 0,
        0,
        item.soLuongNhap || 0,
        item.soLot || "",
        item.ngayHetHan || null,
        item.soHopDongNhap || "",
        item.soHoaDonNhap || "",
        "", // soHoaDonXuat - để trống, sẽ cập nhật sau khi có hóa đơn
        item.ngayNhapHD || null,
        null, // ngayXuatHD
        item.ghiChu || "",
        receipt.createdBy,
        approvedBy,
      ],
    );
    return result.insertId;
  },

  // Tạo dòng inventory từ item của phiếu xuất (khi duyệt) - TÁCH RIÊNG
  createFromExportItem: async (item, exportData, approvedBy, conn) => {
    const [maxStt] = await conn.execute(
      "SELECT MAX(stt) as maxStt FROM inventory",
    );
    const newStt = (maxStt[0].maxStt || 0) + 1;

    const [result] = await conn.execute(
      `INSERT INTO inventory 
        (stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
         giaNhap, giaXuat, soLuongNhap, soLuongXuat, tonKho,
         soLot, ngayHetHan,
         soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
         ngayNhapHD, ngayXuatHD, ghiChu,
         status, createdBy, approvedBy, approvedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW())`,
      [
        newStt,
        item.tenThuongMai || "",
        item.maHang || "",
        item.quyCach || "",
        item.hangSX || "",
        item.dvt || "",
        item.phanLoai || "",
        0,
        item.donGia || 0,
        0,
        item.soLuong || 0,
        -(item.soLuong || 0), // ÂM = xuất kho
        item.soLot || "",
        item.ngayHetHan || null,
        "",
        "", // soHoaDonNhap - để trống, cập nhật sau
        "", // soHoaDonXuat - để trống, cập nhật sau
        null, // ngayNhapHD
        item.ngayXuatHD || exportData.exportDate, // Ngày xuất = ngày xuất HĐ hoặc ngày phiếu
        item.ghiChu || "",
        exportData.createdBy,
        approvedBy,
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

  updateStock: async (id, quantity, type = "import") => {
    const operator = type === "import" ? "+" : "-";
    await db.execute(
      `UPDATE inventory SET tonKho = tonKho ${operator} ? WHERE id = ?`,
      [quantity, id],
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
