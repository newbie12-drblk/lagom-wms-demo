/**
 * ==================== AUTH MODULE ====================
 * Quản lý xác thực, session, phân quyền
 * Tác giả: LAGOM
 * Ngày: 2026
 *
 * CẬP NHẬT: Admin có thể truy cập tất cả các trang
 */

(function () {
  "use strict";

  // ========== CONSTANTS ==========
  const STORAGE_KEYS = {
    SESSION: "lagom_session",
    TOKEN: "lagom_token",
  };

  const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 giờ

  // Danh sách role cố định
  const FIXED_ROLES = [
    { id: "admin", name: "Quản trị", priority: 5 },
    { id: "ke_toan", name: "Kế toán", priority: 4 },
    { id: "quan_ly_kho", name: "Quản lý kho", priority: 4 },
    { id: "quan_ly", name: "Quản lý", priority: 3 },
    { id: "nhan_vien", name: "Nhân viên", priority: 2 },
    { id: "nhap_lieu", name: "Nhập liệu", priority: 2 },
  ];

  // ========== HELPER FUNCTIONS ==========

  /**
   * Lấy thông tin role theo ID
   */
  function getRoleById(roleId) {
    return FIXED_ROLES.find((r) => r.id === roleId) || null;
  }

  /**
   * Lấy danh sách tất cả role
   */
  function getAllRoles() {
    return [...FIXED_ROLES];
  }

  /**
   * Kiểm tra xem user có phải admin không
   */
  function isAdmin() {
    const session = getCurrentSession();
    return session && session.roleId === "admin";
  }

  // ========== SESSION MANAGEMENT ==========

  /**
   * ĐĂNG NHẬP
   * Gọi API login, lưu token và session
   */
  async function login(username, password) {
    try {
      const result = await window.API.auth.login(username, password);

      if (result.success) {
        // Lưu session vào localStorage
        const session = {
          userId: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          email: result.user.email,
          roleId: result.user.roleId,
          roleName: getRoleById(result.user.roleId)?.name || "Unknown",
          loginAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

        return {
          success: true,
          redirectUrl: result.redirectUrl,
          user: session,
        };
      }
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: error.message || "Lỗi kết nối server" };
    }
  }

  /**
   * ĐĂNG XUẤT
   * Xóa token và session
   */
  function logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    if (window.API && window.API.auth) {
      window.API.auth.logout();
    }
    return { success: true };
  }

  /**
   * Lấy session hiện tại (đã kiểm tra hết hạn)
   */
  function getCurrentSession() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!session) return null;

    const sessionData = JSON.parse(session);

    // Kiểm tra hết hạn
    if (new Date(sessionData.expiresAt) < new Date()) {
      logout();
      return null;
    }
    return sessionData;
  }

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  function isLoggedIn() {
    const session = getCurrentSession();
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return session !== null && !!token;
  }

  /**
   * Lấy thông tin user hiện tại
   */
  function getCurrentUser() {
    const session = getCurrentSession();
    if (!session) return null;

    return {
      id: session.userId,
      username: session.username,
      fullName: session.fullName,
      email: session.email,
      roleName: session.roleName,
      roleId: session.roleId,
    };
  }

  /**
   * Lấy role hiện tại
   */
  function getCurrentRole() {
    return getCurrentSession()?.roleId || null;
  }

  // ========== PERMISSION CHECKS ==========

  /**
   * KIỂM TRA QUYỀN CHỈNH SỬA FIELD
   * Admin có toàn quyền
   */
  function canEditField(fieldName) {
    if (isAdmin()) return true; // Admin được sửa tất cả
    const role = getCurrentRole();
    if (role === "nhap_lieu") return true;
    // Các role khác sẽ check từ permissions sau
    return false;
  }

  /**
   * KIỂM TRA QUYỀN THÊM DÒNG
   */
  function canAddRow() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role !== "nhan_vien";
  }

  /**
   * KIỂM TRA QUYỀN XÓA DÒNG
   */
  function canDeleteRow() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role !== "nhan_vien";
  }

  /**
   * KIỂM TRA QUYỀN LƯU
   */
  function canSave() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role !== "nhan_vien";
  }

  /**
   * KIỂM TRA QUYỀN XUẤT FILE
   */
  function canExport() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role !== "nhan_vien";
  }

  /**
   * KIỂM TRA QUYỀN QUẢN LÝ USER
   * Chỉ admin mới có
   */
  function canManageUsers() {
    return isAdmin();
  }

  // ========== ROUTE GUARDS ==========

  /**
   * YÊU CẦU ĐĂNG NHẬP
   * Nếu chưa đăng nhập, chuyển về login
   */
  function requireAuth(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  /**
   * YÊU CẦU QUYỀN ADMIN
   * Chỉ admin mới được vào
   * Dùng cho trang admin.html
   */
  function requireAdmin(redirectUrl = "role-panel.html") {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    // Admin được vào
    if (isAdmin()) return true;

    // Không phải admin thì chặn
    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = redirectUrl;
    return false;
  }

  /**
   * YÊU CẦU TRANG ROLE-PANEL
   * Tất cả user đã đăng nhập đều vào được
   * Admin cũng được vào (không chặn)
   */
  function requireRolePanel(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    // Tất cả user đã đăng nhập đều được vào role-panel
    // Admin cũng được vào
    return true;
  }

  /**
   * YÊU CẦU MỘT TRONG CÁC ROLE ĐƯỢC PHÉP
   * Admin luôn được phép
   */
  function requireAnyRole(allowedRoles = []) {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    // Admin luôn được phép
    if (isAdmin()) return true;

    // Kiểm tra role có trong danh sách cho phép không
    const currentRole = getCurrentRole();
    if (allowedRoles.includes(currentRole)) {
      return true;
    }

    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = "role-panel.html";
    return false;
  }

  // ========== USER MANAGEMENT (ASYNC) ==========

  /**
   * Lấy danh sách tất cả user (chỉ admin)
   */
  async function getAllUsers() {
    try {
      const result = await window.API.auth.getAllUsers();
      return result.users || [];
    } catch (error) {
      console.error("Get users error:", error);
      return [];
    }
  }

  /**
   * Tạo user mới (chỉ admin)
   */
  async function createUser(userData) {
    return await window.API.auth.createUser(userData);
  }

  /**
   * Cập nhật user (chỉ admin)
   */
  async function updateUser(id, userData) {
    return await window.API.auth.updateUser(id, userData);
  }

  /**
   * Xóa user (chỉ admin)
   */
  async function deleteUser(id) {
    return await window.API.auth.deleteUser(id);
  }

  // ========== LEGACY / COMPATIBILITY ==========
  // Giữ lại cho tương thích với code cũ
  function hashPassword(pwd) {
    return btoa(pwd);
  }

  function verifyPassword(pwd, hash) {
    return btoa(pwd) === hash;
  }

  // ========== EXPORTS ==========
  window.Auth = {
    // Auth functions
    login,
    logout,
    isLoggedIn,
    getCurrentSession,
    getCurrentUser,
    getCurrentRole,
    isAdmin,

    // Permission checks
    canEditField,
    canAddRow,
    canDeleteRow,
    canSave,
    canExport,
    canManageUsers,

    // Route guards
    requireAuth,
    requireAdmin,
    requireRolePanel,
    requireAnyRole,

    // Role info
    getAllRoles,
    getRoleById,

    // User management
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,

    // Legacy
    hashPassword,
    verifyPassword,
  };
})();
