/**
 * ==================== ADMIN MODULE ====================
 * Admin - Quản lý người dùng và duyệt yêu cầu
 */

(function () {
  "use strict";

  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = Auth.getCurrentUser();
  if (currentUser.roleId !== "admin") {
    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = "role-panel.html";
    return;
  }

  const $ = (id) => document.getElementById(id);
  const viewNames = ["dashboard", "users", "requests", "history"];
  let currentView = "dashboard";
  let users = [];
  let pendingRequests = [];

  // ========== UPDATE TOPBAR ==========
  function updateTopbar() {
    const topbarRight = $("topbarRight");
    if (!topbarRight) return;

    let userBar = document.querySelector(".user-info");
    if (!userBar) {
      userBar = document.createElement("div");
      userBar.className = "user-info";
      topbarRight.insertBefore(userBar, topbarRight.firstChild);
    }

    userBar.innerHTML = `
      <div class="user-avatar"><i class="fas fa-user-circle"></i></div>
      <div class="user-details">
        <span class="user-name">${Utils.escapeHtml(currentUser.fullName)}</span>
        <span class="user-role role-admin">Admin</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="Đăng xuất"><i class="fas fa-sign-out-alt"></i></button>
    `;

    $("logoutBtn")?.addEventListener("click", () => {
      Auth.logout();
      window.location.href = "login.html";
    });

    $("currentDate").textContent = new Date().toLocaleDateString("vi-VN");
  }

  // ========== SWITCH VIEW ==========
  function switchView(viewName) {
    if (!viewNames.includes(viewName)) return;
    currentView = viewName;

    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    const titles = {
      dashboard: "Tổng quan",
      users: "Quản lý người dùng",
      requests: "Yêu cầu duyệt",
      history: "Lịch sử",
    };
    $("breadcrumb-title").textContent = titles[viewName] || viewName;

    if (viewName === "dashboard") loadDashboard();
    else if (viewName === "users") loadUsers();
    else if (viewName === "requests") loadRequests();
    else if (viewName === "history") loadHistory();
  }

  // ========== LOAD DASHBOARD ==========
  async function loadDashboard() {
    try {
      const usersRes = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        const allUsers = usersData.users || [];
        $("statTotalUsers").textContent = allUsers.length;
        $("statActiveUsers").textContent = allUsers.filter(
          (u) => u.isActive,
        ).length;
      }

      const reqRes = await fetch(`${API_BASE_URL}/approvals?status=pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const reqData = await reqRes.json();
      if (reqData.success) {
        $("statPendingRequests").textContent = (reqData.data || []).length;
      }
    } catch (error) {
      console.error("Load dashboard error:", error);
    }
    loadNotifications();
  }

  async function loadNotifications() {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        const container = $("recentNotifications");
        const notifications = result.data || [];
        $("notificationCount").textContent = result.unreadCount || 0;

        if (notifications.length === 0) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Không có thông báo</p></div>`;
          return;
        }

        container.innerHTML = notifications
          .slice(0, 10)
          .map(
            (n) => `
          <div class="alert-row" onclick="markAsRead(${n.id})" style="${n.isRead ? "opacity:0.7;" : ""}">
            <div class="alert-icon">${n.type === "approval" ? "📋" : n.type === "warning" ? "⚠️" : n.type === "success" ? "✅" : "ℹ️"}</div>
            <div class="alert-body">
              <div class="alert-title">${Utils.escapeHtml(n.title)}</div>
              <div class="alert-message">${Utils.escapeHtml(n.message)}</div>
              <div class="alert-time">${Utils.formatDate(n.createdAt)}</div>
            </div>
            ${!n.isRead ? '<span style="color:#3b82f6;font-size:10px;">● Mới</span>' : ""}
          </div>
        `,
          )
          .join("");
      }
    } catch (error) {
      console.error("Load notifications error:", error);
    }
  }

  window.markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      loadNotifications();
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  // ========== LOAD USERS ==========
  async function loadUsers() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        users = result.users || [];
        renderUsers();
      }
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderUsers() {
    const container = $("userTableBody");
    const searchTerm = $("searchUser")?.value.toLowerCase() || "";
    const roleFilter = $("filterUserRole")?.value || "";
    const statusFilter = $("filterUserStatus")?.value || "";

    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchTerm) ||
          u.fullName?.toLowerCase().includes(searchTerm),
      );
    }
    if (roleFilter) {
      filtered = filtered.filter((u) => u.roleId === roleFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((u) =>
        statusFilter === "active" ? u.isActive : !u.isActive,
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">Không có người dùng</td></tr>`;
      return;
    }

    container.innerHTML = filtered
      .map((user, idx) => {
        const isSelf = user.id === currentUser.id;
        return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${Utils.escapeHtml(user.username)}</strong></td>
          <td>${Utils.escapeHtml(user.fullName)}</td>
          <td>${Utils.escapeHtml(user.email || "—")}</td>
          <td><span class="status-badge ${user.roleId === "admin" ? "status-active" : "status-pending"}">${user.roleId === "admin" ? "Admin" : "Quản lý"}</span></td>
          <td><span class="status-badge ${user.isActive ? "status-active" : "status-locked"}">${user.isActive ? "🟢 Hoạt động" : "🔴 Đã khóa"}</span></td>
          <td>${Utils.formatDate(user.createdAt)}</td>
          <td>
            ${
              !isSelf
                ? `
              <button class="action-btn edit" onclick="editUser(${user.id})"><i class="fas fa-edit"></i></button>
              <button class="action-btn lock" onclick="toggleUserLock(${user.id}, ${!user.isActive})"><i class="fas fa-${user.isActive ? "lock" : "lock-open"}"></i></button>
              <button class="action-btn delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
            `
                : `<span style="color:#6b82a0;font-size:11px;">(Bạn)</span>`
            }
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // ========== USER MODAL ==========
  let editingUserId = null;

  function openUserModal(userId = null) {
    editingUserId = userId;
    const modal = $("userModal");
    const title = $("modalTitle");
    const passwordGroup = $("passwordGroup");

    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      title.textContent = "Sửa người dùng";
      $("editUserId").value = user.id;
      $("editUsername").value = user.username;
      $("editUsername").disabled = true;
      $("editFullName").value = user.fullName;
      $("editEmail").value = user.email || "";
      $("editRole").value = user.roleId;
      $("editIsActive").value = user.isActive ? "true" : "false";
      $("editPassword").value = "";
      $("editPassword").placeholder = "Để trống nếu không đổi";
      passwordGroup.querySelector("small").textContent =
        "Để trống nếu không đổi mật khẩu";
    } else {
      title.textContent = "Thêm người dùng";
      $("editUserId").value = "";
      $("editUsername").value = "";
      $("editUsername").disabled = false;
      $("editFullName").value = "";
      $("editEmail").value = "";
      $("editRole").value = "quan_ly";
      $("editIsActive").value = "true";
      $("editPassword").value = "";
      $("editPassword").placeholder = "Nhập mật khẩu";
      passwordGroup.querySelector("small").textContent =
        "Nhập mật khẩu cho tài khoản mới";
    }

    modal.style.display = "flex";
  }

  async function saveUser() {
    const id = $("editUserId").value;
    const data = {
      username: $("editUsername").value.trim(),
      fullName: $("editFullName").value.trim(),
      email: $("editEmail").value.trim(),
      roleId: $("editRole").value,
      isActive: $("editIsActive").value === "true",
    };

    if ($("editPassword").value) {
      data.password = $("editPassword").value;
    }

    if (!data.username || !data.fullName) {
      Utils.showToast("Vui lòng nhập đầy đủ thông tin", "error");
      return;
    }

    if (!id && !data.password) {
      Utils.showToast("Vui lòng nhập mật khẩu cho tài khoản mới", "error");
      return;
    }

    Utils.showLoading(true, "Đang lưu...");
    try {
      const url = id
        ? `${API_BASE_URL}/auth/users/${id}`
        : `${API_BASE_URL}/auth/users`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast(
          id ? "✅ Cập nhật thành công" : "✅ Tạo người dùng thành công",
        );
        closeModal("userModal");
        loadUsers();
        loadDashboard();
      } else {
        Utils.showToast(result.message || "Lỗi khi lưu", "error");
      }
    } catch (error) {
      Utils.showToast("Lỗi khi lưu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  async function toggleUserLock(id, unlock) {
    if (
      !confirm(`Bạn có chắc muốn ${unlock ? "mở khóa" : "khóa"} tài khoản này?`)
    )
      return;
    Utils.showLoading(true, "Đang cập nhật...");
    try {
      await fetch(`${API_BASE_URL}/auth/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ isActive: unlock }),
      });
      Utils.showToast(`Đã ${unlock ? "mở khóa" : "khóa"} tài khoản`);
      loadUsers();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi cập nhật", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  async function deleteUser(id) {
    const user = users.find((u) => u.id === id);
    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${user?.username}"?`)) return;
    Utils.showLoading(true, "Đang xóa...");
    try {
      await fetch(`${API_BASE_URL}/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      Utils.showToast("Đã xóa tài khoản");
      loadUsers();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi xóa", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== LOAD REQUESTS ==========
  async function loadRequests() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/approvals?status=pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        pendingRequests = result.data || [];
        renderRequests();
      }
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderRequests() {
    const container = $("approvalList");
    if (pendingRequests.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingRequests
      .map(
        (req) => `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-id">📋 ${Utils.escapeHtml(req.requesterName || "Unknown")}</div>
          <div class="approval-card-date">${Utils.formatDate(req.createdAt)}</div>
        </div>
        <div class="approval-card-body">
          <div><span class="label">Số sản phẩm:</span> <span class="value">${req.productData?.products?.length || 0}</span></div>
          <div><span class="label">Chi tiết:</span></div>
          <div style="grid-column:1/-1; background:#1a2235; padding:8px; border-radius:4px; font-size:12px; color:#6b82a0;">
            ${(req.productData?.products || [])
              .map(
                (p) =>
                  `<div>📦 ${Utils.escapeHtml(p.tenThuongMai)} (${Utils.escapeHtml(p.maHang)})</div>`,
              )
              .join("")}
          </div>
        </div>
        <div class="approval-card-actions">
          <button class="btn btn-danger" onclick="rejectRequest(${req.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="approveRequest(${req.id})"><i class="fas fa-check"></i> Duyệt</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  async function approveRequest(id) {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu này?")) return;
    Utils.showLoading(true, "Đang duyệt...");
    try {
      await fetch(`${API_BASE_URL}/approvals/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      Utils.showToast("✅ Đã duyệt yêu cầu");
      loadRequests();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  async function rejectRequest(id) {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await fetch(`${API_BASE_URL}/approvals/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });
      Utils.showToast("Đã từ chối yêu cầu");
      loadRequests();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== LOAD HISTORY ==========
  async function loadHistory() {
    const container = $("historyList");
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/history/all?limit=50`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        const history = result.data || [];
        if (history.length === 0) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>Chưa có lịch sử</p></div>`;
          return;
        }

        container.innerHTML = `
          <table class="history-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người dùng</th>
                <th>Bảng</th>
                <th>Hành động</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${history
                .map(
                  (h) => `
                <tr>
                  <td>${Utils.formatDate(h.editedAt, "DD/MM/YYYY HH:mm")}</td>
                  <td>${Utils.escapeHtml(h.userName || "—")}</td>
                  <td>${Utils.escapeHtml(h.tableName)}</td>
                  <td>${h.action}</td>
                  <td>
                    ${h.fieldName ? `<strong>${h.fieldName}:</strong> ` : ""}
                    ${h.oldValue ? `"${Utils.escapeHtml(String(h.oldValue).substring(0, 50))}" → ` : ""}
                    ${h.newValue ? `"${Utils.escapeHtml(String(h.newValue).substring(0, 50))}"` : ""}
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
      }
    } catch (error) {
      Utils.showToast("Lỗi tải lịch sử", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ========== CLOSE MODAL ==========
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
  }

  // ========== BIND EVENTS ==========
  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    $("btnRefresh")?.addEventListener("click", () => {
      loadDashboard();
      Utils.showToast("Đã làm mới dữ liệu");
    });

    $("btnAddUser")?.addEventListener("click", () => openUserModal());
    $("btnAddUser2")?.addEventListener("click", () => openUserModal());
    $("btnSaveUser")?.addEventListener("click", saveUser);

    $("searchUser")?.addEventListener("input", renderUsers);
    $("filterUserRole")?.addEventListener("change", renderUsers);
    $("filterUserStatus")?.addEventListener("change", renderUsers);
    $("btnResetUserFilter")?.addEventListener("click", () => {
      if ($("searchUser")) $("searchUser").value = "";
      if ($("filterUserRole")) $("filterUserRole").value = "";
      if ($("filterUserStatus")) $("filterUserStatus").value = "";
      renderUsers();
    });

    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    });
  }

  // ========== EXPOSE GLOBALS ==========
  window.switchView = switchView;
  window.closeModal = closeModal;
  window.editUser = openUserModal;
  window.toggleUserLock = toggleUserLock;
  window.deleteUser = deleteUser;
  window.approveRequest = approveRequest;
  window.rejectRequest = rejectRequest;
  window.markAsRead = markAsRead;

  // ========== INIT ==========
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboard();
  }

  init();
})();
