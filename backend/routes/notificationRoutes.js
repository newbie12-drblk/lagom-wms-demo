const express = require("express");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, getMyNotifications);
router.put("/:id/read", verifyToken, markAsRead);
router.put("/read-all", verifyToken, markAllAsRead);
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;
