const db = require("../config/database");

const DeletionRequest = {
  // ==================== TẠO YÊU CẦU XÓA (NHIỀU SẢN PHẨM) ====================
  create: async (requesterId, productId, productData) => {
    const [result] = await db.execute(
      `INSERT INTO deletion_requests (requesterId, productId, productData, status)
       VALUES (?, ?, ?, 'pending')`,
      [requesterId, productId, JSON.stringify(productData)],
    );
    return result.insertId;
  },

  // ==================== TẠO NHIỀU YÊU CẦU XÓA CÙNG LÚC ====================
  createMultiple: async (requesterId, products) => {
    const results = [];
    for (const product of products) {
      const [result] = await db.execute(
        `INSERT INTO deletion_requests (requesterId, productId, productData, status)
         VALUES (?, ?, ?, 'pending')`,
        [requesterId, product.id, JSON.stringify(product)],
      );
      results.push(result.insertId);
    }
    return results;
  },

  // ==================== LẤY YÊU CẦU THEO ID ====================
  findById: async (id) => {
    const [rows] = await db.execute(
      `SELECT dr.*, u.fullName as requesterName, a.fullName as approverName,
              p.tenThuongMai as productName, p.maHang as productCode
       FROM deletion_requests dr
       LEFT JOIN users u ON dr.requesterId = u.id
       LEFT JOIN users a ON dr.approvedBy = a.id
       LEFT JOIN inventory p ON dr.productId = p.id
       WHERE dr.id = ?`,
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

  // ==================== LẤY TẤT CẢ YÊU CẦU ====================
  getAllRequests: async (status = null) => {
    let query = `
      SELECT dr.*, u.fullName as requesterName, a.fullName as approverName,
             p.tenThuongMai as productName, p.maHang as productCode
      FROM deletion_requests dr
      LEFT JOIN users u ON dr.requesterId = u.id
      LEFT JOIN users a ON dr.approvedBy = a.id
      LEFT JOIN inventory p ON dr.productId = p.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE dr.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY dr.createdAt DESC`;
    const [rows] = await db.execute(query, params);
    return rows.map((row) => ({
      ...row,
      productData:
        typeof row.productData === "string"
          ? JSON.parse(row.productData)
          : row.productData,
    }));
  },

  // ==================== LẤY YÊU CẦU CỦA NGƯỜI DÙNG ====================
  getByRequester: async (requesterId) => {
    const [rows] = await db.execute(
      `SELECT dr.*, a.fullName as approverName,
              p.tenThuongMai as productName, p.maHang as productCode
       FROM deletion_requests dr
       LEFT JOIN users a ON dr.approvedBy = a.id
       LEFT JOIN inventory p ON dr.productId = p.id
       WHERE dr.requesterId = ?
       ORDER BY dr.createdAt DESC`,
      [requesterId],
    );
    return rows;
  },

  // ==================== DUYỆT YÊU CẦU XÓA ====================
  approve: async (id, approvedBy) => {
    await db.execute(
      `UPDATE deletion_requests 
       SET status = 'approved', approvedBy = ?, approvedAt = NOW()
       WHERE id = ?`,
      [approvedBy, id],
    );
    return true;
  },

  // ==================== TỪ CHỐI YÊU CẦU XÓA ====================
  reject: async (id, approvedBy, reason) => {
    await db.execute(
      `UPDATE deletion_requests 
       SET status = 'rejected', approvedBy = ?, approvedAt = NOW(), rejectedReason = ?
       WHERE id = ?`,
      [approvedBy, reason, id],
    );
    return true;
  },

  // ==================== XÓA YÊU CẦU ====================
  delete: async (id) => {
    const [result] = await db.execute(
      "DELETE FROM deletion_requests WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = DeletionRequest;
