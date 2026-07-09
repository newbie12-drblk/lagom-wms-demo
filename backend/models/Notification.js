const db = require("../config/database");

const Notification = {
  create: async (
    userId,
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    try {
      const [result] = await db.execute(
        `INSERT INTO notifications (userId, title, message, type, relatedId, relatedType)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, title, message, type, relatedId, relatedType],
      );
      return result.insertId;
    } catch (error) {
      console.error("❌ Notification.create error:", error);
      throw error;
    }
  },

  createForManagers: async (
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    try {
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
    } catch (error) {
      console.error("❌ Notification.createForManagers error:", error);
      throw error;
    }
  },

  createForMultiple: async (
    userIds,
    title,
    message,
    type = "info",
    relatedId = null,
    relatedType = null,
  ) => {
    if (!userIds || userIds.length === 0) return;

    try {
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
    } catch (error) {
      console.error("❌ Notification.createForMultiple error:", error);
      throw error;
    }
  },

  getByUser: async (userId, limit = 20) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM notifications 
         WHERE userId = ? 
         ORDER BY createdAt DESC 
         LIMIT ?`,
        [userId, limit],
      );
      return rows;
    } catch (error) {
      console.error("❌ Notification.getByUser error:", error);
      throw error;
    }
  },

  getUnreadCount: async (userId) => {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE userId = ? AND isRead = FALSE`,
        [userId],
      );
      return rows[0]?.count || 0;
    } catch (error) {
      console.error("❌ Notification.getUnreadCount error:", error);
      return 0;
    }
  },

  markAsRead: async (notificationId, userId) => {
    try {
      await db.execute(
        `UPDATE notifications SET isRead = TRUE 
         WHERE id = ? AND userId = ?`,
        [notificationId, userId],
      );
      return true;
    } catch (error) {
      console.error("❌ Notification.markAsRead error:", error);
      throw error;
    }
  },

  markAllAsRead: async (userId) => {
    try {
      await db.execute(
        `UPDATE notifications SET isRead = TRUE WHERE userId = ?`,
        [userId],
      );
      return true;
    } catch (error) {
      console.error("❌ Notification.markAllAsRead error:", error);
      throw error;
    }
  },

  delete: async (id, userId) => {
    try {
      const [result] = await db.execute(
        "DELETE FROM notifications WHERE id = ? AND userId = ?",
        [id, userId],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("❌ Notification.delete error:", error);
      throw error;
    }
  },
};

module.exports = Notification;
