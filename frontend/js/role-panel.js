/**
 * ==================== ROLE PANEL MODULE ====================
 * Xử lý logic cho trang chọn vai trò
 * Tác giả: LAGOM
 * Ngày: 2026
 */

(function () {
  "use strict";

  /**
   * Xử lý đăng xuất
   */
  window.handleLogout = function () {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      Auth.logout();
      window.location.href = "login.html";
    }
  };

  /**
   * Kiểm tra đăng nhập và redirect
   */
  function checkAuth() {
    // Nếu chưa đăng nhập → về login
    if (!Auth.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }

    const user = Auth.getCurrentUser();

    // 🔥 Nếu là admin → chuyển thẳng về index.html (trang tồn kho)
    if (user && user.roleId === "admin") {
      window.location.href = "index.html";
      return false;
    }

    return user;
  }

  /**
   * Cập nhật tên user trên giao diện
   */
  function updateGreeting(user) {
    const greetingText = document.getElementById("greetingText");
    if (greetingText && user) {
      greetingText.textContent = `Xin chào ${user.fullName || user.username}! Chọn vai trò để tiếp tục.`;
    }
  }

  /**
   * Lọc các card role theo quyền của user
   */
  function filterRolesByPermission(currentRole) {
    const roleGrid = document.getElementById("roleGrid");
    if (!roleGrid) return;

    const roleCards = roleGrid.querySelectorAll(".role-card");

    roleCards.forEach((card) => {
      const cardRole = card.dataset.role;

      // Nếu là nhập liệu: chỉ hiện Nhập liệu và Xem kho
      if (currentRole === "nhap_lieu") {
        if (cardRole === "quan_ly") {
          card.style.display = "none";
        } else {
          card.style.display = "block";
        }
        return;
      }

      // Nếu là quản lý: chỉ hiện Quản lý và Xem kho
      if (currentRole === "quan_ly") {
        if (cardRole === "nhap_lieu") {
          card.style.display = "none";
        } else {
          card.style.display = "block";
        }
        return;
      }

      // Mặc định (nhân viên): chỉ hiện Xem kho
      if (cardRole !== "nhan_vien") {
        card.style.display = "none";
      } else {
        card.style.display = "block";
      }
    });
  }

  /**
   * Khởi tạo trang
   */
  function init() {
    const user = checkAuth();
    if (!user) return;

    updateGreeting(user);
    filterRolesByPermission(user.roleId);
  }

  // Chạy khi DOM đã sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
