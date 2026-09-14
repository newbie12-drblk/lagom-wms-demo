// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Kiểm tra user còn active không
    const [rows] = await db.execute(
      "SELECT id, isActive, roleId FROM users WHERE id = ?",
      [decoded.userId],
    );

    if (!rows[0]) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không tồn tại" });
    }

    if (!rows[0].isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản đã bị khóa" });
    }

    // Cập nhật role mới nhất (phòng khi role thay đổi)
    decoded.roleId = rows[0].roleId;
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

module.exports = { verifyToken };
