/**
 * ==================== ADMIN MODULE ====================
 * Admin - Nhập liệu (KHÔNG được sửa trực tiếp trên bảng)
 * Chỉ tạo yêu cầu nhập liệu, đề nghị nhập/xuất hàng
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

  // ========== DOM REFS ==========
  const $ = (id) => document.getElementById(id);
  const viewNames = ["dashboard", "requests", "history"];

  let currentView = "dashboard";
  let inventoryData = [];
  let receiptRequests = [];
  let exportRequests = [];

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
        <span class="user-role role-admin">Admin (Nhập liệu)</span>
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
      requests: "Yêu cầu của tôi",
      history: "Lịch sử",
    };
    $("breadcrumb-title").textContent = titles[viewName] || viewName;

    if (viewName === "dashboard") loadDashboard();
    else if (viewName === "requests") loadRequests();
    else if (viewName === "history") loadHistory();
  }

  // ========== LOAD DASHBOARD ==========
  async function loadDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        const data = result.data || [];
        $("statTotalItems").textContent = data.length;
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

  // ========== LOAD REQUESTS (Yêu cầu của Admin) ==========
  async function loadRequests() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const [receiptRes, exportRes] = await Promise.all([
        fetch(`${API_BASE_URL}/receipt-requests`, {
          headers: { Authorization: `Bearer ${API.getToken()}` },
        }),
        fetch(`${API_BASE_URL}/export-requests`, {
          headers: { Authorization: `Bearer ${API.getToken()}` },
        }),
      ]);

      const receiptData = await receiptRes.json();
      const exportData = await exportRes.json();

      receiptRequests = receiptData.success ? receiptData.data || [] : [];
      exportRequests = exportData.success ? exportData.data || [] : [];

      renderRequests();
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderRequests() {
    const container = $("requestsList");
    const allRequests = [
      ...receiptRequests.map((r) => ({ ...r, type: "receipt" })),
      ...exportRequests.map((r) => ({ ...r, type: "export" })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (allRequests.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>Bạn chưa có yêu cầu nào</p></div>`;
      return;
    }

    const statusMap = {
      pending: { label: "⏳ Chờ duyệt", class: "status-pending" },
      approved: { label: "✅ Đã duyệt", class: "status-approved" },
      rejected: { label: "❌ Từ chối", class: "status-rejected" },
    };

    container.innerHTML = allRequests
      .map((r) => {
        const status = statusMap[r.status] || statusMap["pending"];
        const typeIcon = r.type === "receipt" ? "📥" : "📤";
        const typeName = r.type === "receipt" ? "Nhập hàng" : "Xuất kho";

        return `
        <div class="request-card">
          <div class="request-card-header">
            <div class="request-card-id">${typeIcon} ${Utils.escapeHtml(r.requestNo)}</div>
            <div class="request-card-date">${Utils.formatDate(r.createdAt)}</div>
            <span class="status-badge ${status.class}">${status.label}</span>
          </div>
          <div class="request-card-body">
            <div><span class="label">Sản phẩm:</span> <span class="value">${Utils.escapeHtml(r.tenThuongMai)}</span></div>
            <div><span class="label">Mã hàng:</span> <span class="value">${Utils.escapeHtml(r.maHang)}</span></div>
            <div><span class="label">Loại:</span> <span class="value">${typeName}</span></div>
            <div><span class="label">Trạng thái khớp:</span> <span class="value ${r.matchStatus === "matched" ? "text-success" : "text-warning"}">${r.matchStatus === "matched" ? "✅ Đã khớp" : "⚠️ Chưa khớp"}</span></div>
            ${r.status === "rejected" ? `<div><span class="label">Lý do:</span> <span class="value" style="color:#f87171;">${Utils.escapeHtml(r.rejectedReason || "Không có lý do")}</span></div>` : ""}
          </div>
        </div>
      `;
      })
      .join("");
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
                    ${h.oldValue ? `"${Utils.escapeHtml(h.oldValue.substring(0, 50))}" → ` : ""}
                    ${h.newValue ? `"${Utils.escapeHtml(h.newValue.substring(0, 50))}"` : ""}
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

  // ========== MODAL TẠO YÊU CẦU NHẬP LIỆU ==========
  function openCreateProductModal() {
    const modal = $("productModal");
    $("p_tenThuongMai").value = "";
    $("p_maHang").value = "";
    $("p_dvt").value = "";
    $("p_hangSX").value = "";
    $("p_phanLoai").value = "";
    $("p_giaNhap").value = "";
    $("p_soHopDongNhap").value = "";
    $("p_soHoaDonNhap").value = "";
    $("p_soHoaDonXuat").value = "";
    $("p_ngayNhapHD").value = "";
    $("p_ngayXuatHD").value = "";
    $("p_ghiChu").value = "";
    modal.style.display = "flex";
  }

  async function saveProductRequest() {
    const data = {
      tenThuongMai: $("p_tenThuongMai").value.trim(),
      maHang: $("p_maHang").value.trim(),
      dvt: $("p_dvt").value.trim(),
      hangSX: $("p_hangSX").value.trim(),
      phanLoai: $("p_phanLoai").value.trim(),
      giaNhap: parseFloat($("p_giaNhap").value.replace(/[^0-9]/g, "")) || 0,
      soHopDongNhap: $("p_soHopDongNhap").value.trim(),
      soHoaDonNhap: $("p_soHoaDonNhap").value.trim(),
      soHoaDonXuat: $("p_soHoaDonXuat").value.trim(),
      ngayNhapHD: $("p_ngayNhapHD").value || null,
      ngayXuatHD: $("p_ngayXuatHD").value || null,
      ghiChu: $("p_ghiChu").value.trim(),
    };

    if (!data.tenThuongMai || !data.maHang) {
      Utils.showToast("Vui lòng nhập Tên thương mại và Mã hàng", "error");
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã gửi yêu cầu nhập sản phẩm, chờ Quản lý duyệt");
        closeModal("productModal");
        loadDashboard();
        loadRequests();
      } else {
        Utils.showToast(result.message || "Lỗi khi gửi yêu cầu", "error");
      }
    } catch (error) {
      Utils.showToast("Lỗi khi gửi yêu cầu", "error");
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
    // Navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    // Refresh
    $("btnRefresh")?.addEventListener("click", () => {
      loadDashboard();
      Utils.showToast("Đã làm mới dữ liệu");
    });

    // Create product request
    $("btnCreateProduct")?.addEventListener("click", openCreateProductModal);
    $("btnSaveProduct")?.addEventListener("click", saveProductRequest);

    // Create receipt request
    $("btnCreateReceipt")?.addEventListener("click", () => {
      window.open("receipt.html", "_blank");
    });

    // Create export request
    $("btnCreateExport")?.addEventListener("click", () => {
      window.open("export.html", "_blank");
    });

    // Close modals on overlay
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    });
  }

  // ========== EXPOSE GLOBALS ==========
  window.switchView = switchView;
  window.closeModal = closeModal;

  // ========== INIT ==========
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboard();
  }

  init();
})();
