const db = require("../config/database");

const InvoiceRequest = {
  // ==================== TẠO NHIỀU YÊU CẦU (MỖI ITEM 1 RECORD) ====================
  createMultiple: async (exportId, items, createdBy) => {
    const ids = [];
    for (const item of items) {
      const [result] = await db.execute(
        `INSERT INTO invoice_requests (
          exportId, exportItemId,
          soHoaDonNhap, ngayNhapHD,
          soHoaDonXuat, ngayXuatHD,
          status, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          exportId,
          item.exportItemId,
          item.soHoaDonNhap || "",
          item.ngayNhapHD || null,
          item.soHoaDonXuat || "",
          item.ngayXuatHD || null,
          createdBy,
        ],
      );
      ids.push(result.insertId);
    }
    return ids;
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT ir.*, 
              u.fullName as creatorName, 
              a.fullName as approverName,
              e.exportNo, 
              e.exportDate,
              e.receiverName,
              e.customerName,
              e.total,
              ei.tenThuongMai,
              ei.maHang,
              ei.soLuong,
              ei.donGia,
              ei.thanhTien,
              ei.soLot
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       LEFT JOIN users a ON ir.approvedBy = a.id
       LEFT JOIN exports e ON ir.exportId = e.id
       LEFT JOIN export_items ei ON ir.exportItemId = ei.id
       WHERE ir.id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  getByExportId: async (exportId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests WHERE exportId = ? ORDER BY id ASC`,
      [exportId],
    );
    return rows;
  },

  getByExportItemId: async (exportItemId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests WHERE exportItemId = ?`,
      [exportItemId],
    );
    return rows[0] || null;
  },

  getAll: async (status = null) => {
    let query = `
      SELECT ir.*, 
             u.fullName as creatorName, 
             a.fullName as approverName,
             e.exportNo, 
             e.exportDate,
             e.receiverName,
             e.customerName,
             e.total,
             ei.tenThuongMai,
             ei.maHang,
             ei.soLuong,
             ei.donGia,
             ei.thanhTien
      FROM invoice_requests ir
      LEFT JOIN users u ON ir.createdBy = u.id
      LEFT JOIN users a ON ir.approvedBy = a.id
      LEFT JOIN exports e ON ir.exportId = e.id
      LEFT JOIN export_items ei ON ir.exportItemId = ei.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE ir.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY ir.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows;
  },

  // ==================== LẤY EXPORT CHƯA CÓ HÓA ĐƠN ====================
  getExportsWithoutInvoice: async () => {
    const [rows] = await db.execute(
      `SELECT e.*, u.fullName as creatorName
       FROM exports e
       LEFT JOIN users u ON e.createdBy = u.id
       WHERE e.status = 'approved' 
         AND NOT EXISTS (
           SELECT 1 FROM invoice_requests ir 
           WHERE ir.exportId = e.id 
           AND ir.status IN ('pending', 'approved')
         )
       ORDER BY e.createdAt DESC`,
    );

    const result = [];
    for (const row of rows) {
      const [items] = await db.execute(
        `SELECT * FROM export_items WHERE exportId = ?`,
        [row.id],
      );

      const itemIds = items.map((i) => i.id);
      let itemsWithInvoice = [];
      if (itemIds.length > 0) {
        const placeholders = itemIds.map(() => "?").join(",");
        const [existing] = await db.execute(
          `SELECT exportItemId FROM invoice_requests 
           WHERE exportItemId IN (${placeholders})
           AND status IN ('pending', 'approved')`,
          itemIds,
        );
        itemsWithInvoice = existing.map((e) => e.exportItemId);
      }

      const availableItems = items.filter(
        (it) => !itemsWithInvoice.includes(it.id),
      );

      if (availableItems.length > 0) {
        result.push({ ...row, items: availableItems });
      }
    }

    return result;
  },

  getPending: async () => {
    const [rows] = await db.execute(
      `SELECT ir.*, 
              u.fullName as creatorName, 
              e.exportNo, 
              e.exportDate,
              e.receiverName,
              e.customerName,
              e.total,
              ei.tenThuongMai,
              ei.maHang,
              ei.soLuong,
              ei.donGia,
              ei.thanhTien,
              ei.soLot
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       LEFT JOIN exports e ON ir.exportId = e.id
       LEFT JOIN export_items ei ON ir.exportItemId = ei.id
       WHERE ir.status = 'pending'
       ORDER BY ir.exportId ASC, ir.id ASC`,
    );
    return rows;
  },

  // ==================== DUYỆT HÓA ĐƠN ====================
  // Cập nhật 4 trường HĐ vào ĐÚNG dòng inventory của item đó
  // Ưu tiên: maHang + soLot + ngayXuatHD → maHang + soLot → maHang
  approve: async (id, approvedBy) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [requests] = await conn.execute(
        `SELECT ir.*, 
                ei.maHang, 
                ei.soLot, 
                ei.soLuong, 
                ei.donGia,
                ei.ngayXuatHD as itemNgayXuatHD,
                e.exportDate
         FROM invoice_requests ir
         LEFT JOIN export_items ei ON ir.exportItemId = ei.id
         LEFT JOIN exports e ON ir.exportId = e.id
         WHERE ir.id = ?`,
        [id],
      );
      if (requests.length === 0) throw new Error("Không tìm thấy yêu cầu");
      const req = requests[0];

      await conn.execute(
        `UPDATE invoice_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      const itemNgayXuat =
        req.ngayXuatHD || req.itemNgayXuatHD || req.exportDate;

      let inventoryRows = [];

      // Ưu tiên 1: maHang + soLot + ngayXuatHD
      if (req.maHang && req.soLot && itemNgayXuat) {
        [inventoryRows] = await conn.execute(
          `SELECT * FROM inventory 
           WHERE maHang = ? AND soLot = ? AND ngayXuatHD = ?
             AND status = 'approved'
           ORDER BY id DESC LIMIT 1`,
          [req.maHang, req.soLot, itemNgayXuat],
        );
      }

      // Ưu tiên 2: maHang + soLot
      if (inventoryRows.length === 0 && req.maHang && req.soLot) {
        [inventoryRows] = await conn.execute(
          `SELECT * FROM inventory 
           WHERE maHang = ? AND soLot = ?
             AND status = 'approved'
           ORDER BY id DESC LIMIT 1`,
          [req.maHang, req.soLot],
        );
      }

      // Ưu tiên 3: maHang only
      if (inventoryRows.length === 0 && req.maHang) {
        [inventoryRows] = await conn.execute(
          `SELECT * FROM inventory 
           WHERE maHang = ?
             AND status = 'approved'
           ORDER BY id DESC LIMIT 1`,
          [req.maHang],
        );
      }

      if (inventoryRows.length === 0) {
        throw new Error(
          `Không tìm thấy sản phẩm "${req.maHang}" trong tồn kho`,
        );
      }

      const invItem = inventoryRows[0];

      await conn.execute(
        `UPDATE inventory 
         SET soHoaDonNhap = ?,
             ngayNhapHD = ?,
             soHoaDonXuat = ?,
             ngayXuatHD = ?
         WHERE id = ?`,
        [
          req.soHoaDonNhap || "",
          req.ngayNhapHD || null,
          req.soHoaDonXuat || "",
          req.ngayXuatHD || null,
          invItem.id,
        ],
      );

      console.log(
        `  ✅ Cập nhật 4 trường HĐ vào inventory ID ${invItem.id} (maHang: ${req.maHang})`,
      );

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE invoice_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM invoice_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = InvoiceRequest;
