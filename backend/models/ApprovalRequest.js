const db = require("../config/database");

const ApprovalRequest = {
  create: async (requesterId, productData) => {
    const [result] = await db.execute(
      `INSERT INTO approval_requests (requesterId, productData, status)
             VALUES (?, ?, 'pending')`,
      [requesterId, JSON.stringify(productData)],
    );
    return result.insertId;
  },

  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT ar.*, u.fullName as requesterName
             FROM approval_requests ar
             LEFT JOIN users u ON ar.requesterId = u.id
             WHERE ar.id = ?`,
      [id],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    row.productData =
      typeof row.productData === "string"
        ? JSON.parse(row.productData)
        : row.productData;
    return row;
  },

  getAllRequests: async (status = null) => {
    let query = `
            SELECT ar.*, u.fullName as requesterName, a.fullName as approverName
            FROM approval_requests ar
            LEFT JOIN users u ON ar.requesterId = u.id
            LEFT JOIN users a ON ar.approvedBy = a.id
        `;
    const params = [];
    if (status) {
      query += ` WHERE ar.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY ar.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows.map((row) => ({
      ...row,
      productData:
        typeof row.productData === "string"
          ? JSON.parse(row.productData)
          : row.productData,
    }));
  },

  getByRequester: async (requesterId) => {
    const [rows] = await db.execute(
      `SELECT ar.*, a.fullName as approverName
             FROM approval_requests ar
             LEFT JOIN users a ON ar.approvedBy = a.id
             WHERE ar.requesterId = ?
             ORDER BY ar.createdAt DESC`,
      [requesterId],
    );
    return rows.map((row) => ({
      ...row,
      productData:
        typeof row.productData === "string"
          ? JSON.parse(row.productData)
          : row.productData,
    }));
  },

  approve: async (id, approvedBy) => {
    await db.execute(
      `UPDATE approval_requests 
             SET status = 'approved', approvedBy = ?, approvedAt = NOW()
             WHERE id = ?`,
      [approvedBy, id],
    );
    return true;
  },

  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE approval_requests 
             SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
             WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM approval_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = ApprovalRequest;
