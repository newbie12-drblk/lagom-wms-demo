const db = require("../config/database");

const EditHistory = {
  // Ghi log chỉnh sửa
  log: async (
    userId,
    tableName,
    recordId,
    action,
    fieldName = null,
    oldValue = null,
    newValue = null,
  ) => {
    await db.execute(
      `INSERT INTO edit_history (userId, tableName, recordId, action, fieldName, oldValue, newValue, editedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, tableName, recordId, action, fieldName, oldValue, newValue],
    );
    return true;
  },

  // Lấy lịch sử theo bảng và record
  getByRecord: async (tableName, recordId) => {
    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName, u.roleId
       FROM edit_history h
       LEFT JOIN users u ON h.userId = u.id
       WHERE h.tableName = ? AND h.recordId = ?
       ORDER BY h.editedAt DESC`,
      [tableName, recordId],
    );
    return rows;
  },

  // Lấy lịch sử theo người dùng
  getByUser: async (userId, limit = 50) => {
    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName
       FROM edit_history h
       LEFT JOIN users u ON h.userId = u.id
       WHERE h.userId = ?
       ORDER BY h.editedAt DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows;
  },

  // Lấy tất cả lịch sử (admin)
  getAll: async (limit = 100) => {
    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName, u.roleId
       FROM edit_history h
       LEFT JOIN users u ON h.userId = u.id
       ORDER BY h.editedAt DESC
       LIMIT ?`,
      [limit],
    );
    return rows;
  },
};

module.exports = EditHistory;
