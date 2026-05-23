const db = require("../config/database");

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;

    const [rows] = await db.execute(
      `SELECT * FROM notifications 
             WHERE userId = ? 
             ORDER BY createdAt DESC 
             LIMIT ?`,
      [userId, limit],
    );

    const [unreadResult] = await db.execute(
      `SELECT COUNT(*) as count FROM notifications 
             WHERE userId = ? AND isRead = FALSE`,
      [userId],
    );

    res.json({
      success: true,
      data: rows,
      unreadCount: unreadResult[0].count,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await db.execute(
      `UPDATE notifications SET isRead = TRUE 
             WHERE id = ? AND userId = ?`,
      [id, userId],
    );

    res.json({ success: true, message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.execute(
      `UPDATE notifications SET isRead = TRUE WHERE userId = ?`,
      [userId],
    );

    res.json({ success: true, message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await db.execute("DELETE FROM notifications WHERE id = ? AND userId = ?", [
      id,
      userId,
    ]);

    res.json({ success: true, message: "Xóa thông báo thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
