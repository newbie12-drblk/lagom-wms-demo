const db = require("../config/database");

const InvoiceRequest = {
  create: async (data, createdBy) => {
    const [last] = await db.execute(
      "SELECT requestNo FROM invoice_requests ORDER BY id DESC LIMIT 1",
    );
    let num = 1;
    if (last.length > 0) {
      const match = last[0].requestNo.match(/\d+$/);
      if (match) num = parseInt(match[0]) + 1;
    }
    const requestNo = `IV-${new Date().getFullYear()}-${String(num).padStart(3, "0")}`;

    const [result] = await db.execute(
      `INSERT INTO invoice_requests 
        (requestNo, type, referenceId, 
         soHoaDonNhap, ngayNhapHD, soHoaDonXuat, ngayXuatHD,
         notes, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        requestNo,
        data.type,
        data.referenceId,
        data.soHoaDonNhap || "",
        data.ngayNhapHD || null,
        data.soHoaDonXuat || "",
        data.ngayXuatHD || null,
        data.notes || "",
        createdBy,
      ],
    );

    return {
      id: result.insertId,
      requestNo,
    };
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT i.*, u.fullName as creatorName, a.fullName as approverName
       FROM invoice_requests i
       LEFT JOIN users u ON i.createdBy = u.id
       LEFT JOIN users a ON i.approvedBy = a.id
       WHERE i.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  getAll: async (status = null) => {
    let query = `
      SELECT i.*, u.fullName as creatorName
      FROM invoice_requests i
      LEFT JOIN users u ON i.createdBy = u.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE i.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY i.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows;
  },

  getPending: async () => {
    const [rows] = await db.execute(
      `SELECT i.*, u.fullName as creatorName
       FROM invoice_requests i
       LEFT JOIN users u ON i.createdBy = u.id
       WHERE i.status = 'pending'
       ORDER BY i.createdAt ASC`,
    );
    return rows;
  },

  approve: async (id, approvedBy) => {
    await db.execute(
      `UPDATE invoice_requests 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW()
       WHERE id = ?`,
      [approvedBy, id],
    );
    return true;
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
