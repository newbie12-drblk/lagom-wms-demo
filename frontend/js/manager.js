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

  // ========== LOAD PENDING RECEIPTS ==========
  async function loadPendingReceipts() {
    const container = $("pendingReceiptsList");
    Utils.showLoading(true, "Đang tải danh sách phiếu nhập...");
    try {
      const response = await fetch(`${API_BASE_URL}/receipts/pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();

      if (result.success) {
        pendingReceipts = result.data || [];
        console.log("📥 Phiếu nhập chờ duyệt:", pendingReceipts.length);
        renderPendingReceipts();
      } else {
        Utils.showToast("Lỗi tải dữ liệu", "error");
        pendingReceipts = [];
        renderPendingReceipts();
      }
    } catch (error) {
      console.error("Load pending receipts error:", error);
      Utils.showToast("Lỗi tải dữ liệu", "error");
      pendingReceipts = [];
      renderPendingReceipts();
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingReceipts() {
    const container = $("pendingReceiptsList");
    if (!pendingReceipts || pendingReceipts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>Không có đề nghị nhập hàng nào chờ duyệt</p>
          <small style="color: #6b82a0;">Khi Admin tạo phiếu nhập có sản phẩm không khớp với kho, phiếu sẽ xuất hiện ở đây</small>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingReceipts
      .map((r) => {
        const statusMap = {
          pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
          awaiting_confirmation: {
            class: "status-awaiting",
            text: "🔄 Chờ xác nhận",
          },
          approved: { class: "status-approved", text: "✅ Đã duyệt" },
          rejected: { class: "status-rejected", text: "❌ Từ chối" },
        };
        const status = statusMap[r.status] || statusMap["pending"];

        const items = r.items || [];
        const totalItems = items.length;
        const totalValue = r.total || 0;

        return `
          <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #f59e0b;">
            <div class="approval-card-header">
              <div class="approval-card-id" style="font-size: 18px;">
                📥 ${Utils.escapeHtml(r.receiptNo || "PN-" + r.id)}
              </div>
              <div class="approval-card-date">
                <i class="far fa-calendar-alt"></i> ${Utils.formatDate(r.createdAt)}
              </div>
              <div class="approval-card-creator">
                👤 ${Utils.escapeHtml(r.creatorName || "Admin")}
              </div>
              <span class="status-badge ${status.class}" style="font-size: 13px; padding: 6px 14px;">
                ${status.text}
              </span>
            </div>
            
            <!-- THÔNG TIN CHI TIẾT PHIẾU -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #0f172a; padding: 12px 16px; border-radius: 8px; margin: 10px 0;">
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Nhà cung cấp</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.supplierName || "—")}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Ngày nhập</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.formatDate(r.receiptDate)}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Tổng giá trị</div>
                <div style="font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số sản phẩm</div>
                <div style="font-size: 14px; font-weight: 600; color: #86efac;">${totalItems}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Khách hàng</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.customerName || "—")}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số HĐ</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.customerContract || "—")}</div>
              </div>
            </div>
            
            <!-- BẢNG SẢN PHẨM CHI TIẾT -->
            ${
              items.length > 0
                ? `
              <div style="margin: 10px 0; background: #1a2235; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                  <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                      <tr style="background: #0f172a; border-bottom: 2px solid #3b82f6;">
                        <th style="padding: 8px 10px; text-align: center; color: #60a5fa; font-weight: 600; min-width: 40px;">STT</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 150px;">Tên thương mại</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 100px;">Mã hàng</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 100px;">Quy cách</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 120px;">Hãng SX</th>
                        <th style="padding: 8px 10px; text-align: center; color: #60a5fa; font-weight: 600; min-width: 50px;">ĐVT</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 100px;">Đơn giá</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 60px;">SL</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 120px;">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items
                        .map(
                          (item, idx) => `
                        <tr style="border-bottom: 1px solid #1e2d45; ${idx % 2 === 0 ? "background: #111827;" : "background: #0f172a;"}">
                          <td style="padding: 6px 10px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5; font-weight: 500;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #93c5fd;">${Utils.escapeHtml(item.maHang || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 6px 10px; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.giaNhap || 0)}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #86efac; font-weight: 600;">${item.soLuongNhap || 0}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                    <tfoot>
                      <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                        <td colspan="8" style="padding: 10px 10px; text-align: right; font-size: 14px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                        <td style="padding: 10px 10px; text-align: right; font-size: 15px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            `
                : `
              <div style="padding: 20px; text-align: center; color: #6b82a0; background: #1a2235; border-radius: 8px;">
                <i class="fas fa-box-open" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Không có sản phẩm trong phiếu này
              </div>
            `
            }
            
            <!-- NÚT DUYỆT / TỪ CHỐI -->
            <div class="approval-card-actions" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end;">
              <button class="btn btn-danger" onclick="rejectReceipt(${r.id})" style="padding: 10px 24px; font-size: 14px;">
                <i class="fas fa-times"></i> Từ chối
              </button>
              <button class="btn btn-success" onclick="approveReceipt(${r.id})" style="padding: 10px 24px; font-size: 14px;">
                <i class="fas fa-check"></i> Duyệt
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ========== APPROVE / REJECT RECEIPT ==========
  window.approveReceipt = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt phiếu nhập này?")) return;

    Utils.showLoading(true, "Đang duyệt phiếu...");
    try {
      const response = await fetch(`${API_BASE_URL}/receipts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu nhập thành công!");
        loadPendingReceipts();
        loadDashboard();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể duyệt"),
          "error",
        );
      }
    } catch (error) {
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectReceipt = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      const response = await fetch(`${API_BASE_URL}/receipts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu nhập!");
        loadPendingReceipts();
        loadDashboard();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể từ chối"),
          "error",
        );
      }
    } catch (error) {
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  // ========== LOAD PENDING EXPORTS ==========
  async function loadPendingExports() {
    const container = $("pendingExportsList");
    Utils.showLoading(true, "Đang tải danh sách phiếu xuất...");
    try {
      const response = await fetch(`${API_BASE_URL}/exports/pending`, {
        headers: { Authorization: `Bearer ${API.getToken()}` },
      });
      const result = await response.json();

      if (result.success) {
        pendingExports = result.data || [];
        console.log("📤 Phiếu xuất chờ duyệt:", pendingExports.length);
        renderPendingExports();
      } else {
        Utils.showToast("Lỗi tải dữ liệu", "error");
        pendingExports = [];
        renderPendingExports();
      }
    } catch (error) {
      console.error("Load pending exports error:", error);
      Utils.showToast("Lỗi tải dữ liệu", "error");
      pendingExports = [];
      renderPendingExports();
    } finally {
      Utils.showLoading(false);
    }
  }

  function renderPendingExports() {
    const container = $("pendingExportsList");
    if (!pendingExports || pendingExports.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>Không có đề nghị xuất kho nào chờ duyệt</p>
          <small style="color: #6b82a0;">Khi Admin tạo phiếu xuất có sản phẩm không khớp với kho, phiếu sẽ xuất hiện ở đây</small>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingExports
      .map((r) => {
        const statusMap = {
          pending: { class: "status-pending", text: "⏳ Chờ duyệt" },
          awaiting_confirmation: {
            class: "status-awaiting",
            text: "🔄 Chờ xác nhận",
          },
          approved: { class: "status-approved", text: "✅ Đã duyệt" },
          rejected: { class: "status-rejected", text: "❌ Từ chối" },
        };
        const status = statusMap[r.status] || statusMap["pending"];

        const items = r.items || [];
        const totalItems = items.length;
        const totalValue = r.total || 0;

        return `
          <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #3b82f6;">
            <div class="approval-card-header">
              <div class="approval-card-id" style="font-size: 18px;">
                📤 ${Utils.escapeHtml(r.exportNo || "PX-" + r.id)}
              </div>
              <div class="approval-card-date">
                <i class="far fa-calendar-alt"></i> ${Utils.formatDate(r.createdAt)}
              </div>
              <div class="approval-card-creator">
                👤 ${Utils.escapeHtml(r.creatorName || "Admin")}
              </div>
              <span class="status-badge ${status.class}" style="font-size: 13px; padding: 6px 14px;">
                ${status.text}
              </span>
            </div>
            
            <!-- THÔNG TIN CHI TIẾT PHIẾU -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #0f172a; padding: 12px 16px; border-radius: 8px; margin: 10px 0;">
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Người nhận</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.receiverName || "—")}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Ngày xuất</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.formatDate(r.exportDate)}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Tổng giá trị</div>
                <div style="font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số sản phẩm</div>
                <div style="font-size: 14px; font-weight: 600; color: #86efac;">${totalItems}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Khách hàng</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.customerName || "—")}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Lý do xuất</div>
                <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.exportReason || "—")}</div>
              </div>
            </div>
            
            <!-- BẢNG SẢN PHẨM CHI TIẾT -->
            ${
              items.length > 0
                ? `
              <div style="margin: 10px 0; background: #1a2235; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                  <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                      <tr style="background: #0f172a; border-bottom: 2px solid #3b82f6;">
                        <th style="padding: 8px 10px; text-align: center; color: #60a5fa; font-weight: 600; min-width: 40px;">STT</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 150px;">Tên thương mại</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 100px;">Mã hàng</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 100px;">Quy cách</th>
                        <th style="padding: 8px 10px; text-align: left; color: #60a5fa; font-weight: 600; min-width: 120px;">Hãng SX</th>
                        <th style="padding: 8px 10px; text-align: center; color: #60a5fa; font-weight: 600; min-width: 50px;">ĐVT</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 100px;">Đơn giá</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 60px;">SL</th>
                        <th style="padding: 8px 10px; text-align: right; color: #60a5fa; font-weight: 600; min-width: 120px;">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items
                        .map(
                          (item, idx) => `
                        <tr style="border-bottom: 1px solid #1e2d45; ${idx % 2 === 0 ? "background: #111827;" : "background: #0f172a;"}">
                          <td style="padding: 6px 10px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5; font-weight: 500;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #93c5fd;">${Utils.escapeHtml(item.maHang || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 6px 10px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 6px 10px; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.donGia || 0)}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #86efac; font-weight: 600;">${item.soLuong || 0}</td>
                          <td style="padding: 6px 10px; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                    <tfoot>
                      <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                        <td colspan="8" style="padding: 10px 10px; text-align: right; font-size: 14px; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                        <td style="padding: 10px 10px; text-align: right; font-size: 15px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            `
                : `
              <div style="padding: 20px; text-align: center; color: #6b82a0; background: #1a2235; border-radius: 8px;">
                <i class="fas fa-box-open" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Không có sản phẩm trong phiếu này
              </div>
            `
            }
            
            <!-- NÚT DUYỆT / TỪ CHỐI -->
            <div class="approval-card-actions" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end;">
              <button class="btn btn-danger" onclick="rejectExport(${r.id})" style="padding: 10px 24px; font-size: 14px;">
                <i class="fas fa-times"></i> Từ chối
              </button>
              <button class="btn btn-success" onclick="approveExport(${r.id})" style="padding: 10px 24px; font-size: 14px;">
                <i class="fas fa-check"></i> Duyệt
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ========== APPROVE / REJECT EXPORT ==========
  window.approveExport = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt phiếu xuất này?")) return;

    Utils.showLoading(true, "Đang duyệt phiếu...");
    try {
      const response = await fetch(`${API_BASE_URL}/exports/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu xuất thành công!");
        loadPendingExports();
        loadDashboard();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể duyệt"),
          "error",
        );
      }
    } catch (error) {
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectExport = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      const response = await fetch(`${API_BASE_URL}/exports/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API.getToken()}`,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu xuất!");
        loadPendingExports();
        loadDashboard();
      } else {
        Utils.showToast(
          "❌ Lỗi: " + (result.message || "Không thể từ chối"),
          "error",
        );
      }
    } catch (error) {
      Utils.showToast("❌ " + (error.message || "Có lỗi xảy ra"), "error");
    } finally {
      Utils.showLoading(false);
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
  window.approveReceipt = approveReceipt;
  window.rejectReceipt = rejectReceipt;
  window.approveExport = approveExport;
  window.rejectExport = rejectExport;
  window.approveEditRequest = approveEditRequest;
  window.rejectEditRequest = rejectEditRequest;
  window.approveDeletionRequest = approveDeletionRequest;
  window.rejectDeletionRequest = rejectDeletionRequest;

  init();
})();
