const express = require("express");
const {
  uploadFile,
  getFilesByRelated,
  deleteFile,
  downloadFile,
} = require("../controllers/fileController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.post("/upload", verifyToken, uploadFile);
router.get("/:relatedType/:relatedId", verifyToken, getFilesByRelated);
router.delete("/:id", verifyToken, deleteFile);
router.get("/download/:id", verifyToken, downloadFile);

module.exports = router;
