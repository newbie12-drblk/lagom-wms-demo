/**
 * ==================== AUTH CONTROLLER ====================
 * Xử lý đăng nhập, quản lý user
 * Tác giả: LAGOM
 * Ngày: 2026
 */

const User = require("../models/User");
const jwt = require("jsonwebtoken");

/**
 * ĐĂNG NHẬP
 * - Kiểm tra username/password
 * - Tạo JWT token
 * - Trả về redirectUrl dựa trên role
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập đầy đủ thông tin" });
    }

    const user = await User.findByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản không tồn tại" });
    }

    if (!user.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Tài khoản đã bị khóa" });
    }

    const isValidPassword = await User.verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Mật khẩu không chính xác" });
    }

    await User.updateLastLogin(user.id);

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roleId: user.roleId,
        fullName: user.fullName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    // 🔥 QUAN TRỌNG: Redirect theo role
    let defaultRedirectUrl = "role-panel.html";

    // Admin → thẳng admin.html
    if (user.roleId === "admin") {
      defaultRedirectUrl = "admin.html";
    }
    // Quản lý → role-panel.html (để chọn role)
    else if (user.roleId === "quan_ly") {
      defaultRedirectUrl = "role-panel.html";
    }
    // Nhân viên/Nhập liệu → role-panel.html
    else {
      defaultRedirectUrl = "role-panel.html";
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roleId: user.roleId,
        isActive: user.isActive,
      },
      redirectUrl: defaultRedirectUrl,
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server: " + error.message });
  }
};

/**
 * LẤY THÔNG TIN USER HIỆN TẠI
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * LẤY DANH SÁCH TẤT CẢ USER (CHỈ ADMIN)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * TẠO USER MỚI (CHỈ ADMIN)
 */
const createUser = async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      email,
      roleId,
      isActive,
      customPermissions,
    } = req.body;

    const existing = await User.findByUsername(username);
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Tên đăng nhập đã tồn tại" });
    }

    const userId = await User.create({
      username,
      password,
      fullName,
      email,
      roleId: roleId || "nhan_vien",
      isActive: isActive !== undefined ? isActive : true,
      customPermissions: customPermissions || null,
    });

    res.json({ success: true, userId, message: "Tạo người dùng thành công" });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * CẬP NHẬT USER (CHỈ ADMIN)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.update(id, req.body);
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * XÓA USER (CHỈ ADMIN)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.delete(id);
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  login,
  getCurrentUser,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
