const db = require("../config/database");

const getHistoryByRecord = async (req, res) => {
  try {
    const { tableName, recordId } = req.params;

    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName, u.roleId
             FROM edit_history h
             LEFT JOIN users u ON h.userId = u.id
             WHERE h.tableName = ? AND h.recordId = ?
             ORDER BY h.editedAt DESC`,
      [tableName, recordId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getHistoryByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName
             FROM edit_history h
             LEFT JOIN users u ON h.userId = u.id
             WHERE h.userId = ?
             ORDER BY h.editedAt DESC
             LIMIT ?`,
      [userId, limit],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const getAllHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const [rows] = await db.execute(
      `SELECT h.*, u.fullName as userName, u.roleId
             FROM edit_history h
             LEFT JOIN users u ON h.userId = u.id
             ORDER BY h.editedAt DESC
             LIMIT ?`,
      [limit],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getHistoryByRecord,
  getHistoryByUser,
  getAllHistory,
};
