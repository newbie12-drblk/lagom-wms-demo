const express = require("express");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// ✅ QUAN TRỌNG: /read-all PHẢI đặt TRƯỚC /:id/read
router.get("/", verifyToken, getMyNotifications);
router.put("/read-all", verifyToken, markAllAsRead);
router.put("/:id/read", verifyToken, markAsRead);
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;
