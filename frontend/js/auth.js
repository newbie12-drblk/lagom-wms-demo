/**
 * ==================== AUTH MODULE ====================
 * Quản lý xác thực, session, phân quyền
 * Tác giả: LAGOM
 * Ngày: 2026
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

  function getRoleById(roleId) {
    return FIXED_ROLES.find((r) => r.id === roleId) || null;
  }

  function getAllRoles() {
    return [...FIXED_ROLES];
  }

  function isAdmin() {
    const session = getCurrentSession();
    return session && session.roleId === "admin";
  }

  function isManager() {
    const session = getCurrentSession();
    return session && session.roleId === "quan_ly";
  }

  function isNhapLieu() {
    const session = getCurrentSession();
    return session && session.roleId === "nhap_lieu";
  }

  // ========== SESSION MANAGEMENT ==========

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
          redirectUrl: result.redirectUrl || "role-panel.html",
          user: session,
        };
      }
      return result;
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: error.message || "Lỗi kết nối server" };
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    if (window.API && window.API.auth) {
      window.API.auth.logout();
    }
    return { success: true };
  }

  function getCurrentSession() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!session) return null;

    const sessionData = JSON.parse(session);

    if (new Date(sessionData.expiresAt) < new Date()) {
      logout();
      return null;
    }
    return sessionData;
  }

  function isLoggedIn() {
    const session = getCurrentSession();
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return session !== null && !!token;
  }

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

  function getCurrentRole() {
    return getCurrentSession()?.roleId || null;
  }

  // ========== PERMISSION CHECKS ==========

  function canEditField(fieldName) {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    if (role === "nhap_lieu") return true;
    return false;
  }

  function canAddRow() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role === "nhap_lieu" || role === "admin";
  }

  function canDeleteRow() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role === "nhap_lieu" || role === "admin";
  }

  function canSave() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role === "nhap_lieu" || role === "admin";
  }

  function canExport() {
    if (isAdmin()) return true;
    const role = getCurrentRole();
    return role === "nhap_lieu" || role === "admin";
  }

  function canManageUsers() {
    return isAdmin();
  }

  // ========== ROUTE GUARDS ==========

  function requireAuth(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  function requireAdmin(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    if (isAdmin()) return true;

    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = redirectUrl;
    return false;
  }

  function requireManager(redirectUrl = "role-panel.html") {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    if (isManager()) return true;

    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = redirectUrl;
    return false;
  }

  function requireNhapLieu(redirectUrl = "role-panel.html") {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    if (isAdmin() || isNhapLieu()) return true;

    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = redirectUrl;
    return false;
  }

  function requireRolePanel(redirectUrl = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  function requireAnyRole(allowedRoles = []) {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    if (isAdmin()) return true;

    const currentRole = getCurrentRole();
    if (allowedRoles.includes(currentRole)) {
      return true;
    }

    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = "role-panel.html";
    return false;
  }

  // ========== USER MANAGEMENT ==========

  async function getAllUsers() {
    try {
      const result = await window.API.auth.getAllUsers();
      return result.users || [];
    } catch (error) {
      console.error("Get users error:", error);
      return [];
    }
  }

  async function createUser(userData) {
    return await window.API.auth.createUser(userData);
  }

  async function updateUser(id, userData) {
    return await window.API.auth.updateUser(id, userData);
  }

  async function deleteUser(id) {
    return await window.API.auth.deleteUser(id);
  }

  // ========== LEGACY ==========
  function hashPassword(pwd) {
    return btoa(pwd);
  }

  function verifyPassword(pwd, hash) {
    return btoa(pwd) === hash;
  }

  // ========== EXPORTS ==========
  window.Auth = {
    login,
    logout,
    isLoggedIn,
    getCurrentSession,
    getCurrentUser,
    getCurrentRole,
    isAdmin,
    isManager,
    isNhapLieu,

    canEditField,
    canAddRow,
    canDeleteRow,
    canSave,
    canExport,
    canManageUsers,

    requireAuth,
    requireAdmin,
    requireManager,
    requireNhapLieu,
    requireRolePanel,
    requireAnyRole,

    getAllRoles,
    getRoleById,

    getAllUsers,
    createUser,
    updateUser,
    deleteUser,

    hashPassword,
    verifyPassword,
  };
})();