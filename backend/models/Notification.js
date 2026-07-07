const db = require("../config/database");

const Notification = {
  // Tạo thông báo cho 1 user
  create: async (
    userId,
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    const [result] = await db.execute(
      `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message, type, relatedId, relatedType],
    );
    return result.insertId;
  },

  // 🔥 QUAN TRỌNG: Tạo thông báo cho Quản lý
  createForManagers: async (
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    // Lấy tất cả user có roleId = 'quan_ly'
    const [rows] = await db.execute(
      "SELECT id FROM users WHERE roleId = 'quan_ly' AND isActive = TRUE",
    );

    console.log("📨 Tìm thấy Quản lý:", rows.length);

    if (rows.length === 0) {
      console.log("⚠️ Không có Quản lý nào để gửi thông báo!");
      return;
    }

    const values = rows.map((row) => [
      row.id,
      title,
      message,
      type,
      relatedId,
      relatedType,
    ]);

    await db.query(
      `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType) VALUES ?`,
      [values],
    );
  },

  // Tạo thông báo cho nhiều user
  createForMultiple: async (
    userIds,
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    if (!userIds || userIds.length === 0) return;

    const values = userIds.map((userId) => [
      userId,
      title,
      message,
      type,
      relatedId,
      relatedType,
    ]);

    await db.query(
      `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType) VALUES ?`,
      [values],
    );
  },

  // Lấy thông báo của user
  getByUser: async (userId, limit = 20) => {
    const [rows] = await db.execute(
      `SELECT * FROM notifications 
       WHERE userId = ? 
       ORDER BY createdAt DESC 
       LIMIT ?`,
      [userId, limit],
    );
    return rows;
  },

  // Lấy số lượng thông báo chưa đọc
  getUnreadCount: async (userId) => {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE userId = ? AND isRead = FALSE`,
      [userId],
    );
    return rows[0].count;
  },

  // Đánh dấu đã đọc
  markAsRead: async (notificationId, userId) => {
    await db.execute(
      `UPDATE notifications SET isRead = TRUE 
       WHERE id = ? AND userId = ?`,
      [notificationId, userId],
    );
    return true;
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: async (userId) => {
    await db.execute(
      `UPDATE notifications SET isRead = TRUE WHERE userId = ?`,
      [userId],
    );
    return true;
  },

  // Xóa thông báo
  delete: async (id, userId) => {
    const [result] = await db.execute(
      "DELETE FROM notifications WHERE id = ? AND userId = ?",
      [id, userId],
    );
    return result.affectedRows > 0;
  },
};

module.exports = Notification;
