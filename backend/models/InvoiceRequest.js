const db = require("../config/database");

const InvoiceRequest = {
  // ==================== TẠO YÊU CẦU NHẬP HÓA ĐƠN ====================
  create: async (exportId, invoiceData, createdBy) => {
    const [result] = await db.execute(
      `INSERT INTO invoice_requests (
        exportId, 
        soHoaDonNhap, 
        ngayNhapHD, 
        soHoaDonXuat, 
        ngayXuatHD, 
        status, 
        createdBy
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [
        exportId,
        invoiceData.soHoaDonNhap || "",
        invoiceData.ngayNhapHD || null,
        invoiceData.soHoaDonXuat || "",
        invoiceData.ngayXuatHD || null,
        createdBy,
      ],
    );
    return result.insertId;
  },

  // ==================== LẤY YÊU CẦU THEO ID ====================
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
              e.createdBy as exportCreatedBy
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       LEFT JOIN users a ON ir.approvedBy = a.id
       LEFT JOIN exports e ON ir.exportId = e.id
       WHERE ir.id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  // ==================== LẤY TẤT CẢ YÊU CẦU ====================
  getAll: async (status = null) => {
    let query = `
      SELECT ir.*, 
             u.fullName as creatorName, 
             a.fullName as approverName,
             e.exportNo, 
             e.exportDate,
             e.receiverName,
             e.customerName,
             e.total
      FROM invoice_requests ir
      LEFT JOIN users u ON ir.createdBy = u.id
      LEFT JOIN users a ON ir.approvedBy = a.id
      LEFT JOIN exports e ON ir.exportId = e.id
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

  // ==================== LẤY YÊU CẦU THEO EXPORT ID ====================
  getByExportId: async (exportId) => {
    const [rows] = await db.execute(
      `SELECT * FROM invoice_requests WHERE exportId = ? ORDER BY createdAt DESC`,
      [exportId],
    );
    return rows;
  },

  // ==================== LẤY DANH SÁCH EXPORT CHƯA CÓ HÓA ĐƠN ====================
  getExportsWithoutInvoice: async () => {
    const [rows] = await db.execute(
      `SELECT e.*, u.fullName as creatorName
       FROM exports e
       LEFT JOIN users u ON e.createdBy = u.id
       WHERE e.status = 'approved' 
         AND e.hasInvoice = FALSE
         AND NOT EXISTS (
           SELECT 1 FROM invoice_requests ir 
           WHERE ir.exportId = e.id 
           AND ir.status IN ('pending', 'approved')
         )
       ORDER BY e.createdAt DESC`,
    );
    return rows;
  },

  // ==================== DUYỆT HÓA ĐƠN ====================
  approve: async (id, approvedBy) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Lấy thông tin yêu cầu
      const [requests] = await conn.execute(
        `SELECT * FROM invoice_requests WHERE id = ?`,
        [id],
      );
      if (requests.length === 0) throw new Error("Không tìm thấy yêu cầu");
      const request = requests[0];

      // Cập nhật trạng thái yêu cầu
      await conn.execute(
        `UPDATE invoice_requests 
         SET status = 'approved', approvedBy = ?, approvedAt = NOW()
         WHERE id = ?`,
        [approvedBy, id],
      );

      // Lấy danh sách items từ export
      const [exportItems] = await conn.execute(
        `SELECT * FROM export_items WHERE exportId = ?`,
        [request.exportId],
      );

      // Lấy thông tin export
      const [exports] = await conn.execute(
        `SELECT * FROM exports WHERE id = ?`,
        [request.exportId],
      );
      const exportData = exports[0];

      if (exportItems.length === 0) {
        throw new Error("Không tìm thấy sản phẩm trong phiếu xuất");
      }

      // Lưu từng item vào inventory
      for (const item of exportItems) {
        // Tìm max stt
        const [maxSttResult] = await conn.execute(
          "SELECT MAX(stt) as maxStt FROM inventory",
        );
        const newStt = (maxSttResult[0]?.maxStt || 0) + 1;

        // ✅ ĐÃ XÓA CỘT quyCachDongGoi
        await conn.execute(
          `INSERT INTO inventory (
            stt, 
            tenThuongMai, 
            maHang, 
            quyCach, 
            hangSX, 
            dvt, 
            phanLoai,
            giaNhap, 
            giaXuat, 
            soLuongNhap, 
            soLuongXuat, 
            tonKho,
            soLot, 
            ngayHetHan,
            soHopDongNhap,
            soHopDongXuat,
            soHoaDonNhap,
            ngayNhapHD,
            soHoaDonXuat,
            ngayXuatHD,
            status, 
            createdBy, 
            approvedBy, 
            approvedAt,
            ghiChu
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, NOW(), ?)`,
          [
            newStt,
            item.tenThuongMai || "",
            item.maHang || "",
            item.quyCach || "",
            item.hangSX || "",
            item.dvt || "",
            item.phanLoai || "",
            item.donGia || 0,
            item.donGia || 0,
            0,
            item.soLuong || 0,
            0 - (item.soLuong || 0),
            item.soLot || "",
            item.ngayHetHan || null,
            "",
            item.soHopDongXuat || "",
            request.soHoaDonNhap || "",
            request.ngayNhapHD || null,
            request.soHoaDonXuat || "",
            request.ngayXuatHD || null,
            exportData.createdBy,
            approvedBy,
            item.ghiChu || "",
          ],
        );
      }

      // Cập nhật hasInvoice cho export
      await conn.execute(`UPDATE exports SET hasInvoice = TRUE WHERE id = ?`, [
        request.exportId,
      ]);

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

  // ==================== XÓA YÊU CẦU ====================
  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM invoice_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
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
              e.total
       FROM invoice_requests ir
       LEFT JOIN users u ON ir.createdBy = u.id
       LEFT JOIN exports e ON ir.exportId = e.id
       WHERE ir.status = 'pending'
       ORDER BY ir.createdAt ASC`,
    );
    return rows;
  },
};

module.exports = InvoiceRequest;
