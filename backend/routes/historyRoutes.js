const express = require("express");
const {
  getHistoryByRecord,
  getHistoryByUser,
  getAllHistory,
} = require("../controllers/historyController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.get("/record/:tableName/:recordId", verifyToken, getHistoryByRecord);
router.get("/user/:userId", verifyToken, getHistoryByUser);
router.get("/all", verifyToken, checkRole("admin"), getAllHistory);

module.exports = router;
