/**
 * ==================== MANAGER MODULE ====================
 * Quản lý - Duyệt các yêu cầu từ Admin
 */

(function () {
  "use strict";

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
    "pending-edits",
    "pending-deletions",
  ];

  let currentView = "dashboard";
  let pendingProducts = [];
  let pendingReceipts = [];
  let pendingExports = [];
  let pendingEdits = [];
  let pendingDeletions = [];

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
      "pending-products": "Sản phẩm chờ duyệt",
      "pending-receipts": "Nhập hàng chờ duyệt",
      "pending-exports": "Xuất kho chờ duyệt",
      "pending-edits": "Chỉnh sửa chờ duyệt",
      "pending-deletions": "Xóa sản phẩm chờ duyệt",
    };
    $("breadcrumb-title").textContent = titles[viewName] || viewName;

    if (viewName === "dashboard") loadDashboard();
    else if (viewName === "pending-products") loadPendingProducts();
    else if (viewName === "pending-receipts") loadPendingReceipts();
    else if (viewName === "pending-exports") loadPendingExports();
    else if (viewName === "pending-edits") loadPendingEdits();
    else if (viewName === "pending-deletions") loadPendingDeletions();
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
        $("statPendingEdits").textContent = data.pendingEdits || 0;
        $("statPendingDeletions").textContent = data.pendingDeletions || 0;

        $("badgeProducts").textContent = data.pendingProducts || 0;
        $("badgeReceipts").textContent = data.pendingReceipts || 0;
        $("badgeExports").textContent = data.pendingExports || 0;
        $("badgeEdits").textContent = data.pendingEdits || 0;
        $("badgeDeletions").textContent = data.pendingDeletions || 0;
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
      pendingProducts = await window.API.inventory.getPending();
      renderPendingProducts();
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
          <div><span class="label">ĐVT:</span> <span class="value">${Utils.escapeHtml(p.dvt || "—")}</span></div>
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
          <label style="display:flex;align-items:center;gap:8px;color:#e2eaf5;font-size:13px;">
            Số lượng tồn:
            <input type="number" class="tonKho-input" value="0" min="0" style="width:80px;padding:4px 8px;background:#1a2235;border:1px solid #1e2d45;border-radius:4px;color:#e2eaf5;">
          </label>
          <button class="btn btn-danger" onclick="rejectProduct(${p.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="approveProduct(${p.id})"><i class="fas fa-check"></i> Duyệt</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  window.approveProduct = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt sản phẩm này?")) return;

    const card = document.querySelector(
      `.approval-card:has([onclick="approveProduct(${id})"])`,
    );
    const tonKhoInput = card?.querySelector(".tonKho-input");
    const tonKho = parseInt(tonKhoInput?.value) || 0;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      await window.API.inventory.approve(id, tonKho);
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
      await window.API.inventory.reject(id, reason);
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
      pendingReceipts = await window.API.receiptRequest.getPending();
      renderPendingReceipts();
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
            <div><span class="label">ĐVT:</span> <span class="value">${Utils.escapeHtml(r.dvt || "—")}</span></div>
            <div><span class="label">Hãng SX:</span> <span class="value">${Utils.escapeHtml(r.hangSX || "—")}</span></div>
            <div><span class="label">Phân loại:</span> <span class="value">${Utils.escapeHtml(r.phanLoai || "—")}</span></div>
            <div><span class="label">Giá nhập:</span> <span class="value">${Utils.formatCurrency(r.giaNhap)}</span></div>
            <div><span class="label">Số lượng nhập:</span> <span class="value">${r.soLuongNhap || "Chưa nhập"}</span></div>
            ${isMatched ? `<div><span class="label">Trạng thái:</span> <span class="value" style="color:#34d399;">Chờ xác nhận số lượng</span></div>` : `<div><span class="label">Trạng thái:</span> <span class="value" style="color:#fbbf24;">Chờ duyệt</span></div>`}
          </div>
          <div class="approval-card-actions">
            <button class="btn btn-danger" onclick="rejectReceiptRequest(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
            <button class="btn btn-success" onclick="approveReceiptRequest(${r.id})"><i class="fas fa-check"></i> ${isMatched ? "Xác nhận" : "Duyệt"}</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  window.approveReceiptRequest = async (id) => {
    const request = pendingReceipts.find((r) => r.id === id);
    if (!request) return;

    let soLuongNhap = null;
    if (request.matchStatus === "matched") {
      const input = prompt("Nhập số lượng nhập:", request.soLuongNhap || "1");
      if (input === null) return;
      const num = parseInt(input);
      if (isNaN(num) || num <= 0) {
        Utils.showToast("Vui lòng nhập số lượng hợp lệ", "error");
        return;
      }
      soLuongNhap = num;
    }

    if (
      !confirm(
        `Bạn có chắc muốn ${request.matchStatus === "matched" ? "xác nhận" : "duyệt"} đề nghị nhập hàng này?`,
      )
    )
      return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.receiptRequest.approve(id, soLuongNhap);
      Utils.showToast(
        `✅ Đã ${request.matchStatus === "matched" ? "xác nhận" : "duyệt"} đề nghị nhập hàng`,
      );
      loadPendingReceipts();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi xử lý", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectReceiptRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.receiptRequest.reject(id, reason);
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
      pendingExports = await window.API.exportRequest.getPending();
      renderPendingExports();
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
            <div><span class="label">ĐVT:</span> <span class="value">${Utils.escapeHtml(r.dvt || "—")}</span></div>
            <div><span class="label">Hãng SX:</span> <span class="value">${Utils.escapeHtml(r.hangSX || "—")}</span></div>
            <div><span class="label">Phân loại:</span> <span class="value">${Utils.escapeHtml(r.phanLoai || "—")}</span></div>
            <div><span class="label">Giá nhập:</span> <span class="value">${Utils.formatCurrency(r.giaNhap)}</span></div>
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
            <button class="btn btn-danger" onclick="rejectExportRequest(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
            <button class="btn btn-success" onclick="approveExportRequest(${r.id})"><i class="fas fa-check"></i> ${isMatched ? "Xác nhận" : "Duyệt"}</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  window.approveExportRequest = async (id) => {
    const request = pendingExports.find((r) => r.id === id);
    if (!request) return;

    let extraData = {};

    if (request.matchStatus === "matched") {
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

      extraData = {
        donGiaXuat: numPrice,
        soLuong: numQty,
        soLot,
        ngayHetHan,
        soHopDongXuat,
      };
    }

    if (
      !confirm(
        `Bạn có chắc muốn ${request.matchStatus === "matched" ? "xác nhận" : "duyệt"} đề nghị xuất kho này?`,
      )
    )
      return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.exportRequest.approve(id, extraData);
      Utils.showToast(
        `✅ Đã ${request.matchStatus === "matched" ? "xác nhận" : "duyệt"} đề nghị xuất kho`,
      );
      loadPendingExports();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi xử lý", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectExportRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.exportRequest.reject(id, reason);
      Utils.showToast("Đã từ chối đề nghị xuất kho");
      loadPendingExports();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== LOAD PENDING EDITS ==========
  async function loadPendingEdits() {
    const container = $("pendingEditsList");
    Utils.showLoading(true, "Đang tải...");
    try {
      pendingEdits = await window.API.edit.getAllRequests("pending");
      renderPendingEdits();
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingEdits() {
    const container = $("pendingEditsList");
    if (pendingEdits.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu chỉnh sửa nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingEdits
      .map((r) => {
        const oldData = r.oldData || {};
        const newData = r.newData || {};
        const changedFields = [];
        for (const key in newData) {
          if (oldData[key] != newData[key]) {
            changedFields.push(
              `<div><span class="label">${key}:</span> <span style="color:#f87171;">${Utils.escapeHtml(String(oldData[key] || "—"))}</span> → <span style="color:#4ade80;">${Utils.escapeHtml(String(newData[key] || "—"))}</span></div>`,
            );
          }
        }

        return `
        <div class="approval-card">
          <div class="approval-card-header">
            <div class="approval-card-id">✏️ ${Utils.escapeHtml(r.productName)} (${Utils.escapeHtml(r.productCode)})</div>
            <div class="approval-card-date">${Utils.formatDate(r.createdAt)}</div>
            <div class="approval-card-creator">👤 ${Utils.escapeHtml(r.requesterName || "Admin")}</div>
          </div>
          <div class="approval-card-body">
            <div style="grid-column:1/-1; margin-bottom:8px;">
              <strong style="color:#fbbf24;">📝 Thay đổi:</strong>
            </div>
            ${changedFields.join("")}
          </div>
          <div class="approval-card-actions">
            <button class="btn btn-danger" onclick="rejectEditRequest(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
            <button class="btn btn-success" onclick="approveEditRequest(${r.id})"><i class="fas fa-check"></i> Duyệt</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  window.approveEditRequest = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu chỉnh sửa này?")) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.edit.approve(id);
      Utils.showToast("✅ Đã duyệt yêu cầu chỉnh sửa");
      loadPendingEdits();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectEditRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.edit.reject(id, reason);
      Utils.showToast("Đã từ chối yêu cầu chỉnh sửa");
      loadPendingEdits();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== LOAD PENDING DELETIONS ==========
  async function loadPendingDeletions() {
    const container = $("pendingDeletionsList");
    Utils.showLoading(true, "Đang tải...");
    try {
      pendingDeletions = await window.API.deletion.getAllRequests("pending");
      renderPendingDeletions();
    } catch (error) {
      Utils.showToast("Lỗi tải dữ liệu", "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingDeletions() {
    const container = $("pendingDeletionsList");
    if (pendingDeletions.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu xóa nào chờ duyệt</p></div>`;
      return;
    }

    container.innerHTML = pendingDeletions
      .map(
        (r) => `
      <div class="approval-card">
        <div class="approval-card-header">
          <div class="approval-card-id">🗑️ ${Utils.escapeHtml(r.productName)} (${Utils.escapeHtml(r.productCode)})</div>
          <div class="approval-card-date">${Utils.formatDate(r.createdAt)}</div>
          <div class="approval-card-creator">👤 ${Utils.escapeHtml(r.requesterName || "Admin")}</div>
        </div>
        <div class="approval-card-body">
          <div><span class="label">Tên sản phẩm:</span> <span class="value">${Utils.escapeHtml(r.productName)}</span></div>
          <div><span class="label">Mã hàng:</span> <span class="value">${Utils.escapeHtml(r.productCode)}</span></div>
          <div><span class="label">Dữ liệu hiện tại:</span></div>
          <div style="grid-column:1/-1; background:#1a2235; padding:8px; border-radius:4px; font-size:12px; color:#6b82a0;">
            ${JSON.stringify(r.productData, null, 2)}
          </div>
        </div>
        <div class="approval-card-actions">
          <button class="btn btn-danger" onclick="rejectDeletionRequest(${r.id})"><i class="fas fa-times"></i> Từ chối</button>
          <button class="btn btn-success" onclick="approveDeletionRequest(${r.id})"><i class="fas fa-check"></i> Duyệt</button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  window.approveDeletionRequest = async (id) => {
    if (
      !confirm(
        "Bạn có chắc muốn duyệt yêu cầu xóa này?\n\nHành động này sẽ xóa vĩnh viễn sản phẩm khỏi kho!",
      )
    )
      return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.deletion.approve(id);
      Utils.showToast("✅ Đã duyệt yêu cầu xóa và xóa sản phẩm khỏi kho");
      loadPendingDeletions();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi duyệt", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectDeletionRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      await window.API.deletion.reject(id, reason);
      Utils.showToast("Đã từ chối yêu cầu xóa");
      loadPendingDeletions();
      loadDashboard();
    } catch (error) {
      Utils.showToast("Lỗi khi từ chối", "error");
    } finally {
      Utils.showLoading(false);
    }
  };

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
  }

  // ========== INIT ==========
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboard();
  }

  // ========== EXPOSE GLOBALS ==========
  window.switchView = switchView;
  window.approveProduct = approveProduct;
  window.rejectProduct = rejectProduct;
  window.approveReceiptRequest = approveReceiptRequest;
  window.rejectReceiptRequest = rejectReceiptRequest;
  window.approveExportRequest = approveExportRequest;
  window.rejectExportRequest = rejectExportRequest;
  window.approveEditRequest = approveEditRequest;
  window.rejectEditRequest = rejectEditRequest;
  window.approveDeletionRequest = approveDeletionRequest;
  window.rejectDeletionRequest = rejectDeletionRequest;

  init();
})();
