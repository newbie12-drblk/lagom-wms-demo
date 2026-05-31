/**
 * ==================== ADMIN MODULE ====================
 * Quản lý người dùng, duyệt yêu cầu, xem lịch sử
 */

(function () {
  "use strict";

  let currentPage = 1;
  const rowsPerPage = 10;
  let users = [];

  // DOM Elements
  const userTableBody = document.getElementById("userTableBody");
  const searchInput = document.getElementById("searchUser");
  const roleFilter = document.getElementById("roleFilter");
  const btnAddUser = document.getElementById("btnAddUser");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const totalUsersSpan = document.getElementById("totalUsers");
  const activeUsersSpan = document.getElementById("activeUsers");
  const lockedUsersSpan = document.getElementById("lockedUsers");

  // Modal elements
  const userModal = document.getElementById("userModal");
  const passwordModal = document.getElementById("passwordModal");
  const modalTitle = document.getElementById("modalTitle");
  const userIdInput = document.getElementById("userId");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const roleSelect = document.getElementById("roleId");
  const isActiveSelect = document.getElementById("isActive");
  const useCustomCheckbox = document.getElementById("useCustomPermissions");
  const customPanel = document.getElementById("customPermissionsPanel");

  // Tab elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  let currentUserId = null;

  // Check auth
  if (!Auth.requireAdmin("index.html")) return;

  // Load user info
  async function loadAdminInfo() {
    const user = Auth.getCurrentUser();
    const adminInfo = document.getElementById("adminUserInfo");
    if (adminInfo && user) {
      adminInfo.innerHTML = `<i class="fas fa-user-shield"></i> ${Utils.escapeHtml(user.fullName)} (${user.roleName})`;
    }
  }

  // Load users from API
  async function loadUsers() {
    Utils.showLoading(true, "Đang tải danh sách người dùng...");
    try {
      const result = await window.API.auth.getAllUsers();
      users = result.users || [];
      updateStats();
      filterAndRenderUsers();
    } catch (error) {
      Utils.showToast("Lỗi khi tải danh sách người dùng", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function updateStats() {
    totalUsersSpan.textContent = users.length;
    activeUsersSpan.textContent = users.filter((u) => u.isActive).length;
    lockedUsersSpan.textContent = users.filter((u) => !u.isActive).length;
  }

  function filterAndRenderUsers() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const roleValue = roleFilter?.value || "";

    let filtered = users.filter((user) => {
      if (
        searchTerm &&
        !user.username.toLowerCase().includes(searchTerm) &&
        !user.fullName.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }
      if (roleValue && user.roleId !== roleValue) return false;
      return true;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    renderUserTable(pageData, start);

    pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  function renderUserTable(pageData, startIndex) {
    if (!userTableBody) return;

    if (pageData.length === 0) {
      userTableBody.innerHTML = `<td><td colspan="7" style="text-align:center;padding:40px;">Không có dữ liệu người dùng<\/td><\/tr>`;
      return;
    }

    const currentUser = Auth.getCurrentUser();

    userTableBody.innerHTML = pageData
      .map((user, idx) => {
        const isCurrentUser =
          currentUser && currentUser.username === user.username;
        return `
          <tr>
            <td>${startIndex + idx + 1}<\/td>
            <td><strong>${Utils.escapeHtml(user.username)}<\/strong><\/td>
            <td>${Utils.escapeHtml(user.fullName)}<\/td>
            <td>${Utils.escapeHtml(user.email || "—")}<\/td>
            <td><span class="status-badge">${user.roleId}<\/span><\/td>
            <td><span class="status-badge ${user.isActive ? "status-approved" : "status-rejected"}">${user.isActive ? "🟢 Hoạt động" : "🔴 Đã khóa"}<\/span><\/td>
            <td class="action-buttons">
              <button class="action-btn edit" onclick="adminEditUser(${user.id})"><i class="fas fa-edit"></i><\/button>
              <button class="action-btn password" onclick="adminChangePassword(${user.id}, '${Utils.escapeHtml(user.username)}')"><i class="fas fa-key"></i><\/button>
              <button class="action-btn lock" onclick="adminToggleLock(${user.id}, ${!user.isActive})"><i class="fas fa-${user.isActive ? "lock" : "lock-open"}"></i><\/button>
              ${!isCurrentUser ? `<button class="action-btn delete" onclick="adminDeleteUser(${user.id})"><i class="fas fa-trash"></i><\/button>` : ""}
            <\/td>
          <\/tr>
        `;
      })
      .join("");
  }

  // Load role filter options
  async function loadRoleFilter() {
    const roles = Auth.getAllRoles();
    roleFilter.innerHTML =
      '<option value="">Tất cả role</option>' +
      roles
        .map((role) => `<option value="${role.id}">${role.name}</option>`)
        .join("");
  }

  // Open user modal
  function openUserModal(userId = null) {
    modalTitle.textContent = userId ? "Sửa người dùng" : "Thêm người dùng";
    userIdInput.value = userId || "";
    usernameInput.disabled = !!userId;

    if (userId) {
      const user = users.find((u) => u.id == userId);
      if (user) {
        usernameInput.value = user.username;
        fullNameInput.value = user.fullName;
        emailInput.value = user.email || "";
        roleSelect.value = user.roleId;
        isActiveSelect.value = user.isActive ? "true" : "false";
        passwordInput.value = "";
        useCustomCheckbox.checked = !!user.customPermissions;
        toggleCustomPanel();
      }
    } else {
      document.getElementById("userForm").reset();
      usernameInput.disabled = false;
      useCustomCheckbox.checked = false;
      toggleCustomPanel();
    }
    userModal.style.display = "block";
  }

  function toggleCustomPanel() {
    customPanel.style.display = useCustomCheckbox.checked ? "block" : "none";
  }

  // Save user
  async function saveUser() {
    const userId = userIdInput.value;
    const userData = {
      username: usernameInput.value.trim(),
      fullName: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      roleId: roleSelect.value,
      isActive: isActiveSelect.value === "true",
    };

    if (passwordInput.value) {
      userData.password = passwordInput.value;
    }

    if (useCustomCheckbox.checked) {
      const editableFields = [];
      document
        .querySelectorAll(
          '#customPermissionsPanel input[type="checkbox"][value]',
        )
        .forEach((cb) => {
          if (cb.checked) editableFields.push(cb.value);
        });
      userData.customPermissions = {
        editableFields,
        canAddRow: document.getElementById("permAddRow")?.checked || false,
        canDeleteRow:
          document.getElementById("permDeleteRow")?.checked || false,
        canSave: document.getElementById("permSave")?.checked || false,
        canExport: document.getElementById("permExport")?.checked || false,
      };
    }

    Utils.showLoading(true, "Đang lưu...");
    try {
      if (userId) {
        await window.API.auth.updateUser(userId, userData);
        Utils.showToast("Cập nhật người dùng thành công");
      } else {
        if (!userData.password) {
          Utils.showToast("Vui lòng nhập mật khẩu", "error");
          return;
        }
        await window.API.auth.createUser(userData);
        Utils.showToast("Tạo người dùng thành công");
      }
      closeModal();
      await loadUsers();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi lưu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Change password
  async function savePassword() {
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!newPassword) {
      Utils.showToast("Vui lòng nhập mật khẩu mới", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      Utils.showToast("Mật khẩu xác nhận không khớp", "error");
      return;
    }

    Utils.showLoading(true, "Đang đổi mật khẩu...");
    try {
      await window.API.auth.updateUser(currentUserId, {
        password: newPassword,
      });
      Utils.showToast("Đổi mật khẩu thành công");
      closePasswordModal();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi đổi mật khẩu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Toggle lock
  async function adminToggleLock(userId, unlock) {
    if (
      !confirm(`Bạn có chắc muốn ${unlock ? "mở khóa" : "khóa"} tài khoản này?`)
    )
      return;

    Utils.showLoading(true);
    try {
      await window.API.auth.updateUser(userId, { isActive: unlock });
      Utils.showToast(`Đã ${unlock ? "mở khóa" : "khóa"} tài khoản`);
      await loadUsers();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi cập nhật", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Delete user
  async function adminDeleteUser(userId) {
    const user = users.find((u) => u.id == userId);
    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${user?.username}"?`)) return;

    Utils.showLoading(true);
    try {
      await window.API.auth.deleteUser(userId);
      Utils.showToast("Xóa tài khoản thành công");
      await loadUsers();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi xóa", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function adminChangePassword(userId, username) {
    currentUserId = userId;
    document.getElementById("pwUsername").textContent = username;
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    passwordModal.style.display = "block";
  }

  function closeModal() {
    userModal.style.display = "none";
  }

  function closePasswordModal() {
    passwordModal.style.display = "none";
    currentUserId = null;
  }

  // Tab switching
  function switchTab(tabId) {
    tabBtns.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    document
      .querySelector(`.tab-btn[data-tab="${tabId}"]`)
      ?.classList.add("active");
    document.getElementById(`tab-${tabId}`)?.classList.add("active");

    if (tabId === "approvals") loadApprovalRequests();
    if (tabId === "deletions") loadDeletionRequests();
    if (tabId === "history") loadEditHistory();
  }

  // Load approval requests (thêm sản phẩm)
  async function loadApprovalRequests() {
    const container = document.getElementById("approvalRequestsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu duyệt...");
    try {
      const requests = await window.API.approval.getAllRequests("pending");

      if (requests.length === 0) {
        container.innerHTML =
          '<div class="empty-state">Không có yêu cầu nào đang chờ duyệt</div>';
        Utils.showLoading(false);
        return;
      }

      container.innerHTML = requests
        .map((req) => {
          const productList = req.productData.products || [];
          return `
          <div class="approval-card">
            <div class="approval-header" style="margin-bottom: 10px;">
              <strong>Yêu cầu #${req.id}</strong> - 
              Người gửi: ${Utils.escapeHtml(req.requesterName)} - 
              Ngày: ${Utils.formatDate(req.createdAt)}
            </div>
            <div class="approval-body">
              <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr>
                    <th style="border:1px solid var(--border); padding: 6px;">Tên sản phẩm</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Mã hàng</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Giá nhập</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Giá xuất</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Tồn đầu</th>
                    <th style="border:1px solid var(--border); padding: 6px;">HSD</th>
                  </tr>
                </thead>
                <tbody>
                  ${productList
                    .map(
                      (p) => `
                    <tr>
                      <td style="border:1px solid var(--border); padding: 6px;">${Utils.escapeHtml(p.tenThuongMai)}<\/td>
                      <td style="border:1px solid var(--border); padding: 6px;">${Utils.escapeHtml(p.maHang)}<\/td>
                      <td style="border:1px solid var(--border); padding: 6px;">${Utils.formatCurrency(p.giaNhap)}<\/td>
                      <td style="border:1px solid var(--border); padding: 6px;">${Utils.formatCurrency(p.giaXuat)}<\/td>
                      <td style="border:1px solid var(--border); padding: 6px;">${p.tonKho}<\/td>
                      <td style="border:1px solid var(--border); padding: 6px;">${p.ngayHetHan || "—"}<\/td>
                    <\/tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="approval-actions" style="margin-top: 15px;">
              <button class="btn btn-success btn-sm" onclick="approveRequest(${req.id})" style="margin-right: 10px;">
                <i class="fas fa-check"></i> Duyệt toàn bộ
              </button>
              <button class="btn btn-danger btn-sm" onclick="rejectRequest(${req.id})">
                <i class="fas fa-times"></i> Từ chối
              </button>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (error) {
      console.error("Load approval requests error:", error);
      Utils.showToast("Lỗi khi tải yêu cầu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Approve request (thêm)
  window.approveRequest = async (id) => {
    Utils.showLoading(true, "Đang duyệt...");
    try {
      await window.API.approval.approve(id);
      Utils.showToast("Đã duyệt yêu cầu và thêm sản phẩm vào kho");
      loadApprovalRequests();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // Reject request (thêm)
  window.rejectRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.approval.reject(id, reason);
      Utils.showToast("Đã từ chối yêu cầu");
      loadApprovalRequests();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // Load deletion requests (xóa)
  async function loadDeletionRequests() {
    const container = document.getElementById("deletionRequestsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu xóa...");
    try {
      const requests = await window.API.deletion.getAllRequests("pending");

      if (requests.length === 0) {
        container.innerHTML =
          '<div class="empty-state">Không có yêu cầu xóa nào đang chờ duyệt</div>';
        Utils.showLoading(false);
        return;
      }

      container.innerHTML = requests
        .map((req) => {
          const product = req.productData;
          return `
          <div class="approval-card">
            <div class="approval-header">
              <strong>Yêu cầu xóa #${req.id}</strong> - 
              Người gửi: ${Utils.escapeHtml(req.requesterName)} - 
              Ngày: ${Utils.formatDate(req.createdAt)}
            </div>
            <div class="approval-body">
              <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr>
                    <th style="border:1px solid var(--border); padding: 6px;">Tên sản phẩm</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Mã hàng</th>
                    <th style="border:1px solid var(--border); padding: 6px;">Số lot</th>
                    <th style="border:1px solid var(--border); padding: 6px;">HSD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="border:1px solid var(--border); padding: 6px;">${Utils.escapeHtml(product.tenThuongMai)}<\/td>
                    <td style="border:1px solid var(--border); padding: 6px;">${Utils.escapeHtml(product.maHang)}<\/td>
                    <td style="border:1px solid var(--border); padding: 6px;">${Utils.escapeHtml(product.soLot || "—")}<\/td>
                    <td style="border:1px solid var(--border); padding: 6px;">${Utils.formatDate(product.ngayHetHan) || "—"}<\/td>
                  <\/tr>
                </tbody>
              </table>
            </div>
            <div class="approval-actions" style="margin-top: 15px;">
              <button class="btn btn-success btn-sm" onclick="approveDeletionRequest(${req.id})" style="margin-right: 10px;">
                <i class="fas fa-check"></i> Duyệt xóa
              </button>
              <button class="btn btn-danger btn-sm" onclick="rejectDeletionRequest(${req.id})">
                <i class="fas fa-times"></i> Từ chối
              </button>
            </div>
          </div>
        `;
        })
        .join("");
    } catch (error) {
      console.error("Load deletion requests error:", error);
      Utils.showToast("Lỗi khi tải yêu cầu xóa", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Approve deletion request (xóa)
  window.approveDeletionRequest = async (id) => {
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.deletion.approve(id);
      Utils.showToast("Đã duyệt và xóa sản phẩm khỏi kho", "success");
      loadDeletionRequests();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // Reject deletion request (xóa)
  window.rejectDeletionRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.deletion.reject(id, reason);
      Utils.showToast("Đã từ chối yêu cầu xóa", "success");
      loadDeletionRequests();
    } catch (error) {
      Utils.showToast(error.message || "Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // Load edit history
  async function loadEditHistory() {
    const container = document.getElementById("editHistoryList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải lịch sử chỉnh sửa...");
    try {
      const history = await window.API.history.getAll(100);

      if (history.length === 0) {
        container.innerHTML =
          '<div class="empty-state">Chưa có lịch sử chỉnh sửa</div>';
        Utils.showLoading(false);
        return;
      }

      container.innerHTML = `
        <table class="history-table">
          <thead>
            <tr><th>Thời gian</th><th>Người dùng</th><th>Bảng</th><th>Record ID</th><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr>
          </thead>
          <tbody>
            ${history
              .map(
                (h) => `
              <tr>
                <td>${Utils.formatDate(h.editedAt, "DD/MM/YYYY HH:mm")}<\/td>
                <td>${Utils.escapeHtml(h.userName)}<\/td>
                <td>${h.tableName}<\/td>
                <td>${h.recordId}<\/td>
                <td>${h.fieldName || "CREATE/DELETE"}<\/td>
                <td><small>${Utils.escapeHtml(h.oldValue?.substring(0, 50) || "—")}</small><\/td>
                <td><small>${Utils.escapeHtml(h.newValue?.substring(0, 50) || "—")}</small><\/td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `;
    } catch (error) {
      Utils.showToast("Lỗi khi tải lịch sử", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // Event binding
  function bindEvents() {
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      Auth.logout();
      window.location.href = "login.html";
    });

    document.getElementById("btnOpenIndex")?.addEventListener("click", () => {
      window.open("index.html", "_blank");
    });

    document
      .getElementById("btnOpenRolePanel")
      ?.addEventListener("click", () => {
        window.location.href = "role-panel.html";
      });

    btnAddUser?.addEventListener("click", () => openUserModal());
    searchInput?.addEventListener("input", () => {
      currentPage = 1;
      filterAndRenderUsers();
    });
    roleFilter?.addEventListener("change", () => {
      currentPage = 1;
      filterAndRenderUsers();
    });
    prevPageBtn?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        filterAndRenderUsers();
      }
    });
    nextPageBtn?.addEventListener("click", () => {
      currentPage++;
      filterAndRenderUsers();
    });

    document
      .querySelector("#userModal .close")
      ?.addEventListener("click", closeModal);
    document
      .getElementById("btnCancelModal")
      ?.addEventListener("click", closeModal);
    document.getElementById("btnSaveUser")?.addEventListener("click", saveUser);

    document
      .querySelector("#passwordModal .close-pw")
      ?.addEventListener("click", closePasswordModal);
    document
      .getElementById("btnCancelPw")
      ?.addEventListener("click", closePasswordModal);
    document
      .getElementById("btnSavePassword")
      ?.addEventListener("click", savePassword);

    useCustomCheckbox?.addEventListener("change", toggleCustomPanel);

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
  }

  // Init
  async function init() {
    await loadAdminInfo();
    await loadRoleFilter();
    await loadUsers();
    bindEvents();

    const dateEl = document.getElementById("currentDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("vi-VN");
  }

  // Global functions
  window.adminEditUser = (id) => openUserModal(id);
  window.adminChangePassword = (id, username) =>
    adminChangePassword(id, username);
  window.adminToggleLock = (id, unlock) => adminToggleLock(id, unlock);
  window.adminDeleteUser = (id) => adminDeleteUser(id);

  init();
})();
