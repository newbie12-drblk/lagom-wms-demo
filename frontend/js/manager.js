/**
 * ==================== MANAGER MODULE ====================
 * Quản lý - Duyệt các yêu cầu từ Admin + Quản lý người dùng
 * FIXED: Full logic + Nút hamburger hoạt động trên Mobile + Fix items is not defined
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

  const $ = (id) => document.getElementById(id);

  // ============================================================
  // BIẾN GLOBAL LƯU DỮ LIỆU PENDING
  // ============================================================
  window._pendingApprovals = [];
  window._pendingReceipts = [];
  window._pendingExports = [];
  window._pendingEdits = [];
  window._pendingDeletions = [];

  // ============================================================
  // HAMBURGER MENU - MỞ/ĐÓNG SIDEBAR TRÊN MOBILE
  // ============================================================
  window.toggleSidebar = function () {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");

    if (sidebar) {
      sidebar.classList.toggle("open");
    }
    if (overlay) {
      overlay.classList.toggle("active");
    }
  };

  window.closeSidebar = function () {
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");

    if (sidebar) {
      sidebar.classList.remove("open");
    }
    if (overlay) {
      overlay.classList.remove("active");
    }
  };

  // ============================================================
  // UPDATE TOPBAR
  // ============================================================
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

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        Auth.logout();
        window.location.href = "login.html";
      });
    }

    const dateEl = document.getElementById("currentDate");
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString("vi-VN");
    }
  }

  // ============================================================
  // SWITCH VIEW - CÓ XỬ LÝ NÚT BACK
  // ============================================================
  function switchView(viewName) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.remove("active");
    });

    const target = document.getElementById("view-" + viewName);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(function (item) {
      if (item.dataset.view === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    var titles = {
      dashboard: "Tổng quan",
      "pending-products": "Sản phẩm chờ duyệt",
      "pending-receipts": "Nhập hàng chờ duyệt",
      "pending-exports": "Xuất kho chờ duyệt",
      "pending-edits": "Chỉnh sửa chờ duyệt",
      "pending-deletions": "Xóa chờ duyệt",
      users: "Quản lý người dùng",
    };

    var breadcrumb = document.getElementById("breadcrumb-title");
    if (breadcrumb) breadcrumb.textContent = titles[viewName] || viewName;

    // Đóng sidebar trên mobile sau khi chuyển trang
    if (window.innerWidth <= 768) {
      window.closeSidebar();
    }

    // HIỂN THỊ NÚT BACK TRÊN MOBILE CHO CÁC TRANG PENDING
    var isMobile = window.innerWidth <= 768;
    var backButtons = document.querySelectorAll(".btn-mobile-back");
    var isPendingPage = [
      "pending-products",
      "pending-receipts",
      "pending-exports",
      "pending-edits",
      "pending-deletions",
    ].includes(viewName);

    backButtons.forEach(function (btn) {
      if (isMobile && isPendingPage) {
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.gap = "8px";
      } else {
        btn.style.display = "none";
      }
    });

    if (viewName === "dashboard") {
      loadDashboardStats();
      loadNotifications();
    } else if (viewName === "pending-products") {
      loadPendingApprovals();
    } else if (viewName === "pending-receipts") {
      loadPendingReceipts();
    } else if (viewName === "pending-exports") {
      loadPendingExports();
    } else if (viewName === "pending-edits") {
      loadPendingEdits();
    } else if (viewName === "pending-deletions") {
      loadPendingDeletions();
    } else if (viewName === "users") {
      loadUsers();
    }
  }

  // ============================================================
  // HÀM QUAY LẠI TỪ CÁC TRANG PENDING
  // ============================================================
  window.goBackFromPending = function () {
    switchView("dashboard");
  };

  // ============================================================
  // LOAD DASHBOARD STATS
  // ============================================================
  async function loadDashboardStats() {
    try {
      const token = API.getToken();
      const response = await fetch(API_BASE_URL + "/manager/dashboard/stats", {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await response.json();

      console.log("📊 Dashboard stats response:", result);

      if (result.success) {
        var data = result.data;

        var el = document.getElementById("statPendingProducts");
        if (el) el.textContent = data.pendingProducts || 0;

        el = document.getElementById("statPendingReceipts");
        if (el) el.textContent = data.pendingReceipts || 0;

        el = document.getElementById("statPendingExports");
        if (el) el.textContent = data.pendingExports || 0;

        el = document.getElementById("statPendingEdits");
        if (el) el.textContent = data.pendingEdits || 0;

        el = document.getElementById("statPendingDeletions");
        if (el) el.textContent = data.pendingDeletions || 0;

        el = document.getElementById("badgeProducts");
        if (el) el.textContent = data.pendingProducts || 0;

        el = document.getElementById("badgeReceipts");
        if (el) el.textContent = data.pendingReceipts || 0;

        el = document.getElementById("badgeExports");
        if (el) el.textContent = data.pendingExports || 0;

        el = document.getElementById("badgeEdits");
        if (el) el.textContent = data.pendingEdits || 0;

        el = document.getElementById("badgeDeletions");
        if (el) el.textContent = data.pendingDeletions || 0;
      }
    } catch (error) {
      console.error("Load dashboard stats error:", error);
    }
  }

  // ============================================================
  // LOAD NOTIFICATIONS
  // ============================================================
  async function loadNotifications() {
    try {
      const token = API.getToken();
      const response = await fetch(API_BASE_URL + "/notifications", {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await response.json();

      if (result.success) {
        var container = document.getElementById("recentNotifications");
        var notifications = result.data || [];

        var countEl = document.getElementById("notificationCount");
        if (countEl) countEl.textContent = result.unreadCount || 0;

        if (!container) return;

        if (notifications.length === 0) {
          container.innerHTML =
            '<div class="empty-state"><p>Không có thông báo</p></div>';
          return;
        }

        container.innerHTML = notifications
          .slice(0, 10)
          .map(function (n) {
            var icon =
              n.type === "approval" ? "📋" : n.type === "warning" ? "⚠️" : "ℹ️";
            var newBadge = !n.isRead
              ? '<span style="color:#3b82f6;font-size:10px;">● Mới</span>'
              : "";
            return `
            <div class="alert-row" style="padding: 10px 14px; border-bottom: 1px solid #1e2d45; display: flex; gap: 10px; align-items: flex-start;">
              <div style="font-size: 20px;">${icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(n.title)}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.escapeHtml(n.message)}</div>
                <div style="font-size: 10px; color: #374b66;">${Utils.formatDate(n.createdAt)}</div>
              </div>
              ${newBadge}
            </div>
          `;
          })
          .join("");
      }
    } catch (error) {
      console.error("Load notifications error:", error);
    }
  }

  // ============================================================
  // RENDER RECEIPT DETAIL - FIX LỖI items is not defined
  // ============================================================
  function renderReceiptDetail(receipt) {
    // ✅ KIỂM TRA receipt có tồn tại không
    if (!receipt) {
      return `
      <div style="padding: 20px; text-align: center; color: #f87171;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Không có dữ liệu phiếu nhập</p>
      </div>
    `;
    }

    // ✅ ĐẢM BẢO items luôn là mảng - QUAN TRỌNG NHẤT
    var items = [];
    if (receipt.items && Array.isArray(receipt.items)) {
      items = receipt.items;
    } else if (
      receipt.data &&
      receipt.data.items &&
      Array.isArray(receipt.data.items)
    ) {
      // Trường hợp dữ liệu nằm trong data.items
      items = receipt.data.items;
    } else if (
      receipt.productData &&
      receipt.productData.items &&
      Array.isArray(receipt.productData.items)
    ) {
      // Trường hợp dữ liệu nằm trong productData.items
      items = receipt.productData.items;
    }

    var totalValue = receipt.total || 0;

    var statusMap = {
      pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
      awaiting_confirmation: {
        class: "status-awaiting",
        text: "🔄 Chờ xác nhận",
      },
      approved: { class: "status-approved", text: "✅ Đã duyệt" },
      rejected: { class: "status-rejected", text: "❌ Từ chối" },
    };
    var status = statusMap[receipt.status] || statusMap["pending"];

    // ✅ TẠO BẢNG CHI TIẾT - KIỂM TRA items.length
    var itemsHtml = "";
    if (items && items.length > 0) {
      itemsHtml = `
      <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px; margin-top: 12px;">
        <table style="width:100%; border-collapse: collapse; font-size: 12px; background: #0f172a;">
          <thead>
            <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; white-space: nowrap;">STT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 130px;">TÊN THƯƠNG MẠI</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 90px;">MÃ HÀNG</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">QUY CÁCH</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">HÃNG/NƯỚC SX</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">ĐVT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">PHÂN LOẠI MÁY</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">GIÁ NHẬP</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">SL NHẬP</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">THÀNH TIỀN</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ HĐ</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ HĐƠN NHẬP</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY NHẬP HĐ</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ LOT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY HẾT HẠN</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(function (item, idx) {
                if (!item) return "";
                var expiryColor =
                  item.ngayHetHan && new Date(item.ngayHetHan) < new Date()
                    ? "#f87171"
                    : "#e2eaf5";
                return `
                  <tr style="border-bottom: 1px solid #1e2d45;">
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a;">${idx + 1}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(item.giaNhap || 0)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #86efac; font-weight: 600;">${item.soLuongNhap || 0}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.soHopDongNhap || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.soHoaDonNhap || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.formatDate(item.ngayNhapHD)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-family: monospace;">${Utils.escapeHtml(item.soLot || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: ${expiryColor};">${Utils.formatDate(item.ngayHetHan)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #6b82a0; font-style: italic;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
              <td colspan="9" style="padding: 8px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
              <td style="padding: 8px 12px; text-align: right; font-size: 15px; font-weight: 700; color: #fbbf24; font-family: monospace;">${Utils.formatCurrency(totalValue)}</td>
              <td colspan="6" style="padding: 8px 12px;"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    } else {
      itemsHtml = `
      <div style="padding:20px;text-align:center;color:#6b82a0;background:#0f172a;border-radius:8px;border:1px solid #1e2d45;margin-top:12px;">
        <i class="fas fa-box" style="font-size:24px;opacity:0.4;display:block;margin-bottom:8px;"></i>
        Không có sản phẩm trong phiếu này
      </div>
    `;
    }

    // ✅ PHẦN THÔNG TIN PHIẾU
    return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
      <div><span style="color: #6b82a0;">Số phiếu:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(receipt.receiptNo || "PN-" + receipt.id)}</span></div>
      <div><span style="color: #6b82a0;">Trạng thái:</span> <span class="status-badge ${status.class}" style="padding: 2px 10px;">${status.text}</span></div>
      <div><span style="color: #6b82a0;">Ngày tạo:</span> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.createdAt)}</span></div>
      <div><span style="color: #6b82a0;">Ngày nhập:</span> <span style="color: #e2eaf5;">${Utils.formatDate(receipt.receiptDate)}</span></div>
      <div><span style="color: #6b82a0;">Người tạo:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.creatorName || "Admin")}</span></div>
      <div><span style="color: #6b82a0;">Nhà cung cấp:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierName || "—")}</span></div>
      <div><span style="color: #6b82a0;">Địa chỉ NCC:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierAddress || "—")}</span></div>
      <div><span style="color: #6b82a0;">MST NCC:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.supplierTax || "—")}</span></div>
      <div><span style="color: #6b82a0;">Khách hàng:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerName || "—")}</span></div>
      <div><span style="color: #6b82a0;">Địa chỉ KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerAddress || "—")}</span></div>
      <div><span style="color: #6b82a0;">MST KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerTax || "—")}</span></div>
      <div><span style="color: #6b82a0;">Số HĐ KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(receipt.customerContract || "—")}</span></div>
      <div><span style="color: #6b82a0;">Tổng tiền:</span> <span style="color: #fbbf24; font-weight: 700;">${Utils.formatCurrency(totalValue)}</span></div>
    </div>
    ${itemsHtml}
  `;
  }

  // ============================================================
  // RENDER EXPORT DETAIL - FIX LỖI HIỂN THỊ BẢNG
  // ============================================================
  function renderExportDetail(exportItem) {
    // ✅ KIỂM TRA exportItem có tồn tại không
    if (!exportItem) {
      return `
      <div style="padding: 20px; text-align: center; color: #f87171;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Không có dữ liệu phiếu xuất</p>
      </div>
    `;
    }

    // ✅ ĐẢM BẢO items luôn là mảng
    var items = exportItem.items || [];
    var totalValue = exportItem.total || 0;

    var statusMap = {
      pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
      awaiting_confirmation: {
        class: "status-awaiting",
        text: "🔄 Chờ xác nhận",
      },
      approved: { class: "status-approved", text: "✅ Đã duyệt" },
      rejected: { class: "status-rejected", text: "❌ Từ chối" },
    };
    var status = statusMap[exportItem.status] || statusMap["pending"];

    // ✅ TẠO BẢNG CHI TIẾT - KIỂM TRA items.length
    var itemsHtml = "";
    if (items && items.length > 0) {
      itemsHtml = `
      <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px; margin-top: 12px;">
        <table style="width:100%; border-collapse: collapse; font-size: 12px; background: #0f172a;">
          <thead>
            <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700; white-space: nowrap;">STT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 130px;">TÊN THƯƠNG MẠI</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 90px;">MÃ HÀNG</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">QUY CÁCH</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">HÃNG/NƯỚC SX</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">ĐVT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">PHÂN LOẠI MÁY</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">ĐƠN GIÁ</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">SỐ LƯỢNG</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa; font-weight: 700;">THÀNH TIỀN</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">SỐ LOT</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa; font-weight: 700;">NGÀY HẾT HẠN</th>
              <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700;">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(function (item, idx) {
                if (!item) return "";
                var expiryColor =
                  item.ngayHetHan && new Date(item.ngayHetHan) < new Date()
                    ? "#f87171"
                    : "#e2eaf5";
                return `
                  <tr style="border-bottom: 1px solid #1e2d45;">
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a;">${idx + 1}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(item.donGia || 0)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #86efac; font-weight: 600;">${item.soLuong || 0}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #fbbf24; font-weight: 700; font-family: monospace;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-family: monospace;">${Utils.escapeHtml(item.soLot || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: ${expiryColor};">${Utils.formatDate(item.ngayHetHan)}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #6b82a0; font-style: italic;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
              <td colspan="9" style="padding: 8px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
              <td style="padding: 8px 12px; text-align: right; font-size: 15px; font-weight: 700; color: #fbbf24; font-family: monospace;">${Utils.formatCurrency(totalValue)}</td>
              <td colspan="3" style="padding: 8px 12px;"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    } else {
      itemsHtml = `
      <div style="padding:20px;text-align:center;color:#6b82a0;background:#0f172a;border-radius:8px;border:1px solid #1e2d45;margin-top:12px;">
        <i class="fas fa-box" style="font-size:24px;opacity:0.4;display:block;margin-bottom:8px;"></i>
        Không có sản phẩm trong phiếu này
      </div>
    `;
    }

    return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
      <div><span style="color: #6b82a0;">Số phiếu:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(exportItem.exportNo || "PX-" + exportItem.id)}</span></div>
      <div><span style="color: #6b82a0;">Trạng thái:</span> <span class="status-badge ${status.class}" style="padding: 2px 10px;">${status.text}</span></div>
      <div><span style="color: #6b82a0;">Ngày tạo:</span> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.createdAt)}</span></div>
      <div><span style="color: #6b82a0;">Ngày xuất:</span> <span style="color: #e2eaf5;">${Utils.formatDate(exportItem.exportDate)}</span></div>
      <div><span style="color: #6b82a0;">Người tạo:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.creatorName || "Admin")}</span></div>
      <div><span style="color: #6b82a0;">Người nhận:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.receiverName || "—")}</span></div>
      <div><span style="color: #6b82a0;">Khách hàng:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerName || "—")}</span></div>
      <div><span style="color: #6b82a0;">Địa chỉ KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerAddress || "—")}</span></div>
      <div><span style="color: #6b82a0;">MST KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerTax || "—")}</span></div>
      <div><span style="color: #6b82a0;">Số HĐ KH:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.customerContract || "—")}</span></div>
      <div><span style="color: #6b82a0;">Lý do xuất:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(exportItem.exportReason || "—")}</span></div>
      <div><span style="color: #6b82a0;">Tổng tiền:</span> <span style="color: #fbbf24; font-weight: 700;">${Utils.formatCurrency(totalValue)}</span></div>
    </div>
    ${itemsHtml}
  `;
  }

  // ============================================================
  // RENDER INVENTORY DETAIL
  // ============================================================
  function renderInventoryDetail(product) {
    if (!product) {
      return '<div style="padding:20px;text-align:center;color:#6b82a0;">Không có dữ liệu</div>';
    }

    var expiryColor =
      product.ngayHetHan && new Date(product.ngayHetHan) < new Date()
        ? "#f87171"
        : "#e2eaf5";
    var stockColor = (product.tonKho || 0) === 0 ? "#f87171" : "#4ade80";

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px;">
        <div><span style="color: #6b82a0;">Tên thương mại:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(product.tenThuongMai || "—")}</span></div>
        <div><span style="color: #6b82a0;">Mã hàng:</span> <span style="color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(product.maHang || "—")}</span></div>
        <div><span style="color: #6b82a0;">Quy cách:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.quyCach || "—")}</span></div>
        <div><span style="color: #6b82a0;">Hãng SX:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.hangSX || "—")}</span></div>
        <div><span style="color: #6b82a0;">ĐVT:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.dvt || "—")}</span></div>
        <div><span style="color: #6b82a0;">Phân loại:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.phanLoai || "—")}</span></div>
        <div><span style="color: #6b82a0;">Giá nhập:</span> <span style="color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(product.giaNhap || 0)}</span></div>
        <div><span style="color: #6b82a0;">SL nhập:</span> <span style="color: #86efac; font-weight: 600;">${product.soLuongNhap || 0}</span></div>
        <div><span style="color: #6b82a0;">Số HĐ:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.soHopDongNhap || "—")}</span></div>
        <div><span style="color: #6b82a0;">Số HĐơn nhập:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.soHoaDonNhap || "—")}</span></div>
        <div><span style="color: #6b82a0;">Ngày nhập HĐ:</span> <span style="color: #e2eaf5;">${Utils.formatDate(product.ngayNhapHD)}</span></div>
        <div><span style="color: #6b82a0;">Số lot:</span> <span style="color: #e2eaf5; font-family: monospace;">${Utils.escapeHtml(product.soLot || "—")}</span></div>
        <div><span style="color: #6b82a0;">Ngày hết hạn:</span> <span style="color: ${expiryColor};">${Utils.formatDate(product.ngayHetHan)}</span></div>
        <div><span style="color: #6b82a0;">SL xuất:</span> <span style="color: #e2eaf5;">${product.soLuongXuat || 0}</span></div>
        <div><span style="color: #6b82a0;">Giá xuất:</span> <span style="color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(product.giaXuat || 0)}</span></div>
        <div><span style="color: #6b82a0;">Số HĐ xuất:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.soHopDongXuat || "—")}</span></div>
        <div><span style="color: #6b82a0;">Số HĐơn xuất:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.soHoaDonXuat || "—")}</span></div>
        <div><span style="color: #6b82a0;">Ngày xuất:</span> <span style="color: #e2eaf5;">${Utils.formatDate(product.ngayXuatHD)}</span></div>
        <div><span style="color: #6b82a0;">Tồn cuối:</span> <span style="color: ${stockColor}; font-weight: 700;">${product.tonKho || 0}</span></div>
        <div><span style="color: #6b82a0;">Công nợ:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(product.congNo || "—")}</span></div>
        <div><span style="color: #6b82a0;">Ghi chú:</span> <span style="color: #6b82a0; font-style: italic;">${Utils.escapeHtml(product.ghiChu || "—")}</span></div>
      </div>
    `;
  }

  // ============================================================
  // LOAD PENDING APPROVALS
  // ============================================================
  async function loadPendingReceipts() {
    var container = document.getElementById("pendingReceiptsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải phiếu nhập...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/receipts/pending", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("📥 Receipts response:", result);

      if (result.success) {
        var receipts = result.data || [];

        // ✅ ĐẢM BẢO MỖI RECEIPT ĐỀU CÓ items LÀ MẢNG
        receipts = receipts.map(function (r) {
          // Kiểm tra nhiều cấu trúc dữ liệu khác nhau
          if (!r.items) {
            r.items = [];
          }
          // Nếu items là object thì chuyển thành array
          if (
            r.items &&
            typeof r.items === "object" &&
            !Array.isArray(r.items)
          ) {
            r.items = Object.values(r.items);
          }
          // Đảm bảo các trường khác có giá trị mặc định
          if (!r.total) r.total = 0;
          if (!r.receiptNo) r.receiptNo = "PN-" + r.id;
          if (!r.status) r.status = "pending";
          return r;
        });

        window._pendingReceipts = receipts;

        if (receipts.length === 0) {
          container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-check-circle"></i>
            <p>Không có đề nghị nhập hàng nào chờ duyệt</p>
          </div>
        `;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = receipts
          .map(function (r) {
            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #f59e0b; background: #111827; border-radius: 12px; padding: 16px 20px; cursor: pointer;" 
                 onclick="window.viewReceiptDetail(${r.id})">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">📥 ${Utils.escapeHtml(r.receiptNo)}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">⏳ Chờ duyệt</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 8px 12px; border-radius: 6px;">
                <div><span style="color: #6b82a0; font-size: 11px;">Nhà cung cấp</span><br><span style="color: #e2eaf5;">${Utils.escapeHtml(r.supplierName || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Số sản phẩm</span><br><span style="color: #86efac; font-weight: 600;">${r.items ? r.items.length : 0}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Tổng tiền</span><br><span style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.total || 0)}</span></div>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #6b82a0; text-align: right;">
                <i class="fas fa-eye"></i> Nhấn để xem chi tiết & duyệt
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML =
          '<div class="empty-state"><p>Lỗi tải dữ liệu: ' +
          (result.message || "") +
          "</p></div>";
      }
    } catch (error) {
      console.error("Load pending receipts error:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Lỗi: ' + error.message + "</p></div>";
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // VIEW APPROVAL DETAIL
  // ============================================================
  window.viewApprovalDetail = function (id) {
    var container = document.getElementById("pendingApprovalsList");
    if (!container) return;

    var request = window._pendingApprovals.find(function (r) {
      return r.id === id;
    });

    if (!request) {
      Utils.showToast(
        "Không tìm thấy dữ liệu, vui lòng tải lại trang",
        "error",
      );
      return;
    }

    var products = request.productData?.products || [];
    var itemsHtml = "";
    if (products.length > 0) {
      itemsHtml = `
        <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px; margin-top: 12px;">
          <table style="width:100%; border-collapse: collapse; font-size: 12px; background: #0f172a;">
            <thead>
              <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: center; color: #60a5fa;">STT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; min-width: 130px;">TÊN THƯƠNG MẠI</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; min-width: 90px;">MÃ HÀNG</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">ĐVT</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">HÃNG SX</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa;">PHÂN LOẠI</th>
                <th style="padding: 8px 10px; border: 1px solid #1e2d45; text-align: right; color: #60a5fa;">GIÁ NHẬP</th>
              </tr>
            </thead>
            <tbody>
              ${products
                .map(function (item, idx) {
                  return `
                  <tr style="border-bottom: 1px solid #1e2d45;">
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: center; color: #e2eaf5; background: #0a0f1a;">${idx + 1}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #93c5fd; font-family: monospace;">${Utils.escapeHtml(item.maHang || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                    <td style="padding: 6px 10px; border: 1px solid #1e2d45; text-align: right; color: #93c5fd; font-family: monospace;">${Utils.formatCurrency(item.giaNhap || 0)}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    var html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
        <div><span style="color: #6b82a0;">Số sản phẩm:</span> <span style="color: #86efac; font-weight: 600;">${products.length}</span></div>
        <div><span style="color: #6b82a0;">Người yêu cầu:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(request.requesterName || "Admin")}</span></div>
        <div><span style="color: #6b82a0;">Ngày tạo:</span> <span style="color: #e2eaf5;">${Utils.formatDate(request.createdAt)}</span></div>
        <div><span style="color: #6b82a0;">Trạng thái:</span> <span class="status-badge status-pending">⏳ Chờ duyệt</span></div>
      </div>
      ${itemsHtml}
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-danger" onclick="window.rejectApproval(${request.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-times"></i> Từ chối
        </button>
        <button class="btn btn-success" onclick="window.approveApproval(${request.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-check"></i> Duyệt
        </button>
      </div>
    `;

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-outline" onclick="window.loadPendingApprovals()" style="margin-bottom: 16px;">
          <i class="fas fa-arrow-left"></i> Quay lại danh sách
        </button>
        <div class="approval-card" style="background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #8b5cf6;">
          ${html}
        </div>
      </div>
    `;
  };

  // ============================================================
  // APPROVE / REJECT APPROVAL
  // ============================================================
  window.approveApproval = async function (id) {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu thêm sản phẩm này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      var token = API.getToken();
      var response = await fetch(
        API_BASE_URL + "/approvals/" + id + "/approve",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        },
      );
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt yêu cầu! Sản phẩm đã được thêm vào kho.");
        await loadPendingApprovals();
        await loadDashboardStats();
        if (typeof window.refreshInventoryData === "function") {
          await window.refreshInventoryData();
        }
        if (typeof window.initHome === "function") {
          await window.initHome();
        }
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectApproval = async function (id) {
    var reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(
        API_BASE_URL + "/approvals/" + id + "/reject",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ reason: reason }),
        },
      );
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu!");
        await loadPendingApprovals();
        await loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ============================================================
  // LOAD PENDING RECEIPTS
  // ============================================================
  async function loadPendingReceipts() {
    var container = document.getElementById("pendingReceiptsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải phiếu nhập...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/receipts/pending", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("📥 Receipts response:", result);

      if (result.success) {
        var receipts = result.data || [];

        // ✅ ĐẢM BẢO MỖI RECEIPT ĐỀU CÓ items LÀ MẢNG
        receipts = receipts.map(function (r) {
          if (!r.items) {
            r.items = [];
          }
          return r;
        });

        window._pendingReceipts = receipts;

        if (receipts.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-check-circle"></i>
              <p>Không có đề nghị nhập hàng nào chờ duyệt</p>
            </div>
          `;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = receipts
          .map(function (r) {
            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #f59e0b; background: #111827; border-radius: 12px; padding: 16px 20px; cursor: pointer;" 
                 onclick="window.viewReceiptDetail(${r.id})">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">📥 ${Utils.escapeHtml(r.receiptNo || "PN-" + r.id)}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">⏳ Chờ duyệt</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 8px 12px; border-radius: 6px;">
                <div><span style="color: #6b82a0; font-size: 11px;">Nhà cung cấp</span><br><span style="color: #e2eaf5;">${Utils.escapeHtml(r.supplierName || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Số sản phẩm</span><br><span style="color: #86efac; font-weight: 600;">${r.items?.length || 0}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Tổng tiền</span><br><span style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.total || 0)}</span></div>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #6b82a0; text-align: right;">
                <i class="fas fa-eye"></i> Nhấn để xem chi tiết & duyệt
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML =
          '<div class="empty-state"><p>Lỗi tải dữ liệu: ' +
          (result.message || "") +
          "</p></div>";
      }
    } catch (error) {
      console.error("Load pending receipts error:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Lỗi: ' + error.message + "</p></div>";
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // VIEW RECEIPT DETAIL - FIX LỖI items is not defined
  // ============================================================
  window.viewReceiptDetail = function (id) {
    var container = document.getElementById("pendingReceiptsList");
    if (!container) return;

    var receipt = window._pendingReceipts.find(function (r) {
      return r.id === id;
    });

    if (!receipt) {
      Utils.showToast(
        "Không tìm thấy dữ liệu, vui lòng tải lại trang",
        "error",
      );
      return;
    }

    // ✅ ĐẢM BẢO receipt.items luôn là mảng
    if (!receipt.items) {
      receipt.items = [];
    }

    // ✅ ĐẢM BẢO receipt có các trường cần thiết
    if (!receipt.receiptNo) {
      receipt.receiptNo = "PN-" + receipt.id;
    }
    if (!receipt.total) {
      receipt.total = 0;
    }
    if (!receipt.status) {
      receipt.status = "pending";
    }

    var html = renderReceiptDetail(receipt);
    html += `
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
      <button class="btn btn-danger" onclick="window.rejectReceipt(${receipt.id})" style="padding: 8px 20px; font-size: 13px;">
        <i class="fas fa-times"></i> Từ chối
      </button>
      <button class="btn btn-success" onclick="window.approveReceipt(${receipt.id})" style="padding: 8px 20px; font-size: 13px;">
        <i class="fas fa-check"></i> Duyệt
      </button>
    </div>
  `;

    container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <button class="btn btn-outline" onclick="window.loadPendingReceipts()" style="margin-bottom: 16px;">
        <i class="fas fa-arrow-left"></i> Quay lại danh sách
      </button>
      <div class="approval-card" style="background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #f59e0b;">
        ${html}
      </div>
    </div>
  `;
  };

  // ============================================================
  // APPROVE / REJECT RECEIPT
  // ============================================================
  window.approveReceipt = async function (id) {
    if (!confirm("Bạn có chắc muốn duyệt phiếu nhập này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/receipts/" + id + "/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu nhập!");
        await loadPendingReceipts();
        await loadDashboardStats();
        if (typeof window.refreshInventoryData === "function") {
          await window.refreshInventoryData();
        }
        if (typeof window.initHome === "function") {
          await window.initHome();
        }
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectReceipt = async function (id) {
    var reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/receipts/" + id + "/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu nhập!");
        await loadPendingReceipts();
        await loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ============================================================
  // LOAD PENDING EXPORTS
  // ============================================================
  async function loadPendingExports() {
    var container = document.getElementById("pendingExportsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải phiếu xuất...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/exports/pending", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("📤 Exports response:", result);

      if (result.success) {
        var exports = result.data || [];

        // ✅ ĐẢM BẢO MỖI EXPORT ĐỀU CÓ items LÀ MẢNG
        exports = exports.map(function (r) {
          if (!r.items) {
            r.items = [];
          }
          return r;
        });

        window._pendingExports = exports;

        if (exports.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-check-circle"></i>
              <p>Không có đề nghị xuất kho nào chờ duyệt</p>
            </div>
          `;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = exports
          .map(function (r) {
            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #3b82f6; background: #111827; border-radius: 12px; padding: 16px 20px; cursor: pointer;" 
                 onclick="window.viewExportDetail(${r.id})">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">📤 ${Utils.escapeHtml(r.exportNo || "PX-" + r.id)}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">⏳ Chờ duyệt</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 8px 12px; border-radius: 6px;">
                <div><span style="color: #6b82a0; font-size: 11px;">Người nhận</span><br><span style="color: #e2eaf5;">${Utils.escapeHtml(r.receiverName || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Số sản phẩm</span><br><span style="color: #86efac; font-weight: 600;">${r.items?.length || 0}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Tổng tiền</span><br><span style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.total || 0)}</span></div>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #6b82a0; text-align: right;">
                <i class="fas fa-eye"></i> Nhấn để xem chi tiết & duyệt
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML =
          '<div class="empty-state"><p>Lỗi tải dữ liệu: ' +
          (result.message || "") +
          "</p></div>";
      }
    } catch (error) {
      console.error("Load pending exports error:", error);
      container.innerHTML =
        '<div class="empty-state"><p>Lỗi: ' + error.message + "</p></div>";
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // VIEW EXPORT DETAIL - FIX LỖI items is not defined
  // ============================================================
  window.viewExportDetail = function (id) {
    var container = document.getElementById("pendingExportsList");
    if (!container) return;

    var exportItem = window._pendingExports.find(function (r) {
      return r.id === id;
    });

    if (!exportItem) {
      Utils.showToast(
        "Không tìm thấy dữ liệu, vui lòng tải lại trang",
        "error",
      );
      return;
    }

    // ✅ ĐẢM BẢO exportItem.items là mảng
    if (!exportItem.items) {
      exportItem.items = [];
    }

    var html = renderExportDetail(exportItem);
    html += `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-danger" onclick="window.rejectExport(${exportItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-times"></i> Từ chối
        </button>
        <button class="btn btn-success" onclick="window.approveExport(${exportItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-check"></i> Duyệt
        </button>
      </div>
    `;

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-outline" onclick="window.loadPendingExports()" style="margin-bottom: 16px;">
          <i class="fas fa-arrow-left"></i> Quay lại danh sách
        </button>
        <div class="approval-card" style="background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #3b82f6;">
          ${html}
        </div>
      </div>
    `;
  };

  // ============================================================
  // APPROVE / REJECT EXPORT
  // ============================================================
  window.approveExport = async function (id) {
    if (!confirm("Bạn có chắc muốn duyệt phiếu xuất này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/exports/" + id + "/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu xuất!");
        await loadPendingExports();
        await loadDashboardStats();
        if (typeof window.refreshInventoryData === "function") {
          await window.refreshInventoryData();
        }
        if (typeof window.initHome === "function") {
          await window.initHome();
        }
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectExport = async function (id) {
    var reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/exports/" + id + "/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu xuất!");
        await loadPendingExports();
        await loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ============================================================
  // LOAD PENDING EDITS
  // ============================================================
  async function loadPendingEdits() {
    var container = document.getElementById("pendingEditsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu chỉnh sửa...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/edits", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("✏️ Pending edits:", result);

      if (result.success) {
        var edits = result.data || [];
        var pendingEdits = edits.filter(function (e) {
          return e.status === "pending";
        });

        window._pendingEdits = pendingEdits;

        if (pendingEdits.length === 0) {
          container.innerHTML =
            '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu chỉnh sửa nào</p></div>';
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = pendingEdits
          .map(function (r) {
            var oldData = r.oldData || {};
            var newData = r.newData || {};

            var fieldLabels = {
              tenThuongMai: "Tên thương mại",
              maHang: "Mã hàng",
              dvt: "ĐVT",
              hangSX: "Hãng/Nước SX",
              phanLoai: "Phân loại máy",
              giaNhap: "Giá nhập",
              soHopDongNhap: "Số HĐ",
            };

            var allowedFields = Object.keys(fieldLabels);
            var changedFields = allowedFields.filter(function (key) {
              return (oldData[key] || "") != (newData[key] || "");
            });

            if (changedFields.length === 0) {
              changedFields = allowedFields;
            }

            var previewFields = changedFields.slice(0, 2);
            var previewHtml = previewFields
              .map(function (key) {
                var oldVal = oldData[key] || "—";
                var newVal = newData[key] || "—";
                if (key === "giaNhap") {
                  oldVal = Utils.formatCurrency(parseFloat(oldVal) || 0);
                  newVal = Utils.formatCurrency(parseFloat(newVal) || 0);
                }
                return (
                  '<span style="color: #6b82a0;">' +
                  fieldLabels[key] +
                  ':</span> <span style="color: #f87171;">' +
                  Utils.escapeHtml(String(oldVal)) +
                  '</span> → <span style="color: #4ade80;">' +
                  Utils.escapeHtml(String(newVal)) +
                  "</span>"
                );
              })
              .join(" &nbsp;|&nbsp; ");

            return `
            <div class="approval-card" style="margin-bottom: 16px; background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #8b5cf6; cursor: pointer;" 
                 onclick="window.viewEditDetail(${r.id})">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #a78bfa;">✏️ Yêu cầu chỉnh sửa #${r.id}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">⏳ Chờ duyệt</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px;">
                <div><span style="color: #6b82a0; font-size: 11px;">Sản phẩm</span><br><span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(r.productName || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Mã hàng</span><br><span style="color: #93c5fd; font-weight: 600;">${Utils.escapeHtml(r.productCode || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Người tạo</span><br><span style="color: #e2eaf5;">${Utils.escapeHtml(r.requesterName || "Admin")}</span></div>
              </div>
              <div style="font-size: 12px; color: #e2eaf5; padding: 6px 0;">
                ${previewHtml}
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: #6b82a0; text-align: right;">
                <i class="fas fa-eye"></i> Nhấn để xem chi tiết & duyệt
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML =
          '<div class="empty-state"><p>Lỗi: ' +
          (result.message || "") +
          "</p></div>";
      }
    } catch (error) {
      container.innerHTML =
        '<div class="empty-state"><p>Lỗi: ' + error.message + "</p></div>";
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // VIEW EDIT DETAIL
  // ============================================================
  window.viewEditDetail = function (id) {
    var container = document.getElementById("pendingEditsList");
    if (!container) return;

    var editItem = window._pendingEdits.find(function (r) {
      return r.id === id;
    });

    if (!editItem) {
      Utils.showToast(
        "Không tìm thấy dữ liệu, vui lòng tải lại trang",
        "error",
      );
      return;
    }

    var oldData = editItem.oldData || {};
    var newData = editItem.newData || {};

    var fieldLabels = {
      tenThuongMai: "Tên thương mại",
      maHang: "Mã hàng",
      dvt: "ĐVT",
      hangSX: "Hãng/Nước SX",
      phanLoai: "Phân loại máy",
      giaNhap: "Giá nhập",
      soHopDongNhap: "Số HĐ",
    };

    var allowedFields = Object.keys(fieldLabels);
    var changedFields = allowedFields.filter(function (key) {
      return (oldData[key] || "") != (newData[key] || "");
    });

    if (changedFields.length === 0) {
      changedFields = allowedFields;
    }

    var changesHtml = `
      <div style="overflow-x: auto; border: 1px solid #1e2d45; border-radius: 8px; margin-top: 12px;">
        <table style="width:100%; border-collapse: collapse; font-size: 13px; background: #0f172a;">
          <thead>
            <tr style="background: #1a2235; border-bottom: 2px solid #3b82f6;">
              <th style="padding: 10px 14px; border: 1px solid #1e2d45; text-align: left; color: #60a5fa; font-weight: 700; min-width: 150px;">TRƯỜNG</th>
              <th style="padding: 10px 14px; border: 1px solid #1e2d45; text-align: left; color: #f87171; font-weight: 600; min-width: 150px;">GIÁ TRỊ CŨ</th>
              <th style="padding: 10px 14px; border: 1px solid #1e2d45; text-align: left; color: #4ade80; font-weight: 600; min-width: 150px;">GIÁ TRỊ MỚI</th>
            </tr>
          </thead>
          <tbody>
            ${changedFields
              .map(function (key) {
                var oldVal = oldData[key] || "—";
                var newVal = newData[key] || "—";
                if (key === "giaNhap") {
                  oldVal = Utils.formatCurrency(parseFloat(oldVal) || 0);
                  newVal = Utils.formatCurrency(parseFloat(newVal) || 0);
                }
                return `
                <tr style="border-bottom: 1px solid #1e2d45;">
                  <td style="padding: 8px 14px; border: 1px solid #1e2d45; color: #e2eaf5; font-weight: 600;">${fieldLabels[key] || key}</td>
                  <td style="padding: 8px 14px; border: 1px solid #1e2d45; color: #f87171;">${Utils.escapeHtml(String(oldVal))}</td>
                  <td style="padding: 8px 14px; border: 1px solid #1e2d45; color: #4ade80; font-weight: 600;">${Utils.escapeHtml(String(newVal))}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    var html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
        <div><span style="color: #6b82a0;">Sản phẩm:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(editItem.productName || "—")}</span></div>
        <div><span style="color: #6b82a0;">Mã hàng:</span> <span style="color: #93c5fd; font-weight: 600;">${Utils.escapeHtml(editItem.productCode || "—")}</span></div>
        <div><span style="color: #6b82a0;">Người yêu cầu:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(editItem.requesterName || "Admin")}</span></div>
        <div><span style="color: #6b82a0;">Ngày tạo:</span> <span style="color: #e2eaf5;">${Utils.formatDate(editItem.createdAt)}</span></div>
      </div>
      ${changesHtml}
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-danger" onclick="window.rejectEditRequest(${editItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-times"></i> Từ chối
        </button>
        <button class="btn btn-success" onclick="window.approveEditRequest(${editItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-check"></i> Duyệt
        </button>
      </div>
    `;

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-outline" onclick="window.loadPendingEdits()" style="margin-bottom: 16px;">
          <i class="fas fa-arrow-left"></i> Quay lại danh sách
        </button>
        <div class="approval-card" style="background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #8b5cf6;">
          ${html}
        </div>
      </div>
    `;
  };

  // ============================================================
  // APPROVE / REJECT EDIT
  // ============================================================
  window.approveEditRequest = async function (id) {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu chỉnh sửa này?")) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/edits/" + id + "/approve", {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt yêu cầu chỉnh sửa!");
        await loadPendingEdits();
        await loadDashboardStats();
        if (typeof window.refreshInventoryData === "function") {
          await window.refreshInventoryData();
        }
        if (typeof window.initHome === "function") {
          await window.initHome();
        }
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectEditRequest = async function (id) {
    var reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/edits/" + id + "/reject", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ reason: reason }),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu chỉnh sửa!");
        await loadPendingEdits();
        await loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ============================================================
  // LOAD PENDING DELETIONS
  // ============================================================
  async function loadPendingDeletions() {
    var container = document.getElementById("pendingDeletionsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu xóa...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/deletions", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("🗑️ Pending deletions:", result);

      if (result.success) {
        var deletions = result.data || [];
        var pendingDeletions = deletions.filter(function (d) {
          return d.status === "pending";
        });

        window._pendingDeletions = pendingDeletions;

        if (pendingDeletions.length === 0) {
          container.innerHTML =
            '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu xóa nào</p></div>';
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = pendingDeletions
          .map(function (r) {
            return `
            <div class="approval-card" style="margin-bottom: 16px; background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #ef4444; cursor: pointer;" 
                 onclick="window.viewDeletionDetail(${r.id})">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: #f87171;">🗑️ Yêu cầu xóa sản phẩm #${r.id}</div>
                <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">⏳ Chờ duyệt</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 8px 12px; border-radius: 6px;">
                <div><span style="color: #6b82a0; font-size: 11px;">Sản phẩm</span><br><span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(r.productName || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Mã hàng</span><br><span style="color: #93c5fd; font-weight: 600;">${Utils.escapeHtml(r.productCode || "—")}</span></div>
                <div><span style="color: #6b82a0; font-size: 11px;">Người yêu cầu</span><br><span style="color: #e2eaf5;">${Utils.escapeHtml(r.requesterName || "Admin")}</span></div>
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: #f87171; text-align: right;">
                ⚠️ Sẽ bị xóa vĩnh viễn
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML =
          '<div class="empty-state"><p>Lỗi: ' +
          (result.message || "") +
          "</p></div>";
      }
    } catch (error) {
      container.innerHTML =
        '<div class="empty-state"><p>Lỗi: ' + error.message + "</p></div>";
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // VIEW DELETION DETAIL
  // ============================================================
  window.viewDeletionDetail = function (id) {
    var container = document.getElementById("pendingDeletionsList");
    if (!container) return;

    var deletionItem = window._pendingDeletions.find(function (r) {
      return r.id === id;
    });

    if (!deletionItem) {
      Utils.showToast(
        "Không tìm thấy dữ liệu, vui lòng tải lại trang",
        "error",
      );
      return;
    }

    var productData = deletionItem.productData || {};

    var html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px 16px; background: #0f172a; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
        <div><span style="color: #6b82a0;">Sản phẩm:</span> <span style="color: #60a5fa; font-weight: 600;">${Utils.escapeHtml(deletionItem.productName || "—")}</span></div>
        <div><span style="color: #6b82a0;">Mã hàng:</span> <span style="color: #93c5fd; font-weight: 600;">${Utils.escapeHtml(deletionItem.productCode || "—")}</span></div>
        <div><span style="color: #6b82a0;">Người yêu cầu:</span> <span style="color: #e2eaf5;">${Utils.escapeHtml(deletionItem.requesterName || "Admin")}</span></div>
        <div><span style="color: #6b82a0;">Ngày tạo:</span> <span style="color: #e2eaf5;">${Utils.formatDate(deletionItem.createdAt)}</span></div>
      </div>
      ${renderInventoryDetail(productData)}
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-danger" onclick="window.rejectDeletionRequest(${deletionItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-times"></i> Từ chối
        </button>
        <button class="btn btn-success" onclick="window.approveDeletionRequest(${deletionItem.id})" style="padding: 8px 20px; font-size: 13px;">
          <i class="fas fa-check"></i> Duyệt xóa
        </button>
      </div>
    `;

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-outline" onclick="window.loadPendingDeletions()" style="margin-bottom: 16px;">
          <i class="fas fa-arrow-left"></i> Quay lại danh sách
        </button>
        <div class="approval-card" style="background: #111827; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #ef4444;">
          ${html}
        </div>
      </div>
    `;
  };

  // ============================================================
  // APPROVE / REJECT DELETION
  // ============================================================
  window.approveDeletionRequest = async function (id) {
    if (
      !confirm(
        "Bạn có chắc muốn duyệt xóa sản phẩm này? Hành động này KHÔNG thể hoàn tác!",
      )
    )
      return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(
        API_BASE_URL + "/deletions/" + id + "/approve",
        {
          method: "PUT",
          headers: { Authorization: "Bearer " + token },
        },
      );
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt xóa sản phẩm!");
        await loadPendingDeletions();
        await loadDashboardStats();
        if (typeof window.refreshInventoryData === "function") {
          await window.refreshInventoryData();
        }
        if (typeof window.initHome === "function") {
          await window.initHome();
        }
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectDeletionRequest = async function (id) {
    var reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      var token = API.getToken();
      var response = await fetch(
        API_BASE_URL + "/deletions/" + id + "/reject",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ reason: reason }),
        },
      );
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu xóa!");
        await loadPendingDeletions();
        await loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ============================================================
  // QUẢN LÝ NGƯỜI DÙNG
  // ============================================================

  var usersData = [];

  async function loadUsers() {
    var tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    Utils.showLoading(true, "Đang tải danh sách người dùng...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/manager/users", {
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      console.log("👥 Users data:", result);

      if (result.success) {
        usersData = result.data || [];
        renderUsersTable(usersData);
      } else {
        tbody.innerHTML = `
          <tr><td colspan="8" style="text-align:center;padding:40px;color:#f87171;">
            <i class="fas fa-exclamation-triangle"></i>
            <p style="margin-top:8px;">Lỗi tải dữ liệu: ${result.message}</p>
          </td></tr>
        `;
      }
    } catch (error) {
      console.error("Load users error:", error);
      tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px;color:#f87171;">
          <i class="fas fa-exclamation-triangle"></i>
          <p style="margin-top:8px;">Lỗi: ${error.message}</p>
        </td></tr>
      `;
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderUsersTable(users) {
    var tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:60px;color:#6b82a0;">
            <i class="fas fa-users" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
            Chưa có người dùng nào
          </td>
        </tr>
      `;
      return;
    }

    var currentUser = Auth.getCurrentUser();

    tbody.innerHTML = users
      .map(function (user, idx) {
        var isActive = user.isActive == 1;
        var isManager = user.roleId === "quan_ly";

        var roleLabels = {
          admin: "Quản trị",
          quan_ly: "Quản lý",
          ke_toan: "Kế toán",
          quan_ly_kho: "Quản lý kho",
          nhan_vien: "Nhân viên",
          nhap_lieu: "Nhập liệu",
        };

        var perms = [];
        if (user.canAddProduct) perms.push("➕Thêm");
        if (user.canEditProduct) perms.push("✏️Sửa");
        if (user.canDeleteProduct) perms.push("🗑️Xóa");
        if (user.canCreateReceipt) perms.push("📥Nhập");
        if (user.canCreateExport) perms.push("📤Xuất");
        if (user.canViewAll) perms.push("👁️Xem tất cả");

        var permText = perms.length > 0 ? perms.join(" ") : "—";

        var isSelf = currentUser && currentUser.id === user.id;
        var canDelete = !isSelf && !isManager;

        var statusText = isActive ? "● Hoạt động" : "● Đã khóa";

        return `
        <tr style="border-bottom: 1px solid #1e2d45; transition: background 0.15s;">
          <td style="padding: 12px 16px; text-align: center; color: #6b82a0; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 12px 16px;">
            <strong style="color: #60a5fa; font-size: 14px;">${Utils.escapeHtml(user.username)}</strong>
          </td>
          <td style="padding: 12px 16px; color: #e2eaf5;">${Utils.escapeHtml(user.fullName || "—")}</td>
          <td style="padding: 12px 16px; color: #6b82a0;">${Utils.escapeHtml(user.email || "—")}</td>
          <td style="padding: 12px 16px;">
            <span class="role-badge" style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;
                   ${
                     user.roleId === "admin"
                       ? "background:rgba(239,68,68,0.2);color:#f87171;"
                       : user.roleId === "quan_ly"
                         ? "background:rgba(245,158,11,0.2);color:#fbbf24;"
                         : user.roleId === "ke_toan"
                           ? "background:rgba(59,130,246,0.2);color:#60a5fa;"
                           : user.roleId === "quan_ly_kho"
                             ? "background:rgba(16,185,129,0.2);color:#34d399;"
                             : user.roleId === "nhap_lieu"
                               ? "background:rgba(139,92,246,0.2);color:#a78bfa;"
                               : "background:rgba(107,114,128,0.2);color:#9ca3af;"
                   }">
              ${roleLabels[user.roleId] || user.roleId}
            </span>
          </td>
          <td style="padding: 12px 16px;">
            <span style="display:inline-flex;align-items:center;gap:6px;color:${isActive ? "#4ade80" : "#f87171"};">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isActive ? "#4ade80" : "#f87171"};${isActive ? "" : "animation:pulse 1.5s infinite;"}"></span>
              ${statusText}
            </span>
          </td>
          <td style="padding: 12px 16px; font-size: 12px; color: #6b82a0; max-width: 200px; word-break: break-word;">
            ${permText}
          </td>
          <td style="padding: 12px 16px;">
            <div class="action-buttons" style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-outline" onclick="window.editUser(${user.id})" 
                      title="Sửa người dùng" 
                      style="padding:6px 12px;font-size:12px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:#60a5fa;cursor:pointer;transition:all 0.2s;">
                <i class="fas fa-edit"></i>
              </button>
              ${
                canDelete
                  ? `
                <button class="btn btn-sm btn-danger" onclick="window.deleteUser(${user.id})" 
                        title="Xóa người dùng" 
                        style="padding:6px 12px;font-size:12px;border-radius:6px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;cursor:pointer;transition:all 0.2s;">
                  <i class="fas fa-trash"></i>
                </button>
              `
                  : ""
              }
              ${isSelf ? '<span style="font-size:11px;color:#6b82a0;padding:4px 8px;">Bạn</span>' : ""}
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function openAddUserModal() {
    var modal = document.getElementById("userModal");
    if (!modal) {
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    var titleEl = document.getElementById("userModalTitle");
    if (titleEl) titleEl.textContent = "👤 Thêm người dùng";

    var editIdEl = document.getElementById("editUserId");
    if (editIdEl) editIdEl.value = "";

    var form = document.getElementById("userForm");
    if (form) form.reset();

    var passEl = document.getElementById("userPassword");
    if (passEl) {
      passEl.placeholder = "Nhập mật khẩu mới";
      passEl.required = true;
      passEl.value = "";
    }

    document.querySelectorAll(".perm-check").forEach(function (cb) {
      cb.checked = false;
    });

    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.position = "fixed";
    modal.style.zIndex = "99999";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0, 0, 0, 0.8)";
    modal.style.backdropFilter = "blur(4px)";
    document.body.style.overflow = "hidden";
  }

  async function editUser(userId) {
    var user = usersData.find(function (u) {
      return u.id === userId;
    });
    if (!user) {
      Utils.showToast("Không tìm thấy user", "error");
      return;
    }

    if (user.roleId === "quan_ly") {
      Utils.showToast("❌ Không thể sửa tài khoản Quản lý.", "error");
      return;
    }

    var modal = document.getElementById("userModal");
    if (!modal) {
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    var titleEl = document.getElementById("userModalTitle");
    if (titleEl) titleEl.textContent = "✏️ Sửa người dùng: " + user.username;

    var editIdEl = document.getElementById("editUserId");
    if (editIdEl) editIdEl.value = user.id;

    var userEl = document.getElementById("userUsername");
    if (userEl) userEl.value = user.username;

    var nameEl = document.getElementById("userFullName");
    if (nameEl) nameEl.value = user.fullName || "";

    var emailEl = document.getElementById("userEmail");
    if (emailEl) emailEl.value = user.email || "";

    var roleEl = document.getElementById("userRole");
    if (roleEl) roleEl.value = user.roleId || "nhan_vien";

    var statusEl = document.getElementById("userStatus");
    if (statusEl) statusEl.value = user.isActive ? 1 : 0;

    var passEl = document.getElementById("userPassword");
    if (passEl) {
      passEl.value = "";
      passEl.placeholder = "Để trống nếu không đổi";
      passEl.required = false;
    }

    document.querySelectorAll(".perm-check").forEach(function (cb) {
      var field = cb.dataset.field;
      cb.checked = user[field] == 1;
    });

    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.position = "fixed";
    modal.style.zIndex = "99999";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0, 0, 0, 0.8)";
    modal.style.backdropFilter = "blur(4px)";
    document.body.style.overflow = "hidden";
  }

  function closeUserModal() {
    var modal = document.getElementById("userModal");
    if (modal) {
      modal.style.display = "none";
    }
    document.body.style.overflow = "";
  }

  async function saveUser() {
    var userId = document.getElementById("editUserId").value;
    var username = document.getElementById("userUsername").value.trim();
    var fullName = document.getElementById("userFullName").value.trim();
    var email = document.getElementById("userEmail").value.trim();
    var roleId = document.getElementById("userRole").value;
    var isActive = document.getElementById("userStatus").value === "1";
    var password = document.getElementById("userPassword").value;

    if (!username || !fullName) {
      Utils.showToast(
        "Vui lòng nhập đầy đủ tên đăng nhập và họ tên",
        "warning",
      );
      return;
    }

    if (!userId && !password) {
      Utils.showToast("Vui lòng nhập mật khẩu cho user mới", "warning");
      return;
    }

    var permissions = {};
    document.querySelectorAll(".perm-check").forEach(function (cb) {
      permissions[cb.dataset.field] = cb.checked;
    });

    var data = {
      username: username,
      fullName: fullName,
      email: email,
      roleId: roleId,
      isActive: isActive,
      permissions: permissions,
    };
    if (password) data.password = password;

    Utils.showLoading(true, userId ? "Đang cập nhật..." : "Đang tạo user...");
    try {
      var token = API.getToken();
      var url = userId
        ? API_BASE_URL + "/manager/users/" + userId
        : API_BASE_URL + "/manager/users";
      var method = userId ? "PUT" : "POST";

      var response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(data),
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast(
          userId ? "✅ Cập nhật user thành công" : "✅ Tạo user thành công",
        );
        closeUserModal();
        loadUsers();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  async function deleteUser(userId) {
    var user = usersData.find(function (u) {
      return u.id === userId;
    });
    if (!user) return;

    if (user.roleId === "quan_ly") {
      Utils.showToast("❌ Không thể xóa tài khoản Quản lý.", "error");
      return;
    }

    if (!confirm('Bạn có chắc muốn xóa user "' + user.username + '"?')) return;

    Utils.showLoading(true, "Đang xóa...");
    try {
      var token = API.getToken();
      var response = await fetch(API_BASE_URL + "/manager/users/" + userId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      var result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Xóa user thành công");
        loadUsers();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // BIND EVENTS
  // ============================================================
  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        switchView(item.dataset.view);
        // Đóng sidebar trên mobile sau khi chọn
        if (window.innerWidth <= 768) {
          window.closeSidebar();
        }
      });
    });

    // ✅ SỬA LỖI TẠI ĐÂY: Đảm bảo sự kiện click cho nút hamburger được gán
    const btnHamburger = document.getElementById("btnHamburger");
    if (btnHamburger) {
      btnHamburger.addEventListener("click", function (e) {
        e.preventDefault();
        window.toggleSidebar();
      });
    }

    var refreshBtn = document.getElementById("btnRefresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        loadDashboardStats();
        loadNotifications();
        Utils.showToast("Đã làm mới dữ liệu");
      });
    }

    var btnAddUser = document.getElementById("btnAddUser");
    if (btnAddUser) {
      btnAddUser.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("🟢 Nút Thêm người dùng được click");
        openAddUserModal();
      });
    }

    var btnRefreshUsers = document.getElementById("btnRefreshUsers");
    if (btnRefreshUsers) {
      btnRefreshUsers.addEventListener("click", function (e) {
        e.preventDefault();
        loadUsers();
      });
    }

    var btnSaveUser = document.getElementById("btnSaveUser");
    if (btnSaveUser) {
      btnSaveUser.addEventListener("click", function (e) {
        e.preventDefault();
        saveUser();
      });
    }

    var modal = document.getElementById("userModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeUserModal();
        }
      });
    }

    var closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeUserModal();
      });
    }
  }

  // ============================================================
  // RESIZE HANDLER - CẬP NHẬT NÚT BACK KHI XOAY MÀN HÌNH
  // ============================================================
  window.addEventListener("resize", function () {
    var activeView = document.querySelector(".view.active");
    if (activeView) {
      var viewId = activeView.id.replace("view-", "");
      var isMobile = window.innerWidth <= 768;
      var backButtons = document.querySelectorAll(".btn-mobile-back");
      var isPendingPage = [
        "pending-products",
        "pending-receipts",
        "pending-exports",
        "pending-edits",
        "pending-deletions",
      ].includes(viewId);

      backButtons.forEach(function (btn) {
        if (isMobile && isPendingPage) {
          btn.style.display = "inline-flex";
          btn.style.alignItems = "center";
          btn.style.gap = "8px";
        } else {
          btn.style.display = "none";
        }
      });
    }
  });

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboardStats();
    loadNotifications();

    var activeView = document.querySelector(".view.active");
    if (activeView) {
      var viewId = activeView.id.replace("view-", "");
      if (viewId === "pending-receipts") loadPendingReceipts();
      else if (viewId === "pending-exports") loadPendingExports();
      else if (viewId === "pending-products") loadPendingApprovals();
      else if (viewId === "pending-edits") loadPendingEdits();
      else if (viewId === "pending-deletions") loadPendingDeletions();
      else if (viewId === "users") loadUsers();
    }
  }

  // ============================================================
  // EXPOSE TO WINDOW
  // ============================================================
  window.switchView = switchView;
  window.goBackFromPending = goBackFromPending;
  window.approveReceipt = approveReceipt;
  window.rejectReceipt = rejectReceipt;
  window.approveExport = approveExport;
  window.rejectExport = rejectExport;
  window.approveApproval = approveApproval;
  window.rejectApproval = rejectApproval;
  window.approveEditRequest = approveEditRequest;
  window.rejectEditRequest = rejectEditRequest;
  window.approveDeletionRequest = approveDeletionRequest;
  window.rejectDeletionRequest = rejectDeletionRequest;
  window.loadUsers = loadUsers;
  window.editUser = editUser;
  window.deleteUser = deleteUser;
  window.closeUserModal = closeUserModal;
  window.openAddUserModal = openAddUserModal;
  window.saveUser = saveUser;
  window.loadPendingApprovals = loadPendingApprovals;
  window.loadPendingReceipts = loadPendingReceipts;
  window.loadPendingExports = loadPendingExports;
  window.loadPendingEdits = loadPendingEdits;
  window.loadPendingDeletions = loadPendingDeletions;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
