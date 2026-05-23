const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/database");

// Cấu hình multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file PDF, JPEG, PNG"), false);
    }
  },
});

// Upload file
const uploadFile = async (req, res) => {
  try {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng chọn file" });
      }

      const { relatedType, relatedId } = req.body;
      const uploadedBy = req.user.userId;

      const [result] = await db.execute(
        `INSERT INTO files (relatedType, relatedId, fileName, filePath, fileSize, mimeType, uploadedBy)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          relatedType,
          relatedId,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          uploadedBy,
        ],
      );

      res.json({
        success: true,
        data: { id: result.insertId, filePath: req.file.path },
        message: "Upload file thành công",
      });
    });
  } catch (error) {
    console.error("Upload file error:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Lấy danh sách file
const getFilesByRelated = async (req, res) => {
  try {
    const { relatedType, relatedId } = req.params;

    const [rows] = await db.execute(
      `SELECT f.*, u.fullName as uploadedByName
             FROM files f
             LEFT JOIN users u ON f.uploadedBy = u.id
             WHERE f.relatedType = ? AND f.relatedId = ?
             ORDER BY f.uploadedAt DESC`,
      [relatedType, relatedId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Xóa file
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const [files] = await db.execute("SELECT * FROM files WHERE id = ?", [id]);

    if (files.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy file" });
    }

    const file = files[0];

    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await db.execute("DELETE FROM files WHERE id = ?", [id]);

    res.json({ success: true, message: "Xóa file thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Tải file
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    const [files] = await db.execute("SELECT * FROM files WHERE id = ?", [id]);

    if (files.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy file" });
    }

    const file = files[0];
    res.download(file.filePath, file.fileName);
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  uploadFile,
  getFilesByRelated,
  deleteFile,
  downloadFile,
};
