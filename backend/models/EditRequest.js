const db = require("../config/database");

const EditRequest = {
  create: async (requesterId, productId, oldData, newData) => {
    const [result] = await db.execute(
      `INSERT INTO edit_requests (requesterId, productId, oldData, newData, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [
        requesterId,
        productId,
        JSON.stringify(oldData),
        JSON.stringify(newData),
      ],
    );
    return result.insertId;
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT er.*, u.fullName as requesterName, a.fullName as approverName,
              p.tenThuongMai as productName, p.maHang as productCode
       FROM edit_requests er
       LEFT JOIN users u ON er.requesterId = u.id
       LEFT JOIN users a ON er.approvedBy = a.id
       LEFT JOIN inventory p ON er.productId = p.id
       WHERE er.id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    row.oldData =
      typeof row.oldData === "string" ? JSON.parse(row.oldData) : row.oldData;
    row.newData =
      typeof row.newData === "string" ? JSON.parse(row.newData) : row.newData;
    return row;
  },

  getAllRequests: async (status = null) => {
    let query = `
      SELECT er.*, u.fullName as requesterName, a.fullName as approverName,
             p.tenThuongMai as productName, p.maHang as productCode
      FROM edit_requests er
      LEFT JOIN users u ON er.requesterId = u.id
      LEFT JOIN users a ON er.approvedBy = a.id
      LEFT JOIN inventory p ON er.productId = p.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE er.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY er.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows.map((row) => ({
      ...row,
      oldData:
        typeof row.oldData === "string" ? JSON.parse(row.oldData) : row.oldData,
      newData:
        typeof row.newData === "string" ? JSON.parse(row.newData) : row.newData,
    }));
  },

  getByRequester: async (requesterId) => {
    const [rows] = await db.execute(
      `SELECT er.*, a.fullName as approverName,
              p.tenThuongMai as productName, p.maHang as productCode
       FROM edit_requests er
       LEFT JOIN users a ON er.approvedBy = a.id
       LEFT JOIN inventory p ON er.productId = p.id
       WHERE er.requesterId = ?
       ORDER BY er.createdAt DESC`,
      [requesterId],
    );
    return rows;
  },

  approve: async (id, approvedBy) => {
    await db.execute(
      `UPDATE edit_requests 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW()
       WHERE id = ?`,
      [approvedBy, id],
    );
    return true;
  },

  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE edit_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM edit_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = EditRequest;
