const db = require("../config/database");

const InvoiceRequest = {
  // ==================== SINH MÃ HÓA ĐƠN TỰ ĐỘNG ====================
  generateCode: async () => {
    const year = new Date().getFullYear();
    const [rows] = await db.execute(
      `SELECT soHoaDonCode FROM invoice_requests 
       WHERE soHoaDonCode LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`HD-${year}-%`],
    );

    let newNumber = 1;
    if (rows.length > 0) {
      const match = rows[0].soHoaDonCode.match(/(\d+)$/);
      if (match) newNumber = parseInt(match[1]) + 1;
    }

    return `HD-${year}-${String(newNumber).padStart(3, "0")}`;
  },

  // ==================== TÌM SẢN PHẨM TRONG INVENTORY ====================
  // key = 'maHang' hoặc 'soHopDongNhap'
  searchInventory: async (key, value) => {
    if (!value || value.trim() === "") {
      return [];
    }

    let query = `
      SELECT id, stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai,
             giaNhap, soLuongNhap, soLuongXuat, tonKho,
             soLot, ngayHetHan,
             soHopDongNhap, soHoaDonNhap, soHoaDonXuat,
             ngayNhapHD, ngayXuatHD, ghiChu
      FROM inventory
      WHERE status = 'approved'
    `;
    const params = [];

    if (key === "maHang") {
      query += ` AND maHang LIKE ?`;
      params.push(`%${value.trim()}%`);
    } else if (key === "soHopDongNhap") {
      query += ` AND soHopDongNhap LIKE ?`;
      params.push(`%${value.trim()}%`);
    } else {
      return [];
    }

    query += ` ORDER BY maHang ASC, soLot ASC, id ASC LIMIT 50`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  // ==================== TẠO YÊU CẦU HÓA ĐƠN ====================
  create: async (data, createdBy) => {
    const code = await InvoiceRequest.generateCode();

    const [result] = await db.execute(
      `INSERT INTO invoice_requests (
        soHoaDonCode, inventoryId,
        maHang, soHopDongNhap, soLot, tenThuongMai, soLuong,
        soHoaDonNhap, ngayNhapHD, soHoaDonXuat, ngayXuatHD,
        status, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        code,
        data.inventoryId,
        data.maHang || "",
        data.soHopDongNhap || "",
        data.soLot || "",
        data.tenThuongMai || "",
        data.soLuong || 0,
        data.soHoaDonNhap || "",
        data.ngayNhapHD || null,
        data.soHoaDonXuat || "",
        data.ngayXuatHD || null,
        createdBy,
      ],
    );

    return { id: result.insertId, soHoaDonCode: code };
  },

  // ==================== LẤY THEO ID ====================
  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT ir.*, 
              u.fullName as creatorName, 
              a.fullName as approverName
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       LEFT JOIN users a ON ir.approvedBy = a.id
       WHERE ir.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  // ==================== LẤY TẤT CẢ ====================
  getAll: async (status = null) => {
    let query = `
      SELECT ir.*, 
             u.fullName as creatorName, 
             a.fullName as approverName
      FROM invoice_requests ir
      LEFT JOIN users u ON ir.createdBy = u.id
      LEFT JOIN users a ON ir.approvedBy = a.id
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

  // ==================== LẤY CHỜ DUYỆT ====================
  getPending: async () => {
    const [rows] = await db.execute(
      `SELECT ir.*, u.fullName as creatorName
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       WHERE ir.status = 'pending'
       ORDER BY ir.createdAt ASC`,
    );
    return rows;
  },

  // ==================== KIỂM TRA ĐÃ CÓ YÊU CẦU CHƯA ====================
  getByInventoryId: async (inventoryId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests 
       WHERE inventoryId = ? AND status IN ('pending', 'approved')
       ORDER BY id DESC`,
      [inventoryId],
    );
    return rows;
  },

  // ==================== DUYỆT HÓA ĐƠN ====================
  // Cập nhật 4 trường HĐ vào ĐÚNG dòng inventory theo inventoryId
  approve: async (id, approvedBy) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [requests] = await conn.execute(
        `SELECT * FROM invoice_requests WHERE id = ?`,
        [id],
      );
      if (requests.length === 0) throw new Error("Không tìm thấy yêu cầu");
      const req = requests[0];

      // Cập nhật status
      await conn.execute(
        `UPDATE invoice_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      // Kiểm tra dòng inventory còn tồn tại không
      const [inventoryRows] = await conn.execute(
        `SELECT * FROM inventory WHERE id = ? AND status = 'approved'`,
        [req.inventoryId],
      );

      if (inventoryRows.length === 0) {
        throw new Error(
          `Không tìm thấy sản phẩm "${req.maHang}" trong tồn kho (có thể đã bị xóa)`,
        );
      }

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
          req.inventoryId,
        ],
      );

      console.log(
        `  ✅ Duyệt HĐ ${req.soHoaDonCode} → cập nhật 4 trường vào inventory ID ${req.inventoryId}`,
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

  // ==================== TỪ CHỐI ====================
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
