/**
 * ==================== MANAGER MODULE ====================
 * Quản lý - Duyệt các yêu cầu từ Admin
 */

(function () {
  "use strict";

  // ========== KIỂM TRA ĐĂNG NHẬP ==========
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = Auth.getCurrentUser();
  if (currentUser.roleId !== "quan_ly") {
    alert("❌ Bạn không có quyền truy cập trang này!");
    window.location.href = "role-panel.html";
    return;
  }

  // ========== DOM REFS ==========
  const $ = (id) => document.getElementById(id);
  const viewNames = [
    "dashboard",
    "pending-products",
    "pending-receipts",
    "pending-exports",
    "users",
  ];

  // ========== STATE ==========
  let currentView = "dashboard";
  let pendingProducts = [];
  let pendingReceipts = [];
  let pendingExports = [];
  let users = [];

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
        <span class="user-role role-quan_ly">Quản lý</span>
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

    // Update views
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add("active");

    // Update nav
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    // Update breadcrumb
    const titles = {
      dashboard: "Tổng quan",
      "pending-products": "Sản phẩm chờ duyệt",
      "pending-receipts": "Nhập hàng chờ duyệt",
      "pending-exports": "Xuất kho chờ duyệt",
      users: "Quản lý người dùng",
    };
    $("breadcrumb-title").textContent = titles[viewName] || viewName;

    // Load data
    if (viewName === "dashboard") loadDashboard();
    else if (viewName === "pending-products") loadPendingProducts();
    else if (viewName === "pending-receipts") loadPendingReceipts();
    else if (viewName === "pending-exports") loadPendingExports();
    else if (viewName === "users") loadUsers();
  }

  // ========== LOAD DASHBOARD ==========
  async function loadDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/manager/dashboard/stats`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        $("statPendingProducts").textContent = data.pendingProducts || 0;
        $("statPendingReceipts").textContent = data.pendingReceipts || 0;
        $("statPendingExports").textContent = data.pendingExports || 0;

        // Update badges
        $("badgeProducts").textContent = data.pendingProducts || 0;
        $("badgeReceipts").textContent = data.pendingReceipts || 0;
        $("badgeExports").textContent = data.pendingExports || 0;
      }
    } catch (error) {
      console.error("Load dashboard error:", error);
    }

    // Load notifications
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
          container.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Không có thông báo mới</p></div>`;
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

  // ========== LOAD PENDING PRODUCTS ==========
  async function loadPendingProducts() {
    const container = $("pendingProductsList");
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        pendingProducts = result.data || [];
        renderPendingProducts();
      }
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingProducts() {
    const container = $("pendingProductsList");
    if (pendingProducts.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có sản phẩm nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingProducts
      .map(
        (p) => `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-id">📦 ${Utils.escapeHtml(p.tenThuongMai)}</div>
          <div class="approval-card-date">${Utils.formatDate(p.createdAt)}</div>
          <div class="approval-card-creator">👤 ${Utils.escapeHtml(p.creatorName || "Admin")}</div>
        </div>
        <div class="approval-card-body">
          <div><span class="label">Mã hàng:</span> <span class="value">${Utils.escapeHtml(p.maHang)}</span></div>
          <div><span class="label">Đơn vị tính:</span> <span class="value">${Utils.escapeHtml(p.dvt || "—")}</span></div>
          <div><span class="label">Hãng SX:</span> <span class="value">${Utils.escapeHtml(p.hangSX || "—")}</span></div>
          <div><span class="label">Phân loại:</span> <span class="value">${Utils.escapeHtml(p.phanLoai || "—")}</span></div>
          <div><span class="label">Giá nhập:</span> <span class="value">${Utils.formatCurrency(p.giaNhap)}</span></div>
          <div><span class="label">Số HĐ nhập:</span> <span class="value">${Utils.escapeHtml(p.soHopDongNhap || "—")}</span></div>
          <div><span class="label">Số HĐơn nhập:</span> <span class="value">${Utils.escapeHtml(p.soHoaDonNhap || "—")}</span></div>
          <div><span class="label">Số HĐơn xuất:</span> <span class="value">${Utils.escapeHtml(p.soHoaDonXuat || "—")}</span></div>
          <div><span class="label">Ngày nhập HĐ:</span> <span class="value">${Utils.formatDate(p.ngayNhapHD)}</span></div>
          <div><span class="label">Ngày xuất HĐ:</span> <span class="value">${Utils.formatDate(p.ngayXuatHD)}</span></div>
        </div>
        <div class="approval-card-actions">
          <button class="btn btn-danger" onclick="rejectProduct(${p.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="approveProduct(${p.id})"><i class="fas fa-check"></i> Duyệt</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  // ========== APPROVE/REJECT PRODUCT ==========
  window.approveProduct = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt sản phẩm này?")) return;
    Utils.showLoading(true, "Đang duyệt...");
    try {
      await fetch(`${API_BASE_URL}/inventory/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      Utils.showToast("✅ Đã duyệt sản phẩm thành công");
      loadPendingProducts();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectProduct = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await fetch(`${API_BASE_URL}/inventory/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });
      Utils.showToast("Đã từ chối sản phẩm");
      loadPendingProducts();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== LOAD PENDING RECEIPTS ==========
  async function loadPendingReceipts() {
    const container = $("pendingReceiptsList");
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/receipt-requests/pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        pendingReceipts = result.data || [];
        renderPendingReceipts();
      }
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingReceipts() {
    const container = $("pendingReceiptsList");
    if (pendingReceipts.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có đề nghị nhập hàng nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingReceipts
      .map((r) => {
        const isMatched = r.matchStatus === "matched";
        return `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-id">📥 ${Utils.escapeHtml(r.requestNo)}</div>
          <div class="approval-card-date">${Utils.formatDate(r.createdAt)}</div>
          <div class="approval-card-creator">👤 ${Utils.escapeHtml(r.creatorName || "Admin")}</div>
          <span class="badge-match ${isMatched ? "badge-matched" : "badge-unmatched"}">
            ${isMatched ? "✅ Đã khớp" : "⚠️ Chưa khớp"}
          </span>
        </div>
        <div class="approval-card-body">
          <div><span class="label">Tên sản phẩm:</span> <span class="value">${Utils.escapeHtml(r.tenThuongMai)}</span></div>
          <div><span class="label">Mã hàng:</span> <span class="value">${Utils.escapeHtml(r.maHang)}</span></div>
          <div><span class="label">Đơn vị tính:</span> <span class="value">${Utils.escapeHtml(r.dvt || "—")}</span></div>
          <div><span class="label">Hãng SX:</span> <span class="value">${Utils.escapeHtml(r.hangSX || "—")}</span></div>
          <div><span class="label">Phân loại:</span> <span class="value">${Utils.escapeHtml(r.phanLoai || "—")}</span></div>
          <div><span class="label">Giá nhập:</span> <span class="value">${Utils.formatCurrency(r.giaNhap)}</span></div>
          <div><span class="label">Số lượng nhập:</span> <span class="value">${r.soLuongNhap || "Chưa nhập"}</span></div>
          ${isMatched ? `<div><span class="label">Trạng thái:</span> <span class="value" style="color:#34d399;">Chờ xác nhận số lượng</span></div>` : `<div><span class="label">Trạng thái:</span> <span class="value" style="color:#fbbf24;">Chờ duyệt</span></div>`}
        </div>
        <div class="approval-card-actions">
          <button class="btn btn-danger" onclick="rejectReceipt(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="openReceiptApprove(${r.id})"><i class="fas fa-check"></i> Xác nhận</button>
        </div>
      </div>
    `;
      })
      .join("");
  }

  // ========== APPROVE/REJECT RECEIPT ==========
  window.openReceiptApprove = (id) => {
    const request = pendingReceipts.find((r) => r.id === id);
    if (!request) return;

    if (request.matchStatus === "matched") {
      // Đã khớp: chỉ cần nhập số lượng
      const soLuong = prompt("Nhập số lượng nhập:", request.soLuongNhap || "1");
      if (soLuong === null) return;
      const num = parseInt(soLuong);
      if (isNaN(num) || num <= 0) {
        Utils.showToast("Vui lòng nhập số lượng hợp lệ", "error");
        return;
      }
      confirmReceipt(id, num);
    } else {
      // Chưa khớp: duyệt trực tiếp
      if (
        !confirm(
          "Sản phẩm chưa khớp với kho. Bạn có chắc muốn duyệt và thêm mới?",
        )
      )
        return;
      confirmReceipt(id, request.soLuongNhap || 1);
    }
  };

  async function confirmReceipt(id, soLuongNhap) {
    Utils.showLoading(true, "Đang xác nhận...");
    try {
      await fetch(`${API_BASE_URL}/receipt-requests/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ soLuongNhap }),
      });
      Utils.showToast("✅ Đã xác nhận đề nghị nhập hàng");
      loadPendingReceipts();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi xác nhận", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  window.rejectReceipt = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await fetch(`${API_BASE_URL}/receipt-requests/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });
      Utils.showToast("Đã từ chối đề nghị nhập hàng");
      loadPendingReceipts();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== LOAD PENDING EXPORTS ==========
  async function loadPendingExports() {
    const container = $("pendingExportsList");
    Utils.showLoading(true, "Đang tải...");
    try {
      const response = await fetch(`${API_BASE_URL}/export-requests/pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();
      if (result.success) {
        pendingExports = result.data || [];
        renderPendingExports();
      }
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingExports() {
    const container = $("pendingExportsList");
    if (pendingExports.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có đề nghị xuất kho nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingExports
      .map((r) => {
        const isMatched = r.matchStatus === "matched";
        return `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-id">📤 ${Utils.escapeHtml(r.requestNo)}</div>
          <div class="approval-card-date">${Utils.formatDate(r.createdAt)}</div>
          <div class="approval-card-creator">👤 ${Utils.escapeHtml(r.creatorName || "Admin")}</div>
          <span class="badge-match ${isMatched ? "badge-matched" : "badge-unmatched"}">
            ${isMatched ? "✅ Đã khớp" : "⚠️ Chưa khớp"}
          </span>
        </div>
        <div class="approval-card-body">
          <div><span class="label">Tên sản phẩm:</span> <span class="value">${Utils.escapeHtml(r.tenThuongMai)}</span></div>
          <div><span class="label">Mã hàng:</span> <span class="value">${Utils.escapeHtml(r.maHang)}</span></div>
          <div><span class="label">Đơn vị tính:</span> <span class="value">${Utils.escapeHtml(r.dvt || "—")}</span></div>
          <div><span class="label">Hãng SX:</span> <span class="value">${Utils.escapeHtml(r.hangSX || "—")}</span></div>
          <div><span class="label">Phân loại:</span> <span class="value">${Utils.escapeHtml(r.phanLoai || "—")}</span></div>
          <div><span class="label">Tồn kho hiện tại:</span> <span class="value">${r.tonKho || 0}</span></div>
          ${
            isMatched
              ? `
            <div style="grid-column:1/-1; margin-top:8px; padding:8px; background:#1a2235; border-radius:6px;">
              <strong style="color:#fbbf24;">📝 Cần nhập thêm thông tin:</strong>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; margin-top:4px;">
                <div><span class="label">Đơn giá xuất:</span> <span class="value">${r.donGiaXuat ? Utils.formatCurrency(r.donGiaXuat) : "—"}</span></div>
                <div><span class="label">Số lượng:</span> <span class="value">${r.soLuong || "—"}</span></div>
                <div><span class="label">Số lot:</span> <span class="value">${Utils.escapeHtml(r.soLot || "—")}</span></div>
                <div><span class="label">HSD:</span> <span class="value">${Utils.formatDate(r.ngayHetHan)}</span></div>
                <div style="grid-column:1/-1;"><span class="label">Số hợp đồng xuất:</span> <span class="value">${Utils.escapeHtml(r.soHopDongXuat || "—")}</span></div>
              </div>
            </div>
          `
              : `<div style="grid-column:1/-1; color:#fbbf24;">⚠️ Sản phẩm chưa khớp với kho, cần duyệt thủ công</div>`
          }
        </div>
        <div class="approval-card-actions">
          <button class="btn btn-danger" onclick="rejectExport(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="openExportApprove(${r.id})"><i class="fas fa-check"></i> Xác nhận</button>
        </div>
      </div>
    `;
      })
      .join("");
  }

  // ========== APPROVE/REJECT EXPORT ==========
  window.openExportApprove = (id) => {
    const request = pendingExports.find((r) => r.id === id);
    if (!request) return;

    if (request.matchStatus === "matched") {
      // Đã khớp: cần nhập đủ 5 trường
      const donGiaXuat = prompt(
        "Nhập đơn giá xuất:",
        request.donGiaXuat || "0",
      );
      if (donGiaXuat === null) return;
      const soLuong = prompt("Nhập số lượng xuất:", request.soLuong || "1");
      if (soLuong === null) return;
      const soLot = prompt("Nhập số lot:", request.soLot || "");
      if (soLot === null) return;
      const ngayHetHan = prompt(
        "Nhập ngày hết hạn (YYYY-MM-DD):",
        request.ngayHetHan || "",
      );
      if (ngayHetHan === null) return;
      const soHopDongXuat = prompt(
        "Nhập số hợp đồng xuất:",
        request.soHopDongXuat || "",
      );
      if (soHopDongXuat === null) return;

      const numPrice = parseFloat(donGiaXuat.replace(/[^0-9]/g, "")) || 0;
      const numQty = parseInt(soLuong) || 0;

      if (numQty <= 0) {
        Utils.showToast("Vui lòng nhập số lượng hợp lệ", "error");
        return;
      }

      confirmExport(id, {
        donGiaXuat: numPrice,
        soLuong: numQty,
        soLot,
        ngayHetHan,
        soHopDongXuat,
      });
    } else {
      // Chưa khớp: duyệt trực tiếp
      if (!confirm("Sản phẩm chưa khớp với kho. Bạn có chắc muốn duyệt?"))
        return;
      confirmExport(id, {});
    }
  };

  async function confirmExport(id, extraData) {
    Utils.showLoading(true, "Đang xác nhận...");
    try {
      await fetch(`${API_BASE_URL}/export-requests/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify(extraData),
      });
      Utils.showToast("✅ Đã xác nhận đề nghị xuất kho");
      loadPendingExports();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi xác nhận", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  window.rejectExport = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await fetch(`${API_BASE_URL}/export-requests/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });
      Utils.showToast("Đã từ chối đề nghị xuất kho");
      loadPendingExports();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== USER MANAGEMENT ==========
  async function loadUsers() {
    const container = $("userTableBody");
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
    if (users.length === 0) {
      container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">Không có người dùng</td></tr>`;
      return;
    }

    container.innerHTML = users
      .map((user, idx) => {
        const perms = user.permissions || {};
        const permList = [];
        const fieldPermissions = [
          { key: "canEditTenThuongMai", label: "Tên TM" },
          { key: "canEditMaHang", label: "Mã hàng" },
          { key: "canEditDVT", label: "ĐVT" },
          { key: "canEditHangSX", label: "Hãng SX" },
          { key: "canEditPhanLoai", label: "Phân loại" },
          { key: "canEditGiaNhap", label: "Giá nhập" },
          { key: "canEditSoHopDongNhap", label: "Số HĐ nhập" },
          { key: "canEditSoHoaDonNhap", label: "Số HĐơn nhập" },
          { key: "canEditSoHoaDonXuat", label: "Số HĐơn xuất" },
          { key: "canEditNgayNhapHD", label: "Ngày nhập HĐ" },
          { key: "canEditNgayXuatHD", label: "Ngày xuất HĐ" },
          { key: "canEditGhiChu", label: "Ghi chú" },
        ];

        for (const f of fieldPermissions) {
          if (perms[f.key])
            permList.push(
              `<span class="permission-badge granted">${f.label}</span>`,
            );
        }
        if (perms.canCreateReceipt)
          permList.push(
            `<span class="permission-badge granted">📥 Nhập</span>`,
          );
        if (perms.canCreateExport)
          permList.push(
            `<span class="permission-badge granted">📤 Xuất</span>`,
          );
        if (perms.canViewAll)
          permList.push(`<span class="permission-badge granted">👁️ Xem</span>`);

        if (permList.length === 0)
          permList.push(
            `<span class="permission-badge denied">Không có</span>`,
          );

        // Không cho sửa chính mình hoặc user khác là quan_ly
        const isSelf = user.id === currentUser.id;
        const isManager = user.roleId === "quan_ly";

        return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${Utils.escapeHtml(user.username)}</strong></td>
        <td>${Utils.escapeHtml(user.fullName)}</td>
        <td>${Utils.escapeHtml(user.email || "—")}</td>
        <td><span class="status-badge ${user.roleId === "admin" ? "status-approved" : "status-pending"}">${user.roleId === "admin" ? "Admin" : "Quản lý"}</span></td>
        <td><span class="status-badge ${user.isActive ? "status-approved" : "status-rejected"}">${user.isActive ? "🟢 Hoạt động" : "🔴 Đã khóa"}</span></td>
        <td style="font-size:11px;">${permList.join(" ")}</td>
        <td>
          ${
            !isSelf && !isManager
              ? `
            <button class="action-btn edit" onclick="editUser(${user.id})"><i class="fas fa-edit"></i></button>
            <button class="action-btn lock" onclick="toggleUserLock(${user.id}, ${!user.isActive})"><i class="fas fa-${user.isActive ? "lock" : "lock-open"}"></i></button>
            <button class="action-btn delete" onclick="deleteUser(${user.id})"><i class="fas fa-trash"></i></button>
          `
              : isSelf
                ? `<span style="color:#6b82a0;font-size:11px;">(Bạn)</span>`
                : `<span style="color:#6b82a0;font-size:11px;">Quản lý</span>`
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
      $("userId").value = user.id;
      $("username").value = user.username;
      $("username").disabled = true;
      $("fullName").value = user.fullName;
      $("email").value = user.email || "";
      $("isActive").value = user.isActive ? "true" : "false";
      $("password").value = "";
      $("password").placeholder = "Để trống nếu không đổi";

      // Set permissions
      const perms = user.permissions || {};
      document.querySelectorAll(".perm-check").forEach((cb) => {
        cb.checked = !!perms[cb.dataset.field];
      });

      passwordGroup.querySelector("small").textContent =
        "Để trống nếu không đổi mật khẩu";
    } else {
      title.textContent = "Thêm người dùng";
      $("userId").value = "";
      $("username").value = "";
      $("username").disabled = false;
      $("fullName").value = "";
      $("email").value = "";
      $("isActive").value = "true";
      $("password").value = "";
      $("password").placeholder = "Nhập mật khẩu";
      passwordGroup.querySelector("small").textContent =
        "Nhập mật khẩu cho tài khoản mới";

      document
        .querySelectorAll(".perm-check")
        .forEach((cb) => (cb.checked = false));
    }

    modal.style.display = "flex";
  }

  async function saveUser() {
    const id = $("userId").value;
    const data = {
      username: $("username").value.trim(),
      fullName: $("fullName").value.trim(),
      email: $("email").value.trim(),
      isActive: $("isActive").value === "true",
      roleId: "admin",
    };

    if ($("password").value) {
      data.password = $("password").value;
    }

    // Collect permissions
    const permissions = {};
    document.querySelectorAll(".perm-check").forEach((cb) => {
      permissions[cb.dataset.field] = cb.checked;
    });
    data.permissions = permissions;

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

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify(data),
      });

      Utils.showToast(
        id ? "✅ Cập nhật thành công" : "✅ Tạo người dùng thành công",
      );
      closeModal("userModal");
      loadUsers();
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
    } catch (error) {
      Utils.showToast("Lỗi khi xóa", "error");
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

    // User modal
    $("btnAddUser")?.addEventListener("click", () => openUserModal());
    $("btnSaveUser")?.addEventListener("click", saveUser);

    // Close modals on overlay click
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

  // ========== INIT ==========
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboard();
  }

  init();
})();
