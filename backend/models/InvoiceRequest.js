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

  // ==================== LẤY THEO ID ====================
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
              ei.thanhTien
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

  // ==================== LẤY THEO EXPORT ID ====================
  getByExportId: async (exportId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests WHERE exportId = ? ORDER BY id ASC`,
      [exportId],
    );
    return rows;
  },

  // ==================== LẤY THEO EXPORT ITEM ID ====================
  getByExportItemId: async (exportItemId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests WHERE exportItemId = ?`,
      [exportItemId],
    );
    return rows[0] || null;
  },

  // ==================== LẤY TẤT CẢ ====================
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
  // Chỉ trả về export chưa được tạo yêu cầu hóa đơn cho TẤT CẢ items
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

    // Lấy items cho từng export
    const result = [];
    for (const row of rows) {
      const [items] = await db.execute(
        `SELECT * FROM export_items WHERE exportId = ?`,
        [row.id],
      );
      // Kiểm tra xem có item nào đã có invoice request chưa
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

      // Chỉ lấy những item CHƯA có hóa đơn
      const availableItems = items.filter(
        (it) => !itemsWithInvoice.includes(it.id),
      );

      if (availableItems.length > 0) {
        result.push({ ...row, items: availableItems });
      }
    }

    return result;
  },

  // ==================== LẤY YÊU CẦU CHỜ DUYỆT ====================
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
              ei.thanhTien
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
  approve: async (id, approvedBy) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy yêu cầu
      const [requests] = await conn.execute(
        `SELECT ir.*, ei.maHang, ei.soLot, ei.soLuong, ei.donGia
         FROM invoice_requests ir
         LEFT JOIN export_items ei ON ir.exportItemId = ei.id
         WHERE ir.id = ?`,
        [id],
      );
      if (requests.length === 0) throw new Error("Không tìm thấy yêu cầu");
      const req = requests[0];

      // Cập nhật trạng thái
      await conn.execute(
        `UPDATE invoice_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      // Tìm dòng inventory tương ứng: maHang + soLot + ngayXuatHD
      // Vì mỗi lần xuất là 1 dòng riêng (đã insert khi duyệt phiếu xuất)
      let inventoryRows = [];

      if (req.soLot) {
        [inventoryRows] = await conn.execute(
          `SELECT * FROM inventory 
           WHERE maHang = ? AND soLot = ? AND status = 'approved'
           ORDER BY id DESC LIMIT 1`,
          [req.maHang, req.soLot],
        );
      }

      // Fallback: tìm dòng mới nhất theo maHang
      if (inventoryRows.length === 0) {
        [inventoryRows] = await conn.execute(
          `SELECT * FROM inventory 
           WHERE maHang = ? AND status = 'approved'
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

      // Cập nhật 4 trường HĐ vào đúng dòng inventory
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

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // ==================== TỪ CHỐI HÓA ĐƠN ====================
  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE invoice_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  // ==================== XÓA ====================
  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM invoice_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = InvoiceRequest;
