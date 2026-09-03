/**
 * ==================== INVOICES MODULE ====================
 * Quản lý hóa đơn - Admin nhập, Quản lý duyệt
 */

(function () {
  "use strict";

  let allData = [];
  let currentUser = null;

  // DOM Elements
  const container = document.getElementById("invoicesList");
  const searchInput = document.getElementById("searchInvoice");
  const statusFilter = document.getElementById("invoiceFilterStatus");
  const refreshBtn = document.getElementById("btnRefreshInvoices");
  const clearBtn = document.getElementById("btnClearInvoiceFilters");
  const badge = document.getElementById("invoiceBadge");

  // Stats elements
  const noInvoiceEl = document.getElementById("invoiceNoInvoice");
  const pendingEl = document.getElementById("invoicePending");
  const approvedEl = document.getElementById("invoiceApproved");
  const rejectedEl = document.getElementById("invoiceRejected");

  // ==================== GET CURRENT USER ====================
  function getCurrentUser() {
    if (currentUser) return currentUser;
    const session = localStorage.getItem("lagom_session");
    if (session) {
      try {
        currentUser = JSON.parse(session);
        return currentUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // ==================== CHECK PERMISSION ====================
  function isAdmin() {
    const user = getCurrentUser();
    return user && user.roleId === "admin";
  }

  function isManager() {
    const user = getCurrentUser();
    return user && user.roleId === "quan_ly";
  }

  // ==================== LOAD DATA ====================
  async function loadData() {
    Utils.showLoading(true, "Đang tải...");
    try {
      const token = API.getToken();
      console.log("🔑 Token:", token ? "Có token" : "Không có token");

      // Lấy phiếu xuất chưa có hóa đơn
      console.log("📡 Gọi API: /invoice/exports-without-invoice");
      const noInvoiceRes = await fetch(
        API_BASE_URL + "/invoice/exports-without-invoice",
        { headers: { Authorization: "Bearer " + token } },
      );
      const noInvoiceResult = await noInvoiceRes.json();
      console.log("📦 Kết quả noInvoice:", noInvoiceResult);

      // Lấy yêu cầu hóa đơn
      console.log("📡 Gọi API: /invoice/requests");
      const requestsRes = await fetch(API_BASE_URL + "/invoice/requests", {
        headers: { Authorization: "Bearer " + token },
      });
      const requestsResult = await requestsRes.json();
      console.log("📦 Kết quả requests:", requestsResult);

      let noInvoice = [];
      let requests = [];

      if (noInvoiceResult.success && noInvoiceResult.data) {
        noInvoice = noInvoiceResult.data;
        console.log("✅ Đã lấy được noInvoice:", noInvoice.length, "phiếu");
      } else {
        console.warn("⚠️ API noInvoice trả về lỗi hoặc rỗng");
      }

      if (requestsResult.success && requestsResult.data) {
        requests = requestsResult.data;
        console.log("✅ Đã lấy được requests:", requests.length, "phiếu");
      } else {
        console.warn("⚠️ API requests trả về lỗi hoặc rỗng");
      }

      allData = [];

      noInvoice.forEach((item) => {
        allData.push({ ...item, invoiceStatus: "no-invoice" });
      });

      requests.forEach((item) => {
        allData.push({ ...item, invoiceStatus: item.status });
      });

      console.log("📊 Tổng dữ liệu:", allData.length, "phiếu");

      // Sắp xếp: chưa nhập → chờ duyệt → hoàn thành → từ chối
      allData.sort((a, b) => {
        const order = { "no-invoice": 0, pending: 1, approved: 2, rejected: 3 };
        return (order[a.invoiceStatus] || 99) - (order[b.invoiceStatus] || 99);
      });

      updateStats();
      render();
    } catch (error) {
      console.error("❌ Load error:", error);
      Utils.showToast("Lỗi tải dữ liệu: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ==================== UPDATE STATS ====================
  function updateStats() {
    const noInvoice = allData.filter((d) => d.invoiceStatus === "no-invoice");
    const pending = allData.filter((d) => d.invoiceStatus === "pending");
    const approved = allData.filter((d) => d.invoiceStatus === "approved");
    const rejected = allData.filter((d) => d.invoiceStatus === "rejected");

    console.log("📊 Stats:", {
      noInvoice: noInvoice.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    });

    if (noInvoiceEl) noInvoiceEl.textContent = noInvoice.length;
    if (pendingEl) pendingEl.textContent = pending.length;
    if (approvedEl) approvedEl.textContent = approved.length;
    if (rejectedEl) rejectedEl.textContent = rejected.length;

    const total = pending.length + noInvoice.length;
    if (badge) {
      badge.style.display = total > 0 ? "inline" : "none";
      badge.textContent = total;
    }
  }

  // ==================== TOGGLE FORM ====================
  function toggleForm(exportId) {
    const form = document.getElementById("invoiceForm_" + exportId);
    if (!form) return;

    // Đóng các form khác
    document.querySelectorAll(".invoice-form-container").forEach((el) => {
      if (el.id !== "invoiceForm_" + exportId) {
        el.style.display = "none";
      }
    });

    form.style.display = form.style.display === "none" ? "block" : "none";
  }

  // ==================== SUBMIT INVOICE ====================
  async function submitInvoice(exportId) {
    const soHoaDonNhap = document
      .getElementById("soHoaDonNhap_" + exportId)
      ?.value.trim();
    const ngayNhapHD = document.getElementById("ngayNhapHD_" + exportId)?.value;
    const soHoaDonXuat = document
      .getElementById("soHoaDonXuat_" + exportId)
      ?.value.trim();
    const ngayXuatHD = document.getElementById("ngayXuatHD_" + exportId)?.value;

    // Kiểm tra nhập đủ 4 trường
    if (!soHoaDonNhap || !ngayNhapHD || !soHoaDonXuat || !ngayXuatHD) {
      Utils.showToast("⚠️ Vui lòng nhập đủ 4 trường!", "warning");
      return;
    }

    // Kiểm tra định dạng ngày
    if (ngayNhapHD && !/^\d{4}-\d{2}-\d{2}$/.test(ngayNhapHD)) {
      Utils.showToast("⚠️ Ngày hóa đơn nhập không hợp lệ!", "warning");
      return;
    }

    if (ngayXuatHD && !/^\d{4}-\d{2}-\d{2}$/.test(ngayXuatHD)) {
      Utils.showToast("⚠️ Ngày hóa đơn xuất không hợp lệ!", "warning");
      return;
    }

    Utils.showLoading(true, "Đang gửi yêu cầu...");
    try {
      const token = API.getToken();
      const res = await fetch(API_BASE_URL + "/invoice/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          exportId,
          soHoaDonNhap,
          ngayNhapHD,
          soHoaDonXuat,
          ngayXuatHD,
        }),
      });
      const result = await res.json();

      if (result.success) {
        Utils.showToast("✅ " + result.message);
        // Ẩn form
        const form = document.getElementById("invoiceForm_" + exportId);
        if (form) form.style.display = "none";
        // Tải lại dữ liệu
        await loadData();
      } else {
        Utils.showToast(
          "❌ " + (result.message || "Không thể gửi yêu cầu"),
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Submit invoice error:", error);
      Utils.showToast("❌ Lỗi server: " + error.message, "error");
    } finally {
      Utils.showLoading(false);
    }
  }

  // ==================== RENDER ====================
  function render() {
    if (!container) return;

    const search = searchInput?.value.toLowerCase() || "";
    const status = statusFilter?.value || "all";

    let filtered = [...allData];

    if (status !== "all") {
      filtered = filtered.filter((item) => item.invoiceStatus === status);
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          (item.exportNo || "").toLowerCase().includes(search) ||
          (item.customerName || "").toLowerCase().includes(search) ||
          (item.receiverName || "").toLowerCase().includes(search),
      );
    }

    console.log("📊 Render filtered:", filtered.length, "phiếu");

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-receipts">
          <i class="fas fa-file-invoice" style="font-size:48px;display:block;margin-bottom:16px;opacity:0.4;"></i>
          <p>Không có dữ liệu hóa đơn</p>
          <small>Phiếu xuất đã duyệt sẽ hiển thị tại đây</small>
          <div style="margin-top:16px;padding:12px 20px;background:rgba(59,130,246,0.1);border-radius:8px;border:1px solid rgba(59,130,246,0.2);">
            <p style="color:#6b82a0;font-size:12px;">
              <i class="fas fa-info-circle" style="color:#60a5fa;"></i>
              Để hiển thị nút "Tạo hóa đơn", cần có phiếu xuất đã duyệt (status = 'approved')
            </p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((item) => {
        const isNo = item.invoiceStatus === "no-invoice";
        const isPending = item.invoiceStatus === "pending";
        const isApproved = item.invoiceStatus === "approved";
        const isRejected = item.invoiceStatus === "rejected";

        let color = "#6b82a0";
        let badgeText = "";
        let badgeClass = "";

        if (isNo) {
          color = "#f87171";
          badgeText = "🔴 Chưa nhập";
          badgeClass = "status-pending";
        } else if (isPending) {
          color = "#fbbf24";
          badgeText = "🟡 Chờ duyệt";
          badgeClass = "status-pending";
        } else if (isApproved) {
          color = "#4ade80";
          badgeText = "🟢 Hoàn thành";
          badgeClass = "status-approved";
        } else if (isRejected) {
          color = "#ef4444";
          badgeText = "🔴 Từ chối";
          badgeClass = "status-rejected";
        }

        // Nút hành động - Chỉ Admin mới được tạo hóa đơn
        let actions = "";
        if (isNo && isAdmin()) {
          actions = `
          <button class="btn-create-invoice" onclick="window.toggleInvoiceForm(${item.id})">
            <i class="fas fa-plus-circle"></i> Tạo hóa đơn
          </button>
        `;
        } else if (isNo && !isAdmin()) {
          actions = `<span style="color:#6b82a0;font-size:12px;">Chỉ Admin mới được tạo</span>`;
        } else if (isPending) {
          actions = `<span style="color:#fbbf24;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Đang chờ</span>`;
        } else if (isApproved) {
          actions = `<span style="color:#4ade80;font-size:12px;"><i class="fas fa-check-circle"></i> Hoàn thành</span>`;
        } else if (isRejected) {
          actions = `<span style="color:#f87171;font-size:12px;"><i class="fas fa-times-circle"></i> Từ chối</span>`;
        }

        // Form nhập 4 trường (chỉ hiện khi chưa có và là Admin)
        let formHtml = "";
        if (isNo && isAdmin()) {
          formHtml = `
          <div class="invoice-form-container" id="invoiceForm_${item.id}" style="display:none;">
            <div class="invoice-form-grid">
              <div class="invoice-form-group">
                <label><span class="required">*</span> Số hóa đơn nhập</label>
                <input type="text" id="soHoaDonNhap_${item.id}" placeholder="VD: HD001/2026">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Ngày hóa đơn nhập</label>
                <input type="date" id="ngayNhapHD_${item.id}">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Số hóa đơn xuất</label>
                <input type="text" id="soHoaDonXuat_${item.id}" placeholder="VD: HDX001/2026">
              </div>
              <div class="invoice-form-group">
                <label><span class="required">*</span> Ngày hóa đơn xuất</label>
                <input type="date" id="ngayXuatHD_${item.id}">
              </div>
            </div>
            <div class="invoice-form-actions">
              <button class="btn-cancel-invoice" onclick="window.toggleInvoiceForm(${item.id})">
                <i class="fas fa-times"></i> Hủy
              </button>
              <button class="btn-submit-invoice" onclick="window.submitInvoice(${item.id})">
                <i class="fas fa-paper-plane"></i> Gửi duyệt
              </button>
            </div>
            <div class="invoice-form-note">
              <p><i class="fas fa-exclamation-triangle"></i> Sau khi gửi, Quản lý sẽ duyệt và lưu vào tồn kho.</p>
            </div>
          </div>
        `;
        }

        // Thông tin hóa đơn (nếu đã có)
        let infoHtml = "";
        if (isPending || isApproved || isRejected) {
          infoHtml = `
          <div class="invoice-info">
            <div><span class="label">Số HĐ nhập:</span> <span class="value highlight">${Utils.escapeHtml(
              item.soHoaDonNhap || "—",
            )}</span></div>
            <div><span class="label">Ngày HĐ nhập:</span> <span class="value">${Utils.formatDate(
              item.ngayNhapHD,
            )}</span></div>
            <div><span class="label">Số HĐ xuất:</span> <span class="value highlight">${Utils.escapeHtml(
              item.soHoaDonXuat || "—",
            )}</span></div>
            <div><span class="label">Ngày HĐ xuất:</span> <span class="value">${Utils.formatDate(
              item.ngayXuatHD,
            )}</span></div>
          </div>
        `;
        }

        return `
        <div class="receipt-card invoice-card" style="border-left:4px solid ${color};">
          <div class="receipt-card-header">
            <div class="receipt-card-id">
              <i class="fas fa-file-export"></i> ${Utils.escapeHtml(
                item.exportNo || "PX-" + item.id,
              )}
            </div>
            <div class="receipt-card-date">
              <i class="far fa-calendar-alt"></i> ${Utils.formatDate(
                item.exportDate || item.createdAt,
              )}
            </div>
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="receipt-card-body">
            <div class="receipt-card-info">
              <div class="label">Khách hàng</div>
              <div class="value">${Utils.escapeHtml(
                item.customerName || item.receiverName || "—",
              )}</div>
            </div>
            <div class="receipt-card-info">
              <div class="label">Người nhận</div>
              <div class="value">${Utils.escapeHtml(
                item.receiverName || "—",
              )}</div>
            </div>
            <div class="receipt-card-total">
              <div class="label">Tổng tiền</div>
              <div class="value">${Utils.formatCurrency(item.total || 0)}</div>
            </div>
          </div>
          <div class="receipt-card-footer">
            <div class="status-text">
              ${isNo ? "🔴 Chưa có thông tin hóa đơn" : ""}
              ${isPending ? "🟡 Đã nhập, chờ duyệt" : ""}
              ${isApproved ? "🟢 Đã có đầy đủ thông tin" : ""}
              ${isRejected ? "🔴 Bị từ chối" : ""}
            </div>
            <div class="actions">${actions}</div>
          </div>
          ${infoHtml}
          ${formHtml}
        </div>
      `;
      })
      .join("");
  }

  // ==================== BIND EVENTS ====================
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener("input", render);
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", render);
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadData);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        render();
      });
    }
  }

  // ==================== EXPOSE ====================
  window.loadInvoiceData = loadData;
  window.toggleInvoiceForm = toggleForm;
  window.submitInvoice = submitInvoice;
  window.isAdmin = isAdmin;
  window.isManager = isManager;

  // ==================== INIT ====================
  function init() {
    console.log("🚀 Invoices module initialized");
    loadData();
    bindEvents();
  }

  // Đợi DOM load xong rồi mới init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
