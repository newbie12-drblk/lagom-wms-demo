const express = require("express");
const {
  getAllExports,
  getExportById,
  createExport,
  updateExportStatus,
  getPendingExports,
  deleteExport,
} = require("../controllers/exportController");
const { verifyToken } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

const router = express.Router();

router.get("/", verifyToken, getAllExports);
router.get(
  "/pending",
  verifyToken,
  checkRole("admin", "ke_toan", "quan_ly"),
  getPendingExports,
);
router.get("/:id", verifyToken, getExportById);
router.post(
  "/",
  verifyToken,
  checkRole("admin", "quan_ly_kho", "quan_ly", "nhap_lieu"),
  createExport,
);
router.put(
  "/:id/status",
  verifyToken,
  checkRole("admin", "ke_toan", "quan_ly"),
  updateExportStatus,
);
router.delete("/:id", verifyToken, checkRole("admin"), deleteExport);

module.exports = router;
