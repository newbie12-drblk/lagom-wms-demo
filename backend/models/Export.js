const db = require("../config/database");

const Export = {
  // Lấy tất cả phiếu xuất
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT e.*, u.fullName as creatorName 
       FROM exports e 
       LEFT JOIN users u ON e.createdBy = u.id 
       ORDER BY e.createdAt DESC`,
    );
    return rows;
  },

  // Lấy phiếu xuất theo ID kèm items
  findById: async (id) => {
    const [exports] = await db.execute(
      `SELECT e.*, u.fullName as creatorName, a.fullName as approverName
       FROM exports e 
       LEFT JOIN users u ON e.createdBy = u.id 
       LEFT JOIN users a ON e.approvedBy = a.id 
       WHERE e.id = ?`,
      [id],
    );

    if (exports.length === 0) return null;

    const exportItem = exports[0];
    const [items] = await db.execute(
      "SELECT * FROM export_items WHERE exportId = ?",
      [id],
    );

    return { ...exportItem, items };
  },

  // Tạo phiếu xuất mới
  create: async (data, createdBy) => {
    // Tạo số phiếu tự động
    const [lastExport] = await db.execute(
      "SELECT exportNo FROM exports ORDER BY id DESC LIMIT 1",
    );
    let newNumber = 1;
    if (lastExport.length > 0) {
      const match = lastExport[0].exportNo.match(/\d+$/);
      if (match) newNumber = parseInt(match[0]) + 1;
    }
    const exportNo = `PX-${new Date().getFullYear()}-${String(newNumber).padStart(3, "0")}`;

    // ÉP KIỂU total THÀNH NUMBER
    const total = parseFloat(data.total) || 0;

    const [result] = await db.execute(
      `INSERT INTO exports 
        (exportNo, exportDate, receiverName, customerName, customerAddress, 
         customerTax, customerContract, exportReason, total, status, createdBy) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exportNo,
        data.exportDate || new Date().toISOString().split("T")[0],
        data.receiverName || "",
        data.customerName || "",
        data.customerAddress || "",
        data.customerTax || "",
        data.customerContract || "",
        data.exportReason || "Sử dụng nội bộ",
        total,
        "pending",
        createdBy,
      ],
    );
    const exportId = result.insertId;

    // Thêm items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await db.execute(
          `INSERT INTO export_items 
            (exportId, tenThuongMai, maHang, quyCach, hangSX, dvt, 
             phanLoai, donGia, soLuong, thanhTien, soLot, ngayHetHan, ghiChu) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            exportId,
            item.tenThuongMai || "",
            item.maHang || "",
            item.quyCach || "",
            item.hangSX || "",
            item.dvt || "",
            item.phanLoai || "",
            item.donGia || 0,
            item.soLuong || 0,
            item.thanhTien || 0,
            item.soLot || "",
            item.ngayHetHan || null,
            item.ghiChu || "",
          ],
        );
      }
    }

    return exportId;
  },

  // Cập nhật trạng thái duyệt
  updateStatus: async (id, status, approvedBy, rejectedReason = null) => {
    await db.execute(
      `UPDATE exports 
       SET status = ?, approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [status, approvedBy, rejectedReason, id],
    );
    return true;
  },

  // Lấy danh sách phiếu chờ duyệt
  getPendingApprovals: async () => {
    const [rows] = await db.execute(
      `SELECT e.*, u.fullName as creatorName 
       FROM exports e 
       LEFT JOIN users u ON e.createdBy = u.id 
       WHERE e.status = 'pending'
       ORDER BY e.createdAt ASC`,
    );
    return rows;
  },

  // Xóa phiếu xuất
  delete: async (id) => {
    const [result] = await db.execute("DELETE FROM exports WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Export;
