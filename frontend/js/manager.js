/**
 * ==================== MANAGER MODULE ====================
 * Quản lý - Duyệt các yêu cầu từ Admin + Quản lý người dùng
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

    $("logoutBtn")?.addEventListener("click", () => {
      Auth.logout();
      window.location.href = "login.html";
    });

    $("currentDate").textContent = new Date().toLocaleDateString("vi-VN");
  }

  // ============================================================
  // SWITCH VIEW
  // ============================================================
  function switchView(viewName) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    const titles = {
      dashboard: "Tổng quan",
      "pending-products": "Sản phẩm chờ duyệt",
      "pending-receipts": "Nhập hàng chờ duyệt",
      "pending-exports": "Xuất kho chờ duyệt",
      "pending-edits": "Chỉnh sửa chờ duyệt",
      "pending-deletions": "Xóa chờ duyệt",
      users: "Quản lý người dùng",
    };
    const breadcrumb = document.getElementById("breadcrumb-title");
    if (breadcrumb) breadcrumb.textContent = titles[viewName] || viewName;

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
  // LOAD DASHBOARD STATS
  // ============================================================
  async function loadDashboardStats() {
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/manager/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("📊 Dashboard stats response:", result);

      if (result.success) {
        const data = result.data;

        document.getElementById("statPendingProducts").textContent =
          data.pendingProducts || 0;
        document.getElementById("statPendingReceipts").textContent =
          data.pendingReceipts || 0;
        document.getElementById("statPendingExports").textContent =
          data.pendingExports || 0;
        document.getElementById("statPendingEdits").textContent =
          data.pendingEdits || 0;
        document.getElementById("statPendingDeletions").textContent =
          data.pendingDeletions || 0;

        document.getElementById("badgeProducts").textContent =
          data.pendingProducts || 0;
        document.getElementById("badgeReceipts").textContent =
          data.pendingReceipts || 0;
        document.getElementById("badgeExports").textContent =
          data.pendingExports || 0;
        document.getElementById("badgeEdits").textContent =
          data.pendingEdits || 0;
        document.getElementById("badgeDeletions").textContent =
          data.pendingDeletions || 0;
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
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        const container = $("recentNotifications");
        const notifications = result.data || [];
        $("notificationCount").textContent = result.unreadCount || 0;

        if (notifications.length === 0) {
          container.innerHTML = `<div class="empty-state"><p>Không có thông báo</p></div>`;
          return;
        }

        container.innerHTML = notifications
          .slice(0, 10)
          .map(
            (n) => `
          <div class="alert-row" style="padding: 10px 14px; border-bottom: 1px solid #1e2d45; display: flex; gap: 10px; align-items: flex-start;">
            <div style="font-size: 20px;">${n.type === "approval" ? "📋" : n.type === "warning" ? "⚠️" : "ℹ️"}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(n.title)}</div>
              <div style="font-size: 12px; color: #6b82a0;">${Utils.escapeHtml(n.message)}</div>
              <div style="font-size: 10px; color: #374b66;">${Utils.formatDate(n.createdAt)}</div>
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

  // ============================================================
  // LOAD PENDING APPROVALS
  // ============================================================
  async function loadPendingApprovals() {
    const container = document.getElementById("pendingApprovalsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu thêm sản phẩm...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("📋 Approval requests:", result);

      if (result.success) {
        const requests = result.data || [];
        const pendingRequests = requests.filter((r) => r.status === "pending");

        console.log(`📋 Found ${pendingRequests.length} pending approvals`);

        if (pendingRequests.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-check-circle"></i>
              <p>Không có yêu cầu thêm sản phẩm nào chờ duyệt</p>
            </div>
          `;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = pendingRequests
          .map((r) => {
            const products = r.productData?.products || [];
            const totalProducts = products.length;

            let itemsHtml = "";
            if (totalProducts > 0) {
              itemsHtml = `
              <div style="margin: 10px 0; background: #1a2235; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto; max-height: 250px; overflow-y: auto;">
                  <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                      <tr style="background: #0f172a; border-bottom: 2px solid #3b82f6;">
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">STT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Tên thương mại</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Mã hàng</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Quy cách</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Hãng SX</th>
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">ĐVT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Phân loại</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">Giá nhập</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">SL nhập</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${products
                        .map(
                          (item, idx) => `
                        <tr style="border-bottom: 1px solid #1e2d45; ${idx % 2 === 0 ? "background: #111827;" : "background: #0f172a;"}">
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5; font-weight: 500;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #93c5fd;">${Utils.escapeHtml(item.maHang || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.giaNhap || 0)}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #86efac;">${item.soLuongNhap || 0}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
            }

            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #8b5cf6; background: #111827; border-radius: 12px; padding: 16px 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e2d45;">
                <div style="font-size: 18px; font-weight: 700; color: #a78bfa;">
                  📦 Yêu cầu thêm sản phẩm #${r.id}
                </div>
                <div style="font-size: 12px; color: #6b82a0;">
                  <i class="far fa-calendar-alt"></i> ${Utils.formatDate(r.createdAt)}
                </div>
                <div style="font-size: 13px; color: #e2eaf5;">
                  👤 ${Utils.escapeHtml(r.requesterName || "Admin")}
                </div>
                <span class="status-badge status-pending" style="font-size: 13px; padding: 4px 14px;">
                  ⏳ Chờ duyệt
                </span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số sản phẩm</div>
                  <div style="font-size: 14px; font-weight: 600; color: #86efac;">${totalProducts}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Người yêu cầu</div>
                  <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.requesterName || "Admin")}</div>
                </div>
              </div>

              ${itemsHtml}

              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-danger" onclick="window.rejectApproval(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-times"></i> Từ chối
                </button>
                <button class="btn btn-success" onclick="window.approveApproval(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-check"></i> Duyệt
                </button>
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML = `<div class="empty-state"><p>Lỗi tải dữ liệu: ${result.message}</p></div>`;
      }
    } catch (error) {
      console.error("Load pending approvals error:", error);
      container.innerHTML = `<div class="empty-state"><p>Lỗi: ${error.message}</p></div>`;
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // APPROVE / REJECT APPROVAL
  // ============================================================
  window.approveApproval = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu thêm sản phẩm này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/approvals/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt yêu cầu! Sản phẩm đã được thêm vào kho.");
        loadPendingApprovals();
        loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectApproval = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/approvals/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu!");
        loadPendingApprovals();
        loadDashboardStats();
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
    const container = $("pendingReceiptsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải phiếu nhập...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/receipts/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("📥 Receipts response:", result);

      if (result.success) {
        const receipts = result.data || [];
        console.log(`📋 Found ${receipts.length} pending receipts`);

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
          .map((r) => {
            const items = r.items || [];
            const totalItems = items.length;
            const totalValue = r.total || 0;

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

            let itemsHtml = "";
            if (totalItems > 0) {
              itemsHtml = `
              <div style="margin: 10px 0; background: #1a2235; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto; max-height: 250px; overflow-y: auto;">
                  <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                      <tr style="background: #0f172a; border-bottom: 2px solid #3b82f6;">
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">STT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Tên thương mại</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Mã hàng</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Quy cách</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Hãng SX</th>
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">ĐVT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Phân loại</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">Giá nhập</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">SL nhập</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">Thành tiền</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Số HĐ</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Số HĐơn nhập</th>
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">Ngày nhập HĐ</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Số lot</th>
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">HSD</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items
                        .map(
                          (item, idx) => `
                        <tr style="border-bottom: 1px solid #1e2d45; ${idx % 2 === 0 ? "background: #111827;" : "background: #0f172a;"}">
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5; font-weight: 500;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #93c5fd;">${Utils.escapeHtml(item.maHang || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.giaNhap || 0)}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #86efac;">${item.soLuongNhap || 0}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.soHopDongNhap || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.soHoaDonNhap || "—")}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${Utils.formatDate(item.ngayNhapHD)}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.soLot || "—")}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${Utils.formatDate(item.ngayHetHan)}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.ghiChu || "—")}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                    <tfoot>
                      <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                        <td colspan="9" style="padding: 8px 8px; text-align: right; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                        <td style="padding: 8px 8px; text-align: right; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</td>
                        <td colspan="5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            `;
            } else {
              itemsHtml = `
              <div style="padding: 20px; text-align: center; color: #6b82a0; background: #1a2235; border-radius: 8px;">
                <i class="fas fa-box-open" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Không có sản phẩm trong phiếu này
              </div>
            `;
            }

            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #f59e0b; background: #111827; border-radius: 12px; padding: 16px 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e2d45;">
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">
                  📥 ${Utils.escapeHtml(r.receiptNo || "PN-" + r.id)}
                </div>
                <div style="font-size: 12px; color: #6b82a0;">
                  <i class="far fa-calendar-alt"></i> ${Utils.formatDate(r.createdAt)}
                </div>
                <div style="font-size: 13px; color: #e2eaf5;">
                  👤 ${Utils.escapeHtml(r.creatorName || "Admin")}
                </div>
                <span class="status-badge ${status.class}" style="font-size: 13px; padding: 4px 14px;">
                  ${status.text}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Nhà cung cấp</div>
                  <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.supplierName || "—")}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Ngày nhập</div>
                  <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.formatDate(r.receiptDate)}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số sản phẩm</div>
                  <div style="font-size: 14px; font-weight: 600; color: #86efac;">${totalItems}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Tổng giá trị</div>
                  <div style="font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</div>
                </div>
              </div>

              ${itemsHtml}

              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-danger" onclick="window.rejectReceipt(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-times"></i> Từ chối
                </button>
                <button class="btn btn-success" onclick="window.approveReceipt(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-check"></i> Duyệt
                </button>
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML = `<div class="empty-state"><p>Lỗi tải dữ liệu: ${result.message}</p></div>`;
      }
    } catch (error) {
      console.error("Load pending receipts error:", error);
      container.innerHTML = `<div class="empty-state"><p>Lỗi: ${error.message}</p></div>`;
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // APPROVE / REJECT RECEIPT
  // ============================================================
  window.approveReceipt = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt phiếu nhập này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/receipts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu nhập!");
        loadPendingReceipts();
        loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectReceipt = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/receipts/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu nhập!");
        loadPendingReceipts();
        loadDashboardStats();
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
    const container = $("pendingExportsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải phiếu xuất...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/exports/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("📤 Exports response:", result);

      if (result.success) {
        const exports = result.data || [];
        console.log(`📋 Found ${exports.length} pending exports`);

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
          .map((r) => {
            const items = r.items || [];
            const totalItems = items.length;
            const totalValue = r.total || 0;

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

            let itemsHtml = "";
            if (totalItems > 0) {
              itemsHtml = `
              <div style="margin: 10px 0; background: #1a2235; border-radius: 8px; overflow: hidden;">
                <div style="overflow-x: auto; max-height: 250px; overflow-y: auto;">
                  <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                      <tr style="background: #0f172a; border-bottom: 2px solid #3b82f6;">
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">STT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Tên thương mại</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Mã hàng</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Quy cách</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Hãng SX</th>
                        <th style="padding: 6px 8px; text-align: center; color: #60a5fa;">ĐVT</th>
                        <th style="padding: 6px 8px; text-align: left; color: #60a5fa;">Phân loại</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">Đơn giá</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">SL</th>
                        <th style="padding: 6px 8px; text-align: right; color: #60a5fa;">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${items
                        .map(
                          (item, idx) => `
                        <tr style="border-bottom: 1px solid #1e2d45; ${idx % 2 === 0 ? "background: #111827;" : "background: #0f172a;"}">
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${idx + 1}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5; font-weight: 500;">${Utils.escapeHtml(item.tenThuongMai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #93c5fd;">${Utils.escapeHtml(item.maHang || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.quyCach || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.hangSX || "—")}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #e2eaf5;">${Utils.escapeHtml(item.dvt || "—")}</td>
                          <td style="padding: 4px 8px; text-align: left; color: #e2eaf5;">${Utils.escapeHtml(item.phanLoai || "—")}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #93c5fd;">${Utils.formatCurrency(item.donGia || 0)}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #86efac;">${item.soLuong || 0}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(item.thanhTien || 0)}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                    <tfoot>
                      <tr style="background: #0f172a; border-top: 2px solid #3b82f6;">
                        <td colspan="9" style="padding: 8px 8px; text-align: right; font-weight: 700; color: #e2eaf5;">TỔNG CỘNG:</td>
                        <td style="padding: 8px 8px; text-align: right; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            `;
            } else {
              itemsHtml = `
              <div style="padding: 20px; text-align: center; color: #6b82a0; background: #1a2235; border-radius: 8px;">
                <i class="fas fa-box-open" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                Không có sản phẩm trong phiếu này
              </div>
            `;
            }

            return `
            <div class="approval-card" style="margin-bottom: 16px; border-left: 4px solid #3b82f6; background: #111827; border-radius: 12px; padding: 16px 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e2d45;">
                <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">
                  📤 ${Utils.escapeHtml(r.exportNo || "PX-" + r.id)}
                </div>
                <div style="font-size: 12px; color: #6b82a0;">
                  <i class="far fa-calendar-alt"></i> ${Utils.formatDate(r.createdAt)}
                </div>
                <div style="font-size: 13px; color: #e2eaf5;">
                  👤 ${Utils.escapeHtml(r.creatorName || "Admin")}
                </div>
                <span class="status-badge ${status.class}" style="font-size: 13px; padding: 4px 14px;">
                  ${status.text}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Người nhận</div>
                  <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.escapeHtml(r.receiverName || "—")}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Ngày xuất</div>
                  <div style="font-size: 14px; font-weight: 600; color: #e2eaf5;">${Utils.formatDate(r.exportDate)}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Số sản phẩm</div>
                  <div style="font-size: 14px; font-weight: 600; color: #86efac;">${totalItems}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #6b82a0; text-transform: uppercase;">Tổng giá trị</div>
                  <div style="font-size: 16px; font-weight: 700; color: #fbbf24;">${Utils.formatCurrency(totalValue)}</div>
                </div>
              </div>

              ${itemsHtml}

              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-danger" onclick="window.rejectExport(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-times"></i> Từ chối
                </button>
                <button class="btn btn-success" onclick="window.approveExport(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                  <i class="fas fa-check"></i> Duyệt
                </button>
              </div>
            </div>
          `;
          })
          .join("");
      } else {
        container.innerHTML = `<div class="empty-state"><p>Lỗi tải dữ liệu: ${result.message}</p></div>`;
      }
    } catch (error) {
      console.error("Load pending exports error:", error);
      container.innerHTML = `<div class="empty-state"><p>Lỗi: ${error.message}</p></div>`;
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // APPROVE / REJECT EXPORT
  // ============================================================
  window.approveExport = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt phiếu xuất này?")) return;

    Utils.showLoading(true, "Đang duyệt...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/exports/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt phiếu xuất!");
        loadPendingExports();
        loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectExport = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;

    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/exports/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "rejected", rejectedReason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối phiếu xuất!");
        loadPendingExports();
        loadDashboardStats();
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
    const container = $("pendingEditsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu chỉnh sửa...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/edits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("✏️ Pending edits:", result);

      if (result.success) {
        const edits = result.data || [];
        const pendingEdits = edits.filter((e) => e.status === "pending");

        if (pendingEdits.length === 0) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu chỉnh sửa nào</p></div>`;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = pendingEdits
          .map((r) => {
            const oldData = r.oldData || {};
            const newData = r.newData || {};
            let changesHtml = "";
            for (const key in newData) {
              if (oldData[key] != newData[key]) {
                changesHtml += `<div><span style="color:#6b82a0;">${key}:</span> <span style="color:#f87171;">${Utils.escapeHtml(String(oldData[key] || "—"))}</span> → <span style="color:#4ade80;">${Utils.escapeHtml(String(newData[key] || "—"))}</span></div>`;
              }
            }

            return `
          <div class="approval-card" style="margin-bottom: 16px; background: #111827; border-radius: 12px; padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e2d45;">
              <div style="font-size: 18px; font-weight: 700; color: #60a5fa;">✏️ ${Utils.escapeHtml(r.productName)} (${Utils.escapeHtml(r.productCode)})</div>
              <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
              <div style="font-size: 13px; color: #e2eaf5;">👤 ${Utils.escapeHtml(r.requesterName || "Admin")}</div>
            </div>
            <div style="background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
              <div style="font-weight: 600; color: #fbbf24; margin-bottom: 8px;">📝 Thay đổi:</div>
              ${changesHtml}
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end;">
              <button class="btn btn-danger" onclick="window.rejectEditRequest(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                <i class="fas fa-times"></i> Từ chối
              </button>
              <button class="btn btn-success" onclick="window.approveEditRequest(${r.id})" style="padding: 8px 20px; font-size: 13px;">
                <i class="fas fa-check"></i> Duyệt
              </button>
            </div>
          </div>
        `;
          })
          .join("");
      } else {
        container.innerHTML = `<div class="empty-state"><p>Lỗi: ${result.message}</p></div>`;
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state"><p>Lỗi: ${error.message}</p></div>`;
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // APPROVE / REJECT EDIT
  // ============================================================
  window.approveEditRequest = async (id) => {
    if (!confirm("Bạn có chắc muốn duyệt yêu cầu chỉnh sửa này?")) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/edits/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt yêu cầu chỉnh sửa!");
        loadPendingEdits();
        loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectEditRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/edits/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu chỉnh sửa!");
        loadPendingEdits();
        loadDashboardStats();
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
    const container = $("pendingDeletionsList");
    if (!container) return;

    Utils.showLoading(true, "Đang tải yêu cầu xóa...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/deletions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      console.log("🗑️ Pending deletions:", result);

      if (result.success) {
        const deletions = result.data || [];
        const pendingDeletions = deletions.filter(
          (d) => d.status === "pending",
        );

        if (pendingDeletions.length === 0) {
          container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>Không có yêu cầu xóa nào</p></div>`;
          Utils.showLoading(false);
          return;
        }

        container.innerHTML = pendingDeletions
          .map(
            (r) => `
        <div class="approval-card" style="margin-bottom: 16px; background: #111827; border-radius: 12px; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #1e2d45;">
            <div style="font-size: 18px; font-weight: 700; color: #f87171;">🗑️ ${Utils.escapeHtml(r.productName)} (${Utils.escapeHtml(r.productCode)})</div>
            <div style="font-size: 12px; color: #6b82a0;">${Utils.formatDate(r.createdAt)}</div>
            <div style="font-size: 13px; color: #e2eaf5;">👤 ${Utils.escapeHtml(r.requesterName || "Admin")}</div>
          </div>
          <div style="background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 12px; color: #6b82a0; max-height: 200px; overflow-y: auto;">
            <pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(r.productData, null, 2)}</pre>
          </div>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2d45; display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn btn-danger" onclick="window.rejectDeletionRequest(${r.id})" style="padding: 8px 20px; font-size: 13px;">
              <i class="fas fa-times"></i> Từ chối
            </button>
            <button class="btn btn-success" onclick="window.approveDeletionRequest(${r.id})" style="padding: 8px 20px; font-size: 13px;">
              <i class="fas fa-check"></i> Duyệt xóa
            </button>
          </div>
        </div>
      `,
          )
          .join("");
      } else {
        container.innerHTML = `<div class="empty-state"><p>Lỗi: ${result.message}</p></div>`;
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state"><p>Lỗi: ${error.message}</p></div>`;
    } finally {
      Utils.showLoading(false);
    }
  }

  // ============================================================
  // APPROVE / REJECT DELETION
  // ============================================================
  window.approveDeletionRequest = async (id) => {
    if (
      !confirm(
        "Bạn có chắc muốn duyệt xóa sản phẩm này? Hành động này KHÔNG thể hoàn tác!",
      )
    )
      return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/deletions/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã duyệt xóa sản phẩm!");
        loadPendingDeletions();
        loadDashboardStats();
      } else {
        Utils.showToast("❌ " + (result.message || "Lỗi"), "error");
      }
    } catch (error) {
      Utils.showToast("❌ " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  };

  window.rejectDeletionRequest = async (id) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (reason === null) return;
    Utils.showLoading(true, "Đang xử lý...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/deletions/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason }),
      });
      const result = await response.json();

      if (result.success) {
        Utils.showToast("✅ Đã từ chối yêu cầu xóa!");
        loadPendingDeletions();
        loadDashboardStats();
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

  let usersData = [];

  // Lấy danh sách user
  async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    Utils.showLoading(true, "Đang tải danh sách người dùng...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/manager/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

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

  // Render bảng user
  function renderUsersTable(users) {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px;color:#6b82a0;">
          <i class="fas fa-users" style="font-size:32px;display:block;margin-bottom:12px;"></i>
          Chưa có người dùng nào
        </td></tr>
      `;
      return;
    }

    const currentUser = Auth.getCurrentUser();

    tbody.innerHTML = users
      .map((user, idx) => {
        const isActive = user.isActive == 1;
        const isManager = user.roleId === "quan_ly";
        const roleColors = {
          admin: "admin",
          quan_ly: "quan_ly",
          ke_toan: "ke_toan",
          quan_ly_kho: "quan_ly_kho",
          nhan_vien: "nhan_vien",
          nhap_lieu: "nhap_lieu",
        };
        const roleLabels = {
          admin: "Quản trị",
          quan_ly: "Quản lý",
          ke_toan: "Kế toán",
          quan_ly_kho: "Quản lý kho",
          nhan_vien: "Nhân viên",
          nhap_lieu: "Nhập liệu",
        };

        const perms = [];
        if (user.canAddProduct) perms.push("➕Thêm");
        if (user.canEditProduct) perms.push("✏️Sửa");
        if (user.canDeleteProduct) perms.push("🗑️Xóa");
        if (user.canCreateReceipt) perms.push("📥Nhập");
        if (user.canCreateExport) perms.push("📤Xuất");
        if (user.canViewAll) perms.push("👁️Xem tất cả");
        const permText = perms.length > 0 ? perms.join(" ") : "—";

        const isSelf = currentUser && currentUser.id === user.id;
        const canDelete = !isSelf && !isManager;

        return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong style="color:#60a5fa;">${Utils.escapeHtml(user.username)}</strong></td>
          <td>${Utils.escapeHtml(user.fullName || "—")}</td>
          <td>${Utils.escapeHtml(user.email || "—")}</td>
          <td><span class="role-badge ${roleColors[user.roleId] || "nhan_vien"}">${roleLabels[user.roleId] || user.roleId}</span></td>
          <td>
            <span class="status-dot ${isActive ? "active" : "inactive"}"></span>
            ${isActive ? "Hoạt động" : "Đã khóa"}
          </td>
          <td style="font-size:11px;max-width:200px;">${permText}</td>
          <td>
            <div class="action-buttons" style="gap:4px;">
              <button class="btn btn-sm btn-outline" onclick="editUser(${user.id})" title="Sửa">
                <i class="fas fa-edit"></i>
              </button>
              ${
                canDelete
                  ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Xóa">
                <i class="fas fa-trash"></i>
              </button>`
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // Mở modal thêm user
  function openAddUserModal() {
    const modal = document.getElementById("userModal");
    if (!modal) {
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    document.getElementById("userModalTitle").textContent =
      "👤 Thêm người dùng";
    document.getElementById("editUserId").value = "";
    document.getElementById("userForm").reset();
    document.getElementById("userPassword").placeholder = "Nhập mật khẩu mới";
    document.getElementById("userPassword").required = true;
    document.getElementById("userPassword").value = "";

    document
      .querySelectorAll(".perm-check")
      .forEach((cb) => (cb.checked = false));

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

  // Mở modal sửa user
  async function editUser(userId) {
    const user = usersData.find((u) => u.id === userId);
    if (!user) {
      Utils.showToast("Không tìm thấy user", "error");
      return;
    }

    // ⛔ KHÔNG CHO SỬA QUẢN LÝ
    if (user.roleId === "quan_ly") {
      Utils.showToast("❌ Không thể sửa tài khoản Quản lý.", "error");
      return;
    }

    const modal = document.getElementById("userModal");
    if (!modal) {
      Utils.showToast("Lỗi: Không tìm thấy modal", "error");
      return;
    }

    document.getElementById("userModalTitle").textContent =
      `✏️ Sửa người dùng: ${user.username}`;
    document.getElementById("editUserId").value = user.id;
    document.getElementById("userUsername").value = user.username;
    document.getElementById("userFullName").value = user.fullName || "";
    document.getElementById("userEmail").value = user.email || "";
    document.getElementById("userRole").value = user.roleId || "nhan_vien";
    document.getElementById("userStatus").value = user.isActive ? 1 : 0;
    document.getElementById("userPassword").value = "";
    document.getElementById("userPassword").placeholder =
      "Để trống nếu không đổi";
    document.getElementById("userPassword").required = false;

    document.querySelectorAll(".perm-check").forEach((cb) => {
      const field = cb.dataset.field;
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

  // Đóng modal user
  function closeUserModal() {
    const modal = document.getElementById("userModal");
    if (modal) {
      modal.style.display = "none";
    }
    document.body.style.overflow = "";
  }

  // Lưu user
  async function saveUser() {
    const userId = document.getElementById("editUserId").value;
    const username = document.getElementById("userUsername").value.trim();
    const fullName = document.getElementById("userFullName").value.trim();
    const email = document.getElementById("userEmail").value.trim();
    const roleId = document.getElementById("userRole").value;
    const isActive = document.getElementById("userStatus").value === "1";
    const password = document.getElementById("userPassword").value;

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

    const permissions = {};
    document.querySelectorAll(".perm-check").forEach((cb) => {
      permissions[cb.dataset.field] = cb.checked;
    });

    const data = {
      username,
      fullName,
      email,
      roleId,
      isActive,
      permissions,
    };
    if (password) data.password = password;

    Utils.showLoading(true, userId ? "Đang cập nhật..." : "Đang tạo user...");
    try {
      const token = API.getToken();
      const url = userId
        ? `${API_BASE_URL}/manager/users/${userId}`
        : `${API_BASE_URL}/manager/users`;
      const method = userId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();

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

  // Xóa user
  async function deleteUser(userId) {
    const user = usersData.find((u) => u.id === userId);
    if (!user) return;

    // ⛔ KHÔNG CHO XÓA QUẢN LÝ
    if (user.roleId === "quan_ly") {
      Utils.showToast("❌ Không thể xóa tài khoản Quản lý.", "error");
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa user "${user.username}"?`)) return;

    Utils.showLoading(true, "Đang xóa...");
    try {
      const token = API.getToken();
      const response = await fetch(`${API_BASE_URL}/manager/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

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
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    document.getElementById("btnRefresh")?.addEventListener("click", () => {
      loadDashboardStats();
      loadNotifications();
      Utils.showToast("Đã làm mới dữ liệu");
    });

    // User events
    const btnAddUser = document.getElementById("btnAddUser");
    if (btnAddUser) {
      btnAddUser.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("🟢 Nút Thêm người dùng được click");
        openAddUserModal();
      });
    }

    const btnRefreshUsers = document.getElementById("btnRefreshUsers");
    if (btnRefreshUsers) {
      btnRefreshUsers.addEventListener("click", function (e) {
        e.preventDefault();
        loadUsers();
      });
    }

    const btnSaveUser = document.getElementById("btnSaveUser");
    if (btnSaveUser) {
      btnSaveUser.addEventListener("click", function (e) {
        e.preventDefault();
        saveUser();
      });
    }

    // Đóng modal khi click ra ngoài
    const modal = document.getElementById("userModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeUserModal();
        }
      });
    }

    // Đóng modal khi click nút X
    const closeBtn = document.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeUserModal();
      });
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    updateTopbar();
    bindEvents();
    loadDashboardStats();
    loadNotifications();

    const activeView = document.querySelector(".view.active");
    if (activeView) {
      const viewId = activeView.id.replace("view-", "");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
